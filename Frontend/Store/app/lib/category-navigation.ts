import { CategoryTreeNode } from "./products";

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

export function normalizeCategoryTree(tree: CategoryTreeNode[]): CategoryTreeNode[] {
  return [...tree].sort(
    (a, b) =>
      (a.sort_order ?? Number.MAX_SAFE_INTEGER) - (b.sort_order ?? Number.MAX_SAFE_INTEGER) ||
      normalize(a.name).localeCompare(normalize(b.name)),
  );
}

export function resolveCategoryScopeSlug(category: Pick<CategoryTreeNode, "slug">): string {
  return category.slug;
}
