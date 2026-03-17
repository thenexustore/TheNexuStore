export type CategoryTaxonomyRow = {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  sort_order: number;
};

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
  rows: CategoryTaxonomyRow[],
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
