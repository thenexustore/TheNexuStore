import type { ProductFilters } from "./products";

type SearchParamRecord = Record<string, string | string[] | undefined>;

function readValue(
  input: URLSearchParams | SearchParamRecord,
  key: string,
): string | undefined {
  if (input instanceof URLSearchParams) {
    return input.get(key) ?? undefined;
  }

  const value = input[key];
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

export function buildFiltersFromSearchParams(
  input: URLSearchParams | SearchParamRecord,
): ProductFilters {
  const sortByParam = readValue(input, "sort_by") as ProductFilters["sort_by"] | undefined;
  const rawPage = Number.parseInt(readValue(input, "page") ?? "1", 10);
  const rawMinPrice = Number.parseInt(readValue(input, "min_price") ?? "", 10);
  const rawMaxPrice = Number.parseInt(readValue(input, "max_price") ?? "", 10);
  const categoriesParam = readValue(input, "categories");
  const attributesParam = readValue(input, "attributes");

  const filters: ProductFilters = {
    page: Number.isNaN(rawPage) || rawPage < 1 ? 1 : rawPage,
    limit: 20,
    search: readValue(input, "search") || undefined,
    category: readValue(input, "category") || undefined,
    brand: readValue(input, "brand") || undefined,
    sort_by: sortByParam || "newest",
    min_price: Number.isNaN(rawMinPrice) ? undefined : rawMinPrice,
    max_price: Number.isNaN(rawMaxPrice) ? undefined : rawMaxPrice,
    in_stock_only: readValue(input, "in_stock_only") === "false" ? false : true,
    featured_only: readValue(input, "featured_only") === "true" ? true : undefined,
    attributes: attributesParam
      ? attributesParam.split(",").filter((item) => item.length > 0)
      : undefined,
  };

  if (categoriesParam) {
    const categories = categoriesParam.split(",").filter((item) => item.length > 0);
    if (categories.length > 0) {
      filters.categories = categories;
    }
  }

  return filters;
}
