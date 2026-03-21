export function formatCurrency(amount: number, locale = "es-ES", currency = "EUR") {
  const parts = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).formatToParts(Number(amount || 0));

  const symbol = parts
    .filter((part) => part.type === "currency")
    .map((part) => part.value)
    .join("") || currency;

  const value = parts
    .filter((part) => part.type !== "currency")
    .map((part) => part.value)
    .join("")
    .trim();

  return `${value} ${symbol}`;
}
