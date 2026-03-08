import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function normalizeLogoUrl(value?: string | null): string | null {
  const raw = String(value || '').trim();
  if (!raw) return null;
  if (raw.startsWith('data:') || raw.startsWith('blob:') || raw.startsWith('/')) return raw;
  if (raw.startsWith('//')) return `https:${raw}`;
  if (/^https?:\/\//i.test(raw)) return raw.replace(/^http:\/\//i, 'https://');
  if (/^[a-z0-9.-]+\.[a-z]{2,}(\/.*)?$/i.test(raw)) return `https://${raw}`;
  return `/${raw.replace(/^\/+/, '')}`;
}

async function main() {
  const apply = process.argv.includes('--apply');
  const brands = await prisma.brand.findMany({
    select: { id: true, name: true, slug: true, logo_url: true, is_active: true },
    orderBy: { name: 'asc' },
  });

  const missing = brands.filter((b) => !String(b.logo_url || '').trim());
  const normalized = brands
    .map((b) => {
      const next = normalizeLogoUrl(b.logo_url);
      const current = b.logo_url || null;
      return { ...b, current, next, changed: current !== next };
    })
    .filter((b) => b.changed);

  console.log(`Total brands: ${brands.length}`);
  console.log(`Missing logos: ${missing.length}`);
  console.log(`URLs normalizable: ${normalized.length}`);

  if (missing.length) {
    console.log('\nBrands missing logo_url (top 30):');
    for (const brand of missing.slice(0, 30)) {
      console.log(`- ${brand.name} (${brand.slug})`);
    }
  }

  if (normalized.length) {
    console.log('\nBrand logo URL changes (top 30):');
    for (const row of normalized.slice(0, 30)) {
      console.log(`- ${row.name}: ${row.current ?? 'null'} -> ${row.next ?? 'null'}`);
    }
  }

  if (apply && normalized.length) {
    console.log('\nApplying updates...');
    for (const row of normalized) {
      await prisma.brand.update({ where: { id: row.id }, data: { logo_url: row.next } });
    }
    console.log(`Applied ${normalized.length} updates.`);
  } else if (!apply) {
    console.log('\nDry run mode. Re-run with --apply to persist normalizations.');
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
