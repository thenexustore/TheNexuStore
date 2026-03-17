import { fetchWithAuth } from "../utils";

export interface Category {
  id: string;
  name: string;
  slug: string;
  parent_id?: string;
  sort_order: number;
  is_active: boolean;
}

export interface CategoryTreeNode extends Category {
  depth: number;
  children: CategoryTreeNode[];
}

export async function fetchCategories(): Promise<Category[]> {
  return fetchWithAuth("/admin/categories");
}

export function buildCanonicalCategoryTree(categories: Category[], maxDepth: number = 3): CategoryTreeNode[] {
  const byId = new Map(categories.map((category) => [category.id, category]));
  const sort = (a: Category, b: Category) =>
    a.sort_order - b.sort_order || a.name.localeCompare(b.name, "es", { sensitivity: "base" });

  const childrenByParent = new Map<string, Category[]>();
  for (const category of categories) {
    if (!category.parent_id || !byId.has(category.parent_id)) continue;
    if (!childrenByParent.has(category.parent_id)) childrenByParent.set(category.parent_id, []);
    childrenByParent.get(category.parent_id)?.push(category);
  }

  for (const [parentId, children] of childrenByParent) {
    childrenByParent.set(parentId, [...children].sort(sort));
  }

  const roots = [...categories].filter((item) => !item.parent_id || !byId.has(item.parent_id)).sort(sort);

  const build = (category: Category, depth: number, visited: Set<string>): CategoryTreeNode | null => {
    if (visited.has(category.id)) return null;
    const nextVisited = new Set(visited);
    nextVisited.add(category.id);

    return {
      ...category,
      depth,
      children:
        depth >= maxDepth
          ? []
          : (childrenByParent.get(category.id) ?? [])
              .map((child) => build(child, depth + 1, nextVisited))
              .filter((item): item is CategoryTreeNode => item !== null),
    };
  };

  return roots
    .map((category) => build(category, 1, new Set<string>()))
    .filter((item): item is CategoryTreeNode => item !== null);
}

export async function createCategory(data: {
  name: string;
  parent_id?: string;
  sort_order?: number;
}): Promise<Category> {
  const response = await fetchWithAuth("/admin/categories", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return response;
}
