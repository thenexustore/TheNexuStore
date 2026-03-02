export function slugifyName(value: string): string {
  const normalized = String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  return normalized.length > 0 ? normalized : 'product';
}

export function normalizeSku(value: unknown): string {
  return String(value ?? '').trim();
}

export function generateDeterministicProductSlug(
  name: string,
  sku: unknown,
): string | null {
  const normalizedSku = normalizeSku(sku);
  if (!normalizedSku) {
    return null;
  }

  return `${slugifyName(name)}-${normalizedSku.toLowerCase()}`;
}
