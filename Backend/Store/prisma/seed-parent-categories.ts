import { PrismaClient } from '@prisma/client';
import {
  MENU_PARENT_TAXONOMY,
  slugifyCategory,
} from '../src/infortisa/infortisa-category-mapping.util';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding canonical parent categories…');

  for (const cat of MENU_PARENT_TAXONOMY) {
    const slug = slugifyCategory(cat.key);
    await prisma.category.upsert({
      where: { slug },
      update: {
        name: cat.label,
        is_active: true,
        sort_order: cat.sortOrder,
        parent_locked: true,
      },
      create: {
        name: cat.label,
        slug,
        parent_id: null,
        is_active: true,
        sort_order: cat.sortOrder,
        parent_locked: true,
      },
    });
    console.log(`  ✓ ${cat.label} (slug: ${slug}, sort_order: ${cat.sortOrder})`);
  }

  console.log('Done — all canonical parent categories are present in the DB.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
