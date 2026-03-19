function toFiniteNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function extractInfortisaStock(product: any): {
  stockCentral: number;
  stockPalma: number;
  stockExterno: number;
  qtyOnHandForCatalog: number;
} {
  const stockCentral = toFiniteNumber(
    product?.StockCentral ?? product?.STOCKCENTRAL ?? product?.Stock,
  );
  const stockPalma = toFiniteNumber(product?.StockPalma ?? product?.STOCKPALMA);
  const stockExterno = toFiniteNumber(
    product?.StockExterno ?? product?.STOCKEXTERNO,
  );

  return {
    stockCentral,
    stockPalma,
    stockExterno,
    qtyOnHandForCatalog: stockCentral + stockPalma,
  };
}

export function extractLifecycleCode(product: any): string {
  return String(
    product?.CodCicloVida ?? product?.CICLOVIDA ?? product?.Cycle ?? 'P',
  )
    .trim()
    .toUpperCase();
}
