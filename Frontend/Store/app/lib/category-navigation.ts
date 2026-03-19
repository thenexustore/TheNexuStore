import { CategoryTreeNode } from "./products";

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

function mergeCategoryNodes(
  target: CategoryTreeNode,
  source: CategoryTreeNode,
): CategoryTreeNode {
  return {
    ...target,
    children: normalizeCategoryTree([...target.children, ...source.children]),
  };
}

function collapseRedundantChild(node: CategoryTreeNode): CategoryTreeNode {
  if (node.children.length !== 1) return node;

  const child = node.children[0];
  if (normalize(child.name) !== normalize(node.name)) return node;

  return {
    ...node,
    id: child.id,
    slug: child.slug,
    path: child.path ?? node.path,
    ancestry: child.ancestry ?? node.ancestry,
    sort_order: child.sort_order ?? node.sort_order,
    children: child.children,
  };
}

function sanitizeSiblingNodes(
  nodes: CategoryTreeNode[],
  parent?: Pick<CategoryTreeNode, "name" | "slug">,
): CategoryTreeNode[] {
  const deduped = new Map<string, CategoryTreeNode>();
  const liftedChildren: CategoryTreeNode[] = [];

  for (const node of nodes) {
    const sanitizedNode = collapseRedundantChild({
      ...node,
      children: sanitizeSiblingNodes(node.children, node),
    });

    const isParentAlias =
      parent &&
      (sanitizedNode.slug === parent.slug ||
        normalize(sanitizedNode.name) === normalize(parent.name));

    if (isParentAlias) {
      liftedChildren.push(...sanitizedNode.children);
      continue;
    }

    const dedupeKey = normalize(sanitizedNode.name);
    const existing = deduped.get(dedupeKey);

    if (!existing) {
      deduped.set(dedupeKey, sanitizedNode);
      continue;
    }

    deduped.set(dedupeKey, mergeCategoryNodes(existing, sanitizedNode));
  }

  const combined = [...deduped.values(), ...liftedChildren];
  return [...combined].sort(
    (a, b) =>
      (a.sort_order ?? Number.MAX_SAFE_INTEGER) -
        (b.sort_order ?? Number.MAX_SAFE_INTEGER) ||
      normalize(a.name).localeCompare(normalize(b.name)),
  );
}

export function normalizeCategoryTree(tree: CategoryTreeNode[]): CategoryTreeNode[] {
  return sanitizeSiblingNodes(tree);
}

export function resolveCategoryScopeSlug(category: Pick<CategoryTreeNode, "slug">): string {
  return category.slug;
}
