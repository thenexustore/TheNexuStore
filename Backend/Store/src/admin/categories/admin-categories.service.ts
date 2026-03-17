import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import {
  MENU_PARENT_TAXONOMY,
  slugifyCategory,
} from '../../infortisa/infortisa-category-mapping.util';

@Injectable()
export class AdminCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async getTaxonomyStatus() {
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

    return {
      parents,
      orphaned_categories: orphanedCategories,
      stats: {
        total_categories: totalCategories,
        total_parents: parentRows.length,
        total_children: childRows.length,
        total_orphaned: orphanedCategories.length,
        total_with_products: totalWithProducts,
      },
    };
  }
}
