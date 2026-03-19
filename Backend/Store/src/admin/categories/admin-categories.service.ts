import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import {
  recommendParentCategory,
  MENU_PARENT_TAXONOMY,
  slugifyCategory,
} from '../../infortisa/infortisa-category-mapping.util';
import {
  buildCategoryLevel2Descriptor,
  resolveCanonicalParentSlug,
} from '../../user/categories/category-taxonomy.util';

@Injectable()
export class AdminCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async getTaxonomyStatus() {
    const countBy = <T extends string | null | undefined>(values: T[]) =>
      Array.from(
        values.reduce((acc, value) => {
          const key = value ?? 'null';
          acc.set(key, (acc.get(key) ?? 0) + 1);
          return acc;
        }, new Map<string, number>()),
      )
        .map(([key, count]) => ({ key, count }))
        .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));

    const knownParentSlugs = MENU_PARENT_TAXONOMY.map((cat) =>
      slugifyCategory(cat.key),
    );

    const allCategories = await this.prisma.category.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        parent_id: true,
        is_active: true,
        parent: {
          select: {
            id: true,
            name: true,
            slug: true,
            parent_id: true,
          },
        },
        _count: {
          select: {
            children: true,
            products_main: true,
          },
        },
      },
    });

    const totalCategories = allCategories.length;
    const parentRows = allCategories.filter((c) => c.parent_id === null);
    const childRows = allCategories.filter((c) => c.parent_id !== null);
    const byId = new Map(
      allCategories.map((category) => [category.id, category]),
    );
    const level2Rows = allCategories.filter(
      (c) =>
        c.slug.includes('-familia-') &&
        Boolean(c.parent?.slug && knownParentSlugs.includes(c.parent.slug)),
    );
    const resolveCanonicalAncestorSlug = (
      category: (typeof allCategories)[number],
    ) => {
      const directParentSlug = category.parent?.slug
        ? resolveCanonicalParentSlug(category.parent.slug)
        : null;
      if (directParentSlug) return directParentSlug;

      const parent = category.parent_id ? byId.get(category.parent_id) : null;
      const grandparent = parent?.parent_id ? byId.get(parent.parent_id) : null;

      return grandparent?.slug
        ? resolveCanonicalParentSlug(grandparent.slug)
        : null;
    };

    const orphanedCategories = parentRows
      .filter((c) => !knownParentSlugs.includes(c.slug))
      .map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        parent_id: c.parent_id,
        product_count: c._count.products_main,
      }));

    const seededSlugs = new Set(parentRows.map((c) => c.slug));

    const parents = MENU_PARENT_TAXONOMY.map((cat) => {
      const slug = slugifyCategory(cat.key);
      const row = allCategories.find((c) => c.slug === slug);
      return {
        slug,
        name: cat.label,
        is_active: row?.is_active ?? false,
        child_count: row?._count.children ?? 0,
        product_count: row?._count.products_main ?? 0,
        is_seeded: seededSlugs.has(slug),
      };
    });

    const totalWithProducts = allCategories.filter(
      (c) => c._count.products_main > 0,
    ).length;
    const directChildrenOfCanonical = childRows
      .filter((c) => {
        const parentSlug = c.parent?.slug ?? null;
        return Boolean(
          parentSlug &&
          knownParentSlugs.includes(parentSlug) &&
          !c.slug.includes('-familia-'),
        );
      })
      .map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        parent_slug: c.parent?.slug ?? null,
        product_count: c._count.products_main,
      }));

    const mismatchedLevel2Parenting = childRows
      .filter((c) => {
        if (c.slug.includes('-familia-')) return false;

        const recommendedParent = recommendParentCategory(
          null,
          c.slug.replace(/-/g, ' '),
        );
        const canonicalSlug =
          resolveCanonicalAncestorSlug(c) ??
          resolveCanonicalParentSlug(recommendedParent.key);

        if (!canonicalSlug) return false;

        const expectedLevel2 = buildCategoryLevel2Descriptor(canonicalSlug, {
          name: c.name,
          slug: c.slug,
        });

        return c.parent?.slug !== expectedLevel2.slug;
      })
      .map((c) => {
        const recommendedParent = recommendParentCategory(
          null,
          c.slug.replace(/-/g, ' '),
        );
        const canonicalSlug =
          resolveCanonicalAncestorSlug(c) ??
          resolveCanonicalParentSlug(recommendedParent.key) ??
          'unknown';
        const expectedLevel2 = buildCategoryLevel2Descriptor(canonicalSlug, {
          name: c.name,
          slug: c.slug,
        });

        return {
          id: c.id,
          name: c.name,
          slug: c.slug,
          current_parent_slug: c.parent?.slug ?? null,
          expected_parent_slug: expectedLevel2.slug,
          expected_parent_name: expectedLevel2.name,
          product_count: c._count.products_main,
        };
      });

    const redundantNavigationCandidates = level2Rows
      .filter((row) => {
        const sameNameOnlyChild = allCategories.find(
          (candidate) =>
            candidate.parent_id === row.id &&
            candidate.name.localeCompare(row.name, 'es', {
              sensitivity: 'base',
            }) === 0,
        );
        return Boolean(sameNameOnlyChild && row._count.children === 1);
      })
      .map((row) => ({
        id: row.id,
        name: row.name,
        slug: row.slug,
        parent_slug: row.parent?.slug ?? null,
      }));
    const summaryByExpectedParent = countBy(
      mismatchedLevel2Parenting.map((row) => row.expected_parent_slug),
    );
    const summaryByCurrentParent = countBy(
      mismatchedLevel2Parenting.map((row) => row.current_parent_slug),
    );
    const directChildrenSummaryByCanonical = countBy(
      directChildrenOfCanonical.map((row) => row.parent_slug),
    );

    return {
      parents,
      orphaned_categories: orphanedCategories,
      direct_children_of_canonical: directChildrenOfCanonical,
      direct_children_summary_by_canonical: directChildrenSummaryByCanonical,
      mismatched_level2_parenting: mismatchedLevel2Parenting,
      mismatched_summary_by_expected_parent: summaryByExpectedParent,
      mismatched_summary_by_current_parent: summaryByCurrentParent,
      redundant_navigation_candidates: redundantNavigationCandidates,
      stats: {
        total_categories: totalCategories,
        total_parents: parentRows.length,
        total_children: childRows.length,
        total_level2_parents: level2Rows.length,
        total_orphaned: orphanedCategories.length,
        total_with_products: totalWithProducts,
        total_direct_children_of_canonical: directChildrenOfCanonical.length,
        total_mismatched_level2_parenting: mismatchedLevel2Parenting.length,
        total_redundant_navigation_candidates:
          redundantNavigationCandidates.length,
      },
    };
  }
}
