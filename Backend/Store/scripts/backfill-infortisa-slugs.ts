import { PrismaClient } from '@prisma/client';
import { generateDeterministicProductSlug } from '../src/infortisa/product-slug.util';

const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany({
    select: {
      id: true,
      title: true,
      slug: true,
      skus: {
        select: { sku_code: true },
        orderBy: { created_at: 'asc' },
        take: 1,
      },
    },
  });

  let skippedWithoutSku = 0;
  let updated = 0;

  for (const product of products) {
    const skuCode = product.skus[0]?.sku_code;
    const nextSlug = generateDeterministicProductSlug(product.title, skuCode);

    if (!nextSlug) {
      skippedWithoutSku += 1;
      continue;
    }

    if (product.slug === nextSlug) {
      continue;
    }

    await prisma.product.update({
      where: { id: product.id },
      data: { slug: nextSlug },
    });

    updated += 1;
  }

  console.log(
    `[backfill-infortisa-slugs] completed: updated=${updated}, skipped_without_sku=${skippedWithoutSku}, scanned=${products.length}`,
  );
}

main()
  .catch((error) => {
    console.error('[backfill-infortisa-slugs] failed', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
