import { PrismaClient } from '@prisma/client';
import { writeFile } from 'fs/promises';
import {
  buildCategoryLevel2Descriptor,
  resolveCanonicalParentSlug,
} from '../src/user/categories/category-taxonomy.util';
import {
  MENU_PARENT_TAXONOMY,
  getParentCategorySortOrder,
  recommendParentCategory,
  slugifyCategory,
} from '../src/infortisa/infortisa-category-mapping.util';

const prisma = new PrismaClient();

function printHelp() {
  console.log(`Usage:
  ts-node scripts/backfill-category-level2-parents.ts [--apply] [--json] [--output <file>]
  ts-node scripts/backfill-category-level2-parents.ts [--apply] [--json]

Options:
  --apply    Persist changes. Without this flag the script runs in dry-run mode.
  --json     Emit a machine-readable audit report with the affected categories.
  --output   Write the JSON audit payload to a file.
  --help     Show this help message.
`);
}

type AuditRow = {
  category_id: string;
  category_name: string;
  category_slug: string;
  current_parent_slug: string | null;
  target_abuelo_slug: string;
  target_padre_slug: string;
  target_padre_name: string;
  action: 'reparent' | 'create_level2_and_reparent';
};

async function ensureCanonicalParent(canonicalSlug: string) {
  const taxonomyEntry = MENU_PARENT_TAXONOMY.find(
    (entry) => slugifyCategory(entry.key) === canonicalSlug,
  );

  if (!taxonomyEntry) {
    throw new Error(
      `[backfill-category-level2-parents] unknown canonical slug: ${canonicalSlug}`,
    );
  }

  return prisma.category.upsert({
    where: { slug: canonicalSlug },
    update: {
      name: taxonomyEntry.label,
      is_active: true,
      sort_order: getParentCategorySortOrder(taxonomyEntry.label),
    },
    create: {
      name: taxonomyEntry.label,
      slug: canonicalSlug,
      is_active: true,
      sort_order: getParentCategorySortOrder(taxonomyEntry.label),
    },
  });
}

