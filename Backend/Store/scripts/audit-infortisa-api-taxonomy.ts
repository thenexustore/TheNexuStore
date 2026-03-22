import axios from 'axios';
import { createDecipheriv, createHash } from 'crypto';
import { buildCategoryLevel2Descriptor } from '../src/user/categories/category-taxonomy.util';
import { INFORTISA_DEFAULT_BASE_URL } from '../src/infortisa/import-runtime-settings';
import {
  recommendParentCategory,
  slugifyCategory,
} from '../src/infortisa/infortisa-category-mapping.util';

type CatalogMeta = {
  page: number;
  pageSize: number;
  totalReceived: number;
  totalExpected: number | null;
  totalPages: number | null;
  hasMore: boolean | null;
};

type NormalizedProduct = {
  sku: string | null;
  title: string;
  familyName: string | null;
  subfamilyName: string | null;
  categoryName: string;
  manufacturerName: string;
};

function printHelp() {
  console.log(`Usage:
  ts-node scripts/audit-infortisa-api-taxonomy.ts [--token <token>] [--base-url <url>] [--page-size <n>]

Reads the supplier API directly and prints:
  - top level-2 groups to review/split
  - source family/subfamily combos behind each target branch
  - rows that still fall into "otras-categorias"

Auth:
  Resolution order:
    1. --token <token>
    2. INFORTISA_API_TOKEN from env
    3. decrypted SupplierIntegration.api_key_encrypted from DATABASE_URL
`);
}

function pickNumber(source: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim() !== '') {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return null;
}

function pickBoolean(source: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (normalized === 'true') return true;
      if (normalized === 'false') return false;
    }
  }
  return null;
}

function getArrayPayload(payload: unknown): unknown[] | null {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>;
    const candidate =
      record.items ?? record.data ?? record.results ?? record.value;
    if (Array.isArray(candidate)) return candidate;
  }
  return null;
}

function buildMeta(
  payload: unknown,
  items: unknown[],
  requestedPage: number,
): CatalogMeta {
  const record =
    payload && typeof payload === 'object'
      ? (payload as Record<string, unknown>)
      : {};

  return {
    page:
      pickNumber(record, ['page', 'Page', 'currentPage', 'CurrentPage']) ??
      requestedPage,
    pageSize:
      pickNumber(record, ['pageSize', 'PageSize', 'limit', 'Limit']) ??
      items.length,
    totalReceived: items.length,
    totalExpected: pickNumber(record, [
      'total',
      'Total',
      'totalCount',
      'TotalCount',
      'count',
      'Count',
    ]),
    totalPages: pickNumber(record, [
      'totalPages',
      'TotalPages',
      'pages',
      'Pages',
    ]),
    hasMore: pickBoolean(record, ['hasMore', 'HasMore', 'more', 'More']),
  };
}

function normalizeProduct(raw: any): NormalizedProduct {
  const sku =
    typeof raw.SKU === 'string' && raw.SKU.trim()
      ? raw.SKU.trim()
      : typeof raw.CODIGOINTERNO === 'string' && raw.CODIGOINTERNO.trim()
        ? raw.CODIGOINTERNO.trim()
        : null;

  const title = String(raw.ProductDescription || raw.TITULO || raw.Name || '');
  const familyName = raw.TITULO_FAMILIA || raw.FamilyName || null;
  const subfamilyName = raw.TITULOSUBFAMILIA || raw.SubfamilyName || null;
  const categoryName = String(
    raw.TITULOSUBFAMILIA ||
      raw.TITULO_FAMILIA ||
      raw.CategoryName ||
      'Infortisa',
  );

  return {
    sku,
    title,
    familyName: familyName ? String(familyName) : null,
    subfamilyName: subfamilyName ? String(subfamilyName) : null,
    categoryName,
    manufacturerName: String(
      raw.NOMFABRICANTE || raw.ManufacturerName || 'Infortisa',
    ),
  };
}

function countBy(values: string[]) {
  return Array.from(
    values.reduce((acc, value) => {
      acc.set(value, (acc.get(value) ?? 0) + 1);
      return acc;
    }, new Map<string, number>()),
  )
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
}

async function fetchCatalog(params: {
  token: string;
  baseUrl: string;
  pageSize?: number;
}) {
  const client = axios.create({
    baseURL: params.baseUrl,
    timeout: 300000,
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'taxonomy-audit-script/1.0',
      'Authorization-Token': params.token,
    },
  });

  const firstResponse = params.pageSize
    ? await client.get('/api/Product/Get', {
        params: { page: 1, pageSize: params.pageSize },
      })
    : await client.get('/api/Product/Get');

  const firstItems = getArrayPayload(firstResponse.data);
  if (!firstItems) {
    throw new Error('Supplier API did not return a valid items array.');
  }
  const firstMeta = buildMeta(firstResponse.data, firstItems, 1);
  const pages = [firstItems];

  const totalPages = firstMeta.totalPages ?? (firstMeta.hasMore ? 2 : 1);
  const pageSize = params.pageSize ?? firstMeta.pageSize;

  if (totalPages > 1) {
    for (let page = 2; page <= totalPages; page += 1) {
      const response = await client.get('/api/Product/Get', {
        params: { page, pageSize },
      });
      const items = getArrayPayload(response.data);
      if (!items) break;
      pages.push(items);
    }
  }

  const flattened = pages.flat();
  return {
    items: flattened.map((item) => normalizeProduct(item)),
    meta: {
      ...firstMeta,
      totalReceived: flattened.length,
      totalPages,
    },
  };
}

