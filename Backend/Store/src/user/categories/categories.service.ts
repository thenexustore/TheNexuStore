import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  sort_order: number;
};

type CategoryTreeNode = {
  id: string;
  name: string;
  slug: string;
  depth: number;
  children: CategoryTreeNode[];
};

type TreeQuery = {
  locale?: string;
  maxDepth?: string;
  includeEmpty?: string;
  includeCounts?: string;
};

@Injectable()
export class CategoriesService {
  private readonly logger = new Logger(CategoriesService.name);
  private readonly cacheTtlMs = 5 * 60 * 1000;
  private readonly treeCache = new Map<
    string,
    { expiresAt: number; value: { items: CategoryTreeNode[]; meta: any } }
  >();

  constructor(private readonly prisma: PrismaService) {}

  invalidateTreeCache() {
    this.treeCache.clear();
  }

  private getCacheKey({ locale, maxDepth, includeEmpty, includeCounts }: Required<TreeQuery>) {
    return `categories:tree:${locale}:d${maxDepth}:empty${includeEmpty}:counts${includeCounts}`;
  }

  private normalizeMaxDepth(raw?: string): number {
    const parsed = Number.parseInt(raw ?? '3', 10);
    if (!Number.isFinite(parsed) || parsed < 1) return 3;
    return Math.min(parsed, 5);
  }

  private parseBoolean(raw: string | undefined, defaultValue: boolean) {
    if (raw === undefined) return defaultValue;
    return raw === 'true' || raw === '1';
  }

  private async getVisibleCategories() {
    return this.prisma.category.findMany({
      where: { is_active: true },
      select: {
        id: true,
        name: true,
        slug: true,
        parent_id: true,
        sort_order: true,
      },
      orderBy: [{ sort_order: 'asc' }, { name: 'asc' }],
    });
  }

  private sortRows(rows: CategoryRow[]) {
    return [...rows].sort(
      (a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name),
    );
  }

  private buildTree(rows: CategoryRow[], maxDepth: number) {
    const byId = new Map(rows.map((row) => [row.id, row]));
    const childrenByParent = new Map<string, CategoryRow[]>();

    for (const row of rows) {
      if (!row.parent_id || !byId.has(row.parent_id)) continue;
      if (!childrenByParent.has(row.parent_id)) childrenByParent.set(row.parent_id, []);
      childrenByParent.get(row.parent_id)!.push(row);
    }

    for (const [parentId, children] of childrenByParent) {
      childrenByParent.set(parentId, this.sortRows(children));
    }

    const roots = this.sortRows(
      rows.filter((row) => !row.parent_id || !byId.has(row.parent_id)),
    );

    const buildNode = (
      row: CategoryRow,
      depth: number,
      path: Set<string>,
    ): CategoryTreeNode | null => {
      if (path.has(row.id)) {
        this.logger.warn(`Cycle detected in categories tree at node ${row.id}`);
        return null;
      }

      const nextPath = new Set(path);
      nextPath.add(row.id);

      const children = depth >= maxDepth
        ? []
        : (childrenByParent.get(row.id) ?? [])
            .map((child) => buildNode(child, depth + 1, nextPath))
            .filter((item): item is CategoryTreeNode => item !== null);

      return {
        id: row.id,
        name: row.name,
        slug: row.slug,
        depth,
        children,
      };
    };

    return roots
      .map((root) => buildNode(root, 1, new Set<string>()))
      .filter((item): item is CategoryTreeNode => item !== null);
  }

  async getCategoryTree(query: TreeQuery) {
    const normalized: Required<TreeQuery> = {
      locale: query.locale ?? 'default',
      maxDepth: String(this.normalizeMaxDepth(query.maxDepth)),
      includeEmpty: String(this.parseBoolean(query.includeEmpty, true)),
      includeCounts: String(this.parseBoolean(query.includeCounts, false)),
    };
    const cacheKey = this.getCacheKey(normalized);
    const cached = this.treeCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    const maxDepth = Number.parseInt(normalized.maxDepth, 10);
    const rows = await this.getVisibleCategories();
    const items = this.buildTree(rows, maxDepth);

    const value = {
      items,
      meta: {
        maxDepth,
        locale: normalized.locale,
        includeEmpty: normalized.includeEmpty === 'true',
        includeCounts: normalized.includeCounts === 'true',
      },
    };

    this.treeCache.set(cacheKey, { value, expiresAt: Date.now() + this.cacheTtlMs });
    return value;
  }

  async searchCategories({ query, locale, maxDepth }: { query?: string; locale?: string; maxDepth?: string }) {
    const q = (query ?? '').trim().toLowerCase();
    if (!q) return [];

    const depthLimit = this.normalizeMaxDepth(maxDepth);
    const rows = await this.getVisibleCategories();
    const byId = new Map(rows.map((row) => [row.id, row]));

    const buildAncestors = (row: CategoryRow) => {
      const chain: CategoryRow[] = [row];
      const visited = new Set<string>([row.id]);
      let cursor = row;

      while (cursor.parent_id && byId.has(cursor.parent_id)) {
        const parent = byId.get(cursor.parent_id)!;
        if (visited.has(parent.id)) {
          this.logger.warn(`Cycle detected while resolving category search path for ${row.id}`);
          break;
        }
        chain.unshift(parent);
        visited.add(parent.id);
        cursor = parent;
      }

      return chain;
    };

    return rows
      .filter((row) => row.name.toLowerCase().includes(q) || row.slug.toLowerCase().includes(q))
      .map((row) => {
        const chain = buildAncestors(row);
        const clipped = chain.slice(0, depthLimit);
        return {
          id: row.id,
          name: row.name,
          slug: row.slug,
          depth: chain.length,
          path: chain.map((item) => item.name).join(' > '),
          parentIds: chain.slice(0, -1).map((item) => item.id),
          ancestors: clipped.slice(0, -1).map((item) => ({
            id: item.id,
            name: item.name,
            slug: item.slug,
          })),
        };
      })
      .sort((a, b) => a.path.localeCompare(b.path));
  }

  async getLegacyMenuTree() {
    const tree = await this.getCategoryTree({ maxDepth: '2' });
    const groups = tree.items.map((parent) => ({
      parent_id: parent.id,
      parent_name: parent.name,
      parent_slug: parent.slug,
      sort_order: 0,
      children: parent.children.map((child) => ({
        parent_id: parent.id,
        parent_name: parent.name,
        parent_slug: parent.slug,
        child_id: child.id,
        child_name: child.name,
        child_slug: child.slug,
        sort_order: 0,
      })),
    }));

    return {
      parents: groups.map((group) => ({
        parent_id: group.parent_id,
        parent_name: group.parent_name,
        parent_slug: group.parent_slug,
        sort_order: group.sort_order,
      })),
      groups,
      tree: tree.items,
    };
  }
}