async function main() {
  const rawArgs = process.argv.slice(2);
  const args = new Set(rawArgs);
  const args = new Set(process.argv.slice(2));
  if (args.has('--help')) {
    printHelp();
    return;
  }

  const apply = args.has('--apply');
  const json = args.has('--json');
  const outputArgIndex = rawArgs.findIndex((arg) => arg === '--output');
  const outputEqualsArg = rawArgs.find((arg) => arg.startsWith('--output='));
  const outputPath =
    (outputArgIndex >= 0 ? rawArgs[outputArgIndex + 1] : undefined) ??
    outputEqualsArg?.slice('--output='.length);
  if ((outputArgIndex >= 0 || outputEqualsArg) && !outputPath) {
    throw new Error(
      '[backfill-category-level2-parents] --output requires a file path',
    );
  }
  const categories = await prisma.category.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      parent_id: true,
      sort_order: true,
      is_active: true,
      parent: {
        select: {
          id: true,
          slug: true,
          parent_id: true,
        },
      },
    },
    orderBy: [{ sort_order: 'asc' }, { name: 'asc' }],
  });

  let scanned = 0;
  let candidates = 0;
  let createdLevel2 = 0;
  let updated = 0;
  let alreadyCompliant = 0;
  const auditRows: AuditRow[] = [];

  for (const category of categories) {
    scanned += 1;

    const isCanonicalParent = Boolean(resolveCanonicalParentSlug(category.slug));
    const isLevel2Parent = category.slug.includes('-familia-');
    if (isCanonicalParent || isLevel2Parent) {
      alreadyCompliant += 1;
      continue;
    }

    const parentSlug = category.parent?.slug ?? null;
    const parentCanonicalSlug = parentSlug
      ? resolveCanonicalParentSlug(parentSlug)
      : null;
    const parentIsLevel2 =
      Boolean(parentSlug?.includes('-familia-')) &&
      Boolean(category.parent?.parent_id);

    if (parentIsLevel2) {
      alreadyCompliant += 1;
      continue;
    }

    const recommendedParent = recommendParentCategory(
      null,
      category.slug.replace(/-/g, ' '),
    );
    const canonicalSlug =
      parentCanonicalSlug ?? resolveCanonicalParentSlug(recommendedParent.key);

    if (!canonicalSlug) {
      continue;
    }

    const shouldBackfill =
      !category.parent_id || !category.parent || Boolean(parentCanonicalSlug);

    if (!shouldBackfill) {
      alreadyCompliant += 1;
      continue;
    }

    candidates += 1;

    const canonicalParent = apply
      ? await ensureCanonicalParent(canonicalSlug)
      : {
          id: `preview:${canonicalSlug}`,
          slug: canonicalSlug,
          sort_order: getParentCategorySortOrder(recommendedParent.label),
        };

    const level2Descriptor = buildCategoryLevel2Descriptor(canonicalSlug, {
      name: category.name,
      slug: category.slug,
      subfamilyName: category.name,
    });

    const existingLevel2 = await prisma.category.findUnique({
      where: { slug: level2Descriptor.slug },
      select: { id: true, parent_id: true },
    });

    if (!existingLevel2) {
      createdLevel2 += 1;
      if (apply) {
        await prisma.category.create({
          data: {
            parent_id: canonicalParent.id,
            name: level2Descriptor.name,
            slug: level2Descriptor.slug,
            sort_order:
              canonicalParent.sort_order * 100 + level2Descriptor.sort_order,
            is_active: true,
          },
        });
      }
    }

    const targetLevel2Id =
      existingLevel2?.id ?? `preview:${level2Descriptor.slug}`;

    auditRows.push({
      category_id: category.id,
      category_name: category.name,
      category_slug: category.slug,
      current_parent_slug: parentSlug,
      target_abuelo_slug: canonicalSlug,
      target_padre_slug: level2Descriptor.slug,
      target_padre_name: level2Descriptor.name,
      action: existingLevel2 ? 'reparent' : 'create_level2_and_reparent',
    });

    if (category.parent_id === targetLevel2Id) {
      alreadyCompliant += 1;
      continue;
    }

    updated += 1;
    if (apply) {
      const persistedLevel2 = await prisma.category.findUnique({
        where: { slug: level2Descriptor.slug },
        select: { id: true },
      });

      if (!persistedLevel2) {
        throw new Error(
          `[backfill-category-level2-parents] missing persisted level-2 category for slug=${level2Descriptor.slug}`,
        );
      }

      await prisma.category.update({
        where: { id: category.id },
        data: {
          parent_id: persistedLevel2.id,
        },
      });
    }
  }

  console.log(
    `[backfill-category-level2-parents] mode=${apply ? 'apply' : 'dry-run'} scanned=${scanned} candidates=${candidates} created_level2=${createdLevel2} reparented=${updated} already_compliant=${alreadyCompliant}`,
  );

  const auditPayload = {
    summary: {
      mode: apply ? 'apply' : 'dry-run',
      scanned,
      candidates,
      created_level2: createdLevel2,
      reparented: updated,
      already_compliant: alreadyCompliant,
    },
    affected_categories: auditRows,
  };

  if (outputPath) {
    await writeFile(outputPath, JSON.stringify(auditPayload, null, 2));
    console.log(
      `[backfill-category-level2-parents] audit report written to ${outputPath}`,
    );
  }

  if (json) {
    console.log(JSON.stringify(auditPayload, null, 2));
  if (json) {
    console.log(
      JSON.stringify(
        {
          summary: {
            mode: apply ? 'apply' : 'dry-run',
            scanned,
            candidates,
            created_level2: createdLevel2,
            reparented: updated,
            already_compliant: alreadyCompliant,
          },
          affected_categories: auditRows,
        },
        null,
        2,
      ),
    );
    return;
  }

  if (auditRows.length > 0) {
    console.log('[backfill-category-level2-parents] affected categories preview:');
    for (const row of auditRows.slice(0, 25)) {
      console.log(
        `- ${row.category_slug} (${row.category_name}): ${row.current_parent_slug ?? 'sin-padre'} -> ${row.target_padre_slug} [abuelo=${row.target_abuelo_slug}]`,
      );
    }

    if (auditRows.length > 25) {
      console.log(
        `[backfill-category-level2-parents] ... ${auditRows.length - 25} additional categories omitted from preview`,
      );
    }
  }
}

main()
  .catch((error) => {
    console.error('[backfill-category-level2-parents] failed', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