async function readTokenFromDatabase() {
  if (!process.env.DATABASE_URL) {
    return null;
  }

  try {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    try {
      const record = await prisma.supplierIntegration.findUnique({
        where: { provider: 'INFORTISA' },
        select: { api_key_encrypted: true },
      });

      if (!record?.api_key_encrypted) {
        return null;
      }

      const secret =
        process.env.INTEGRATION_SECRET_KEY ??
        process.env.JWT_SECRET ??
        'dev_secret';

      const raw = Buffer.from(record.api_key_encrypted, 'base64');
      const iv = raw.subarray(0, 12);
      const authTag = raw.subarray(12, 28);
      const encrypted = raw.subarray(28);
      const key = createHash('sha256').update(secret).digest();
      const decipher = createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(authTag);

      return Buffer.concat([
        decipher.update(encrypted),
        decipher.final(),
      ]).toString('utf8');
    } finally {
      await prisma.$disconnect();
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(
      `Warning: unable to load INFORTISA token from database: ${message}`,
    );
    return null;
  }
}

async function main() {
  const rawArgs = process.argv.slice(2);
  if (rawArgs.includes('--help')) {
    printHelp();
    return;
  }

  const tokenIndex = rawArgs.findIndex((arg) => arg === '--token');
  const pageSizeIndex = rawArgs.findIndex((arg) => arg === '--page-size');
  const baseUrlIndex = rawArgs.findIndex((arg) => arg === '--base-url');

  const tokenFromArgs =
    (tokenIndex >= 0 ? rawArgs[tokenIndex + 1] : undefined) ??
    rawArgs.find((arg) => arg.startsWith('--token='))?.slice('--token='.length);

  const token =
    tokenFromArgs ??
    process.env.INFORTISA_API_TOKEN ??
    (await readTokenFromDatabase()) ??
    '';

  const baseUrl =
    (baseUrlIndex >= 0 ? rawArgs[baseUrlIndex + 1] : undefined) ??
    rawArgs
      .find((arg) => arg.startsWith('--base-url='))
      ?.slice('--base-url='.length) ??
    INFORTISA_DEFAULT_BASE_URL;

  const pageSizeRaw =
    (pageSizeIndex >= 0 ? rawArgs[pageSizeIndex + 1] : undefined) ??
    rawArgs
      .find((arg) => arg.startsWith('--page-size='))
      ?.slice('--page-size='.length);
  const pageSize = pageSizeRaw ? Number(pageSizeRaw) : undefined;

  if (!token) {
    throw new Error(
      'Missing API token. Provide --token <token>, set INFORTISA_API_TOKEN, or configure SupplierIntegration in the database.',
    );
  }

  const catalog = await fetchCatalog({
    token,
    baseUrl,
    pageSize: Number.isFinite(pageSize) ? pageSize : undefined,
  });

  const rows = catalog.items.map((product) => {
    const recommendedParent = recommendParentCategory(
      product.familyName,
      product.subfamilyName ?? product.categoryName,
    );
    const parentSlug = slugifyCategory(recommendedParent.key);
    const level2 = buildCategoryLevel2Descriptor(parentSlug, {
      familyName: product.familyName,
      subfamilyName: product.subfamilyName ?? product.categoryName,
      name: product.categoryName,
      slug: slugifyCategory(product.categoryName),
    });

    return {
      ...product,
      targetParentSlug: parentSlug,
      targetParentName: recommendedParent.label,
      targetLevel2Slug: level2.slug,
      targetLevel2Name: level2.name,
    };
  });

  const level2Summary = countBy(rows.map((row) => row.targetLevel2Slug));
  const otherCategories = rows.filter((row) =>
    row.targetLevel2Slug.includes('-familia-otras-categorias'),
  );

  const sourceCombosByTarget = new Map<string, Set<string>>();
  for (const row of rows) {
    const key = row.targetLevel2Slug;
    const combo = `${row.familyName ?? 'sin-familia'} > ${row.subfamilyName ?? row.categoryName}`;
    const bucket = sourceCombosByTarget.get(key) ?? new Set<string>();
    bucket.add(combo);
    sourceCombosByTarget.set(key, bucket);
  }

  console.log(
    `# Infortisa API taxonomy audit (items=${catalog.meta.totalReceived}, pages=${catalog.meta.totalPages ?? 1})`,
  );
  console.log('');
  console.log('## Nivel 2 a revisar/dividir primero');
  for (const row of level2Summary.slice(0, 15)) {
    const distinctCombos = sourceCombosByTarget.get(row.key)?.size ?? 0;
    console.log(
      `- ${row.key}: ${row.count} productos · ${distinctCombos} familias/subfamilias origen`,
    );
  }

  if (otherCategories.length > 0) {
    console.log('');
    console.log(
      '## Atención: productos que siguen cayendo en "Otras categorías"',
    );
    for (const row of otherCategories.slice(0, 20)) {
      console.log(
        `- ${row.sku ?? 'sin-sku'} :: ${row.familyName ?? 'sin-familia'} > ${row.subfamilyName ?? row.categoryName} -> ${row.targetLevel2Slug}`,
      );
    }
  }

  console.log('');
  console.log('## Muestra por bloque de recolocación lógica');
  for (const row of level2Summary.slice(0, 10)) {
    const sample = rows
      .filter((item) => item.targetLevel2Slug === row.key)
      .slice(0, 5)
      .map(
        (item) =>
          `${item.familyName ?? 'sin-familia'} > ${item.subfamilyName ?? item.categoryName}`,
      );
    console.log(`- ${row.key}: ${sample.join(' | ')}`);
  }
}

main().catch((error) => {
  console.error('[audit-infortisa-api-taxonomy] failed', error);
  process.exitCode = 1;
});
