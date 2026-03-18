import {
  DEFAULT_PARENT_CATEGORY,
  MENU_PARENT_TAXONOMY,
  recommendParentCategory,
  slugifyCategory,
} from '../../infortisa/infortisa-category-mapping.util';

export type CategoryTaxonomyRow = {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  sort_order: number;
};

export type CategoryTaxonomyLinkRow = Pick<
  CategoryTaxonomyRow,
  'id' | 'parent_id'
>;

export type CategoryTaxonomyNode = {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  sort_order: number;
  depth: number;
  ancestry: Array<{ id: string; slug: string; name: string }>;
  path: string;
  children: CategoryTaxonomyNode[];
};

function resolveCanonicalParentSlug(slug: string): string | null {
  const normalized = slugifyCategory(slug);
  const match = MENU_PARENT_TAXONOMY.find((category) => {
    return (
      slugifyCategory(category.key) === normalized ||
      slugifyCategory(category.label) === normalized
    );
  });

  return match ? slugifyCategory(match.key) : null;
}

export function normalizeCategoryTaxonomyRows(
  rows: CategoryTaxonomyRow[],
): CategoryTaxonomyRow[] {
  const clonedRows = rows.map((row) => ({ ...row }));
  const rowIds = new Set(clonedRows.map((row) => row.id));
  const parentIdByCanonicalSlug = new Map<string, string>();
  const aliasRowIds = new Set<string>();
  const aliasTargets = new Map<string, string>();

  for (const category of MENU_PARENT_TAXONOMY) {
    const canonicalSlug = slugifyCategory(category.key);
    const matches = clonedRows.filter(
      (row) => resolveCanonicalParentSlug(row.slug) === canonicalSlug,
    );

    if (matches.length === 0) continue;

    const anchor =
      matches.find((row) => slugifyCategory(row.slug) === canonicalSlug) ??
      matches.sort((a, b) => a.sort_order - b.sort_order)[0];

    anchor.parent_id = null;
    parentIdByCanonicalSlug.set(canonicalSlug, anchor.id);

    for (const match of matches) {
      if (match.id === anchor.id) continue;
      aliasRowIds.add(match.id);
      aliasTargets.set(match.id, anchor.id);
    }
  }

  for (const row of clonedRows) {
    if (row.parent_id && aliasTargets.has(row.parent_id)) {
      row.parent_id = aliasTargets.get(row.parent_id)!;
    }
  }

  for (const row of clonedRows) {
    if (aliasRowIds.has(row.id)) continue;

    const canonicalSlug = resolveCanonicalParentSlug(row.slug);
    if (!canonicalSlug) continue;
  }

  const syntheticParents = MENU_PARENT_TAXONOMY.filter(
    (category) => !parentIdByCanonicalSlug.has(slugifyCategory(category.key)),
  ).map((category) => {
    const canonicalSlug = slugifyCategory(category.key);
    const syntheticId = `virtual:${canonicalSlug}`;
    parentIdByCanonicalSlug.set(canonicalSlug, syntheticId);

    return {
      id: syntheticId,
      name: category.label,
      slug: canonicalSlug,
      parent_id: null,
      sort_order: category.sortOrder,
    } satisfies CategoryTaxonomyRow;
  });

  const normalizedRows = [
    ...syntheticParents,
    ...clonedRows.filter((row) => !aliasRowIds.has(row.id)),
  ];

  for (const row of normalizedRows) {
    const canonicalSlug = resolveCanonicalParentSlug(row.slug);
    if (canonicalSlug) continue;

    const hasVisibleParent = row.parent_id && rowIds.has(row.parent_id);
    if (hasVisibleParent) continue;

    const recommendedParent = recommendParentCategory(
      null,
      row.slug.replace(/-/g, ' '),
    );
    const recommendedSlug =
      resolveCanonicalParentSlug(recommendedParent.key) ??
      slugifyCategory(DEFAULT_PARENT_CATEGORY.key);

    row.parent_id = parentIdByCanonicalSlug.get(recommendedSlug) ?? null;
  }

  return normalizedRows;
}

function compareRows(a: CategoryTaxonomyRow, b: CategoryTaxonomyRow) {
  return (
    a.sort_order - b.sort_order ||
    a.name.localeCompare(b.name, 'es', { sensitivity: 'base' })
  );
}

export function sortCategoryRows(
  rows: CategoryTaxonomyRow[],
): CategoryTaxonomyRow[] {
  return [...rows].sort(compareRows);
}

export function buildCategoryTaxonomyTree(
  rows: CategoryTaxonomyRow[],
  maxDepth: number,
) {
  const byId = new Map(rows.map((row) => [row.id, row]));
  const childrenByParent = new Map<string, CategoryTaxonomyRow[]>();

  for (const row of rows) {
    if (!row.parent_id || !byId.has(row.parent_id)) continue;
    if (!childrenByParent.has(row.parent_id))
      childrenByParent.set(row.parent_id, []);
    childrenByParent.get(row.parent_id)!.push(row);
  }

  for (const [parentId, children] of childrenByParent) {
    childrenByParent.set(parentId, sortCategoryRows(children));
  }

  const roots = sortCategoryRows(
    rows.filter((row) => !row.parent_id || !byId.has(row.parent_id)),
  );

  const buildNode = (
    row: CategoryTaxonomyRow,
    depth: number,
    trail: Array<{ id: string; slug: string; name: string }>,
    visited: Set<string>,
  ): CategoryTaxonomyNode | null => {
    if (visited.has(row.id)) {
      return null;
    }

    const nextVisited = new Set(visited);
    nextVisited.add(row.id);

    const ancestry = [...trail, { id: row.id, slug: row.slug, name: row.name }];
    const children =
      depth >= maxDepth
        ? []
        : (childrenByParent.get(row.id) ?? [])
            .map((child) => buildNode(child, depth + 1, ancestry, nextVisited))
            .filter((item): item is CategoryTaxonomyNode => item !== null);

    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      parent_id: row.parent_id,
      sort_order: row.sort_order,
      depth,
      ancestry,
      path: ancestry.map((item) => item.name).join(' > '),
      children,
    };
  };

  return roots
    .map((row) => buildNode(row, 1, [], new Set<string>()))
    .filter((item): item is CategoryTaxonomyNode => item !== null);
}

export function getDescendantIds(
  rootId: string,
  rows: CategoryTaxonomyLinkRow[],
): string[] {
  const childrenByParent = new Map<string, string[]>();
  for (const row of rows) {
    if (!row.parent_id) continue;
    if (!childrenByParent.has(row.parent_id))
      childrenByParent.set(row.parent_id, []);
    childrenByParent.get(row.parent_id)!.push(row.id);
  }

  const queue = [rootId];
  const visited = new Set<string>();
  const result: string[] = [];

  while (queue.length) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);
    result.push(current);

    for (const childId of childrenByParent.get(current) ?? []) {
      if (!visited.has(childId)) queue.push(childId);
    }
  }

  return result;
}
