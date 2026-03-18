import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import {
  buildCategoryTaxonomyTree,
  normalizeCategoryTaxonomyRows,
  type CategoryTaxonomyNode,
  type CategoryTaxonomyRow,
  sortCategoryRows,
} from './category-taxonomy.util';

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
    { expiresAt: number; value: { items: CategoryTaxonomyNode[]; meta: any } }
  >();

  constructor(private readonly prisma: PrismaService) {}

  invalidateTreeCache() {
    this.treeCache.clear();
  }

  private getCacheKey({
    locale,
    maxDepth,
    includeEmpty,
    includeCounts,
  }: Required<TreeQuery>) {
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

  private async getVisibleCategories(): Promise<CategoryTaxonomyRow[]> {
    const rows = await this.prisma.category.findMany({
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

    return normalizeCategoryTaxonomyRows(rows);
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
    const items = buildCategoryTaxonomyTree(rows, maxDepth);

    if (items.length === 0 && rows.length > 0) {
      this.logger.warn(
        'Active categories exist but taxonomy tree is empty; check for invalid cyclic parent relationships.',
      );
    }

    const value = {
      items,
      meta: {
        maxDepth,
        locale: normalized.locale,
        includeEmpty: normalized.includeEmpty === 'true',
        includeCounts: normalized.includeCounts === 'true',
      },
    };

    this.treeCache.set(cacheKey, {
      value,
      expiresAt: Date.now() + this.cacheTtlMs,
    });
    return value;
  }

  async searchCategories({
    query,
    maxDepth,
  }: {
    query?: string;
    locale?: string;
    maxDepth?: string;
  }) {
    const q = (query ?? '').trim().toLowerCase();
    if (!q) return [];

    const depthLimit = this.normalizeMaxDepth(maxDepth);
    const rows = sortCategoryRows(await this.getVisibleCategories());
    const byId = new Map(rows.map((row) => [row.id, row]));

    const buildAncestors = (row: CategoryTaxonomyRow) => {
      const chain: CategoryTaxonomyRow[] = [row];
      const visited = new Set<string>([row.id]);
      let cursor = row;

      while (cursor.parent_id && byId.has(cursor.parent_id)) {
        const parent = byId.get(cursor.parent_id)!;
        if (visited.has(parent.id)) {
          this.logger.warn(
            `Cycle detected while resolving category search path for ${row.id}`,
          );
          break;
        }
        chain.unshift(parent);
        visited.add(parent.id);
        cursor = parent;
      }

      return chain;
    };

    return rows
      .filter(
        (row) =>
          row.name.toLowerCase().includes(q) ||
          row.slug.toLowerCase().includes(q),
      )
      .map((row) => {
        const chain = buildAncestors(row);
        const clipped = chain.slice(0, depthLimit);
        return {
          id: row.id,
          name: row.name,
          slug: row.slug,
          depth: chain.length,
          path: chain.map((item) => item.name).join(' > '),
          pathSlugs: chain.map((item) => item.slug),
          parentIds: chain.slice(0, -1).map((item) => item.id),
          ancestors: clipped.slice(0, -1).map((item) => ({
            id: item.id,
            name: item.name,
            slug: item.slug,
          })),
        };
      })
      .sort((a, b) =>
        a.path.localeCompare(b.path, 'es', { sensitivity: 'base' }),
      );
  }

  async getLegacyMenuTree() {
    const tree = await this.getCategoryTree({ maxDepth: '2' });
    const groups = tree.items.map((parent) => ({
      parent_id: parent.id,
      parent_name: parent.name,
      parent_slug: parent.slug,
      sort_order: parent.sort_order,
      children: parent.children.map((child) => ({
        parent_id: parent.id,
        parent_name: parent.name,
        parent_slug: parent.slug,
        child_id: child.id,
        child_name: child.name,
        child_slug: child.slug,
        sort_order: child.sort_order,
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
