import {
  extractInfortisaStock,
  extractLifecycleCode,
} from './infortisa-normalization.util';

describe('Infortisa normalization util', () => {
  it('extracts stock from mixed payload shape and sums central + palma', () => {
    const stock = extractInfortisaStock({
      StockCentral: 7,
      STOCKPALMA: '3',
      STOCKEXTERNO: 10,
    });

    expect(stock.stockCentral).toBe(7);
    expect(stock.stockPalma).toBe(3);
    expect(stock.stockExterno).toBe(10);
    expect(stock.qtyOnHandForCatalog).toBe(10);
  });

  it('falls back to Stock when central stock fields are missing', () => {
    const stock = extractInfortisaStock({
      Stock: '12',
      StockPalma: 0,
    });

    expect(stock.stockCentral).toBe(12);
    expect(stock.qtyOnHandForCatalog).toBe(12);
  });

  it('normalizes lifecycle from any known field', () => {
    expect(extractLifecycleCode({ CodCicloVida: 'd' })).toBe('D');
    expect(extractLifecycleCode({ CICLOVIDA: ' x ' })).toBe('X');
    expect(extractLifecycleCode({ Cycle: 'p' })).toBe('P');
    expect(extractLifecycleCode({})).toBe('P');
  });
});
