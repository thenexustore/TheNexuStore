import { readFile } from 'fs/promises';

type CountRow = { key: string; count: number };

type BackfillAuditRow = {
  category_id: string;
  category_name: string;
  category_slug: string;
  current_parent_slug: string | null;
  target_abuelo_slug: string;
  target_padre_slug: string;
  target_padre_name: string;
  action: 'reparent' | 'create_level2_and_reparent';
};

type AdminMismatchRow = {
  id: string;
  name: string;
  slug: string;
  current_parent_slug: string | null;
  expected_parent_slug: string;
  expected_parent_name: string;
  product_count: number;
};

type NormalizedAudit = {
  source: 'backfill' | 'admin-taxonomy-status';
  rows: Array<{
    id: string;
    name: string;
    slug: string;
    current_parent_slug: string | null;
    target_parent_slug: string;
    target_parent_name: string;
    target_grandparent_slug: string | null;
    action: string;
  }>;
  summaryByTargetParent: CountRow[];
  summaryByCurrentParent: CountRow[];
};

function printHelp() {
  console.log(`Usage:
  ts-node scripts/analyze-taxonomy-audit-report.ts --input <file>

Accepted inputs:
  - JSON from categories:backfill-level2 -- --json
  - JSON from /admin/categories/taxonomy-status (with or without { success, data } wrapper)

What it outputs:
  - nivel 2 a revisar/dividir primero
  - categorías nivel 3 mal colocadas
  - bloques seguros de recolocación por padre actual -> padre objetivo
`);
}

function countBy(values: Array<string | null | undefined>): CountRow[] {
  return Array.from(
    values.reduce((acc, value) => {
      const key = value ?? 'null';
      acc.set(key, (acc.get(key) ?? 0) + 1);
      return acc;
    }, new Map<string, number>()),
  )
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
}

function takeSample<T>(items: T[], limit = 5): T[] {
  return items.slice(0, limit);
}

function inferGrandparentFromParentSlug(parentSlug: string): string | null {
  if (!parentSlug.includes('-familia-')) return null;
  return parentSlug.split('-familia-')[0] || null;
}

function normalizeAuditPayload(payload: any): NormalizedAudit {
  const unwrapped = payload?.data && payload?.success ? payload.data : payload;

  if (Array.isArray(unwrapped?.affected_categories)) {
    const rows = (unwrapped.affected_categories as BackfillAuditRow[]).map(
      (row) => ({
        id: row.category_id,
        name: row.category_name,
        slug: row.category_slug,
        current_parent_slug: row.current_parent_slug,
        target_parent_slug: row.target_padre_slug,
        target_parent_name: row.target_padre_name,
        target_grandparent_slug: row.target_abuelo_slug,
        action: row.action,
      }),
    );

    return {
      source: 'backfill',
      rows,
      summaryByTargetParent:
        unwrapped.summary_by_target_padre ??
        countBy(rows.map((row) => row.target_parent_slug)),
      summaryByCurrentParent:
        unwrapped.summary_by_current_parent ??
        countBy(rows.map((row) => row.current_parent_slug)),
    };
  }

  if (Array.isArray(unwrapped?.mismatched_level2_parenting)) {
    const rows = (unwrapped.mismatched_level2_parenting as AdminMismatchRow[]).map(
      (row) => ({
        id: row.id,
        name: row.name,
        slug: row.slug,
        current_parent_slug: row.current_parent_slug,
        target_parent_slug: row.expected_parent_slug,
        target_parent_name: row.expected_parent_name,
        target_grandparent_slug: inferGrandparentFromParentSlug(
          row.expected_parent_slug,
        ),
        action: 'audit_only',
      }),
    );

    return {
      source: 'admin-taxonomy-status',
      rows,
      summaryByTargetParent:
        unwrapped.mismatched_summary_by_expected_parent ??
        countBy(rows.map((row) => row.target_parent_slug)),
      summaryByCurrentParent:
        unwrapped.mismatched_summary_by_current_parent ??
        countBy(rows.map((row) => row.current_parent_slug)),
    };
  }

  throw new Error(
    'Unsupported audit payload. Expected affected_categories or mismatched_level2_parenting.',
  );
}

async function main() {
  const rawArgs = process.argv.slice(2);
  const inputIndex = rawArgs.findIndex((arg) => arg === '--input');
  const inputPath =
    (inputIndex >= 0 ? rawArgs[inputIndex + 1] : undefined) ??
    rawArgs.find((arg) => arg.startsWith('--input='))?.slice('--input='.length);

  if (rawArgs.includes('--help') || !inputPath) {
    printHelp();
    if (!inputPath && !rawArgs.includes('--help')) {
      process.exitCode = 1;
    }
    return;
  }

  const parsed = JSON.parse(await readFile(inputPath, 'utf8'));
  const audit = normalizeAuditPayload(parsed);

  const rowsByMove = new Map<string, typeof audit.rows>();
  for (const row of audit.rows) {
    const key = `${row.current_parent_slug ?? 'sin-padre'} -> ${row.target_parent_slug}`;
    const bucket = rowsByMove.get(key) ?? [];
    bucket.push(row);
    rowsByMove.set(key, bucket);
  }

  const moveBlocks = Array.from(rowsByMove.entries())
    .map(([move, rows]) => ({
      move,
      count: rows.length,
      rows,
    }))
    .sort((a, b) => b.count - a.count || a.move.localeCompare(b.move));

  const targetOtherCategories = audit.rows.filter((row) =>
    row.target_parent_slug.includes('-familia-otras-categorias'),
  );

  console.log(`# Taxonomy audit analysis (${audit.source})`);
  console.log('');
  console.log('## Nivel 2 a revisar/dividir primero');
  for (const row of takeSample(audit.summaryByTargetParent, 10)) {
    console.log(`- ${row.key}: ${row.count} categorías candidatas`);
  }

  if (targetOtherCategories.length > 0) {
    console.log('');
    console.log('### Atención especial: ramas que siguen cayendo en "Otras categorías"');
    for (const row of takeSample(targetOtherCategories, 10)) {
      console.log(
        `- ${row.slug} (${row.name}) -> ${row.target_parent_slug} [actual=${row.current_parent_slug ?? 'sin-padre'}]`,
      );
    }
  }

  console.log('');
  console.log('## Categorías nivel 3 mal colocadas (muestra)');
  for (const row of takeSample(audit.rows, 15)) {
    console.log(
      `- ${row.slug} (${row.name}): ${row.current_parent_slug ?? 'sin-padre'} -> ${row.target_parent_slug}`,
    );
  }

  console.log('');
  console.log('## Bloques seguros para recolocar');
  for (const block of takeSample(moveBlocks.filter((item) => item.count >= 2), 10)) {
    const sample = takeSample(block.rows.map((row) => row.slug), 5).join(', ');
    console.log(`- ${block.move}: ${block.count} categorías [ej.: ${sample}]`);
  }

  console.log('');
  console.log('## Padres actuales con más fricción');
  for (const row of takeSample(audit.summaryByCurrentParent, 10)) {
    console.log(`- ${row.key}: ${row.count} categorías a revisar`);
  }
}

main().catch((error) => {
  console.error('[analyze-taxonomy-audit-report] failed', error);
  process.exitCode = 1;
});
