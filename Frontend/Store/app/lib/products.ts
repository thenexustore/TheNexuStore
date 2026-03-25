import { apiRequest } from "./api";

export interface ProductFilters {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  brand?: string;
  categories?: string[];
  sort_by?:
    | "newest"
    | "price_low_to_high"
    | "price_high_to_low"
    | "best_selling"
    | "most_reviewed"
    | "highest_rated"
    | "name_a_to_z"
    | "name_z_to_a";
  min_price?: number;
  max_price?: number;
  in_stock_only?: boolean;
  featured_only?: boolean;
  attributes?: string[];
}

export interface FilterOptions {
  categories: Array<{
    id: string;
    name: string;
    slug: string;
    count: number;
    parent_id?: string | null;
    parent_name?: string | null;
    parent_slug?: string | null;
    display_name?: string;
  }>;
  brands: Array<{ id: string; name: string; slug: string; count: number }>;
  price_range: { min: number; max: number };
  attributes: Array<{
    key: string;
    name: string;
    values: Array<{ value: string; count: number }>;
  }>;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  parent_id?: string | null;
  order?: number;
  product_count?: number;
  children?: Category[];
}



export interface MenuTreeParent {
  parent_id: string;
  parent_name: string;
  parent_slug: string;
  sort_order: number;
}

export interface MenuTreeChildItem {
  parent_id: string;
  parent_name: string;
  parent_slug: string;
  child_id: string;
  child_name: string;
  child_slug: string;
  sort_order: number;
  product_count?: number;
}

export interface MenuTreeGroup {
  parent_id: string;
  parent_name: string;
  parent_slug: string;
  sort_order: number;
  children: MenuTreeChildItem[];
}

export interface MenuTreeResponse {
  parents: MenuTreeParent[];
  groups: MenuTreeGroup[];
}

export interface CategoryTreeNode {
  id: string;
  name: string;
  slug: string;
  parent_id?: string | null;
  sort_order?: number;
  depth: number;
  path?: string;
  ancestry?: Array<{ id: string; slug: string; name: string }>;
  children: CategoryTreeNode[];
}

export interface CategoryTreeResponse {
  items: CategoryTreeNode[];
  meta: {
    maxDepth: number;
    locale: string;
    includeEmpty: boolean;
    includeCounts: boolean;
    normalization?: {
      normalized_rows: number;
      root_nodes: number;
      virtual_parents: number;
    };
  };
}

export interface CategorySearchResult {
  id: string;
  name: string;
  slug: string;
  depth: number;
  path: string;
  pathSlugs?: string[];
  parentIds: string[];
  ancestors: Array<{ id: string; name: string; slug: string }>;
}

export interface Product {
  id: string;
  title: string;
  slug: string;
  brand_name: string;
  brand_slug: string;
  category_name: string;
  category_slug: string;
  sku_code: string;
  sku_id?: string;
  price: number;
  compare_at_price?: number;
  discount_pct?: number;
  discount_percentage?: number;
  stock_quantity: number;
  stock_status: string;
  short_description?: string;
  thumbnail: string;
  rating_avg?: number;
  rating_count: number;
  is_featured: boolean;
}

export interface ProductResponse {
  products: Product[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
  filters?: FilterOptions;
}

export interface ProductDetail extends Product {
  description_html?: string;
  images: Array<{
    url: string;
    alt_text?: string;
    type: string;
    sort_order: number;
  }>;
  attributes: Array<{
    key: string;
    name: string;
    data_type: string;
    values: string[];
  }>;
  variants: Array<{
    id: string;
    sku_id?: string;
    sku_code: string;
    variant_name?: string;
    attributes: Array<{ key: string; value: string }>;
    price: number;
    compare_at_price?: number;
    stock_quantity: number;
    stock_status: string;
    images: Array<{
      url: string;
      alt_text?: string;
      type: string;
      sort_order: number;
    }>;
  }>;
  reviews?: Array<{
    id: string;
    customer_name: string;
    rating: number;
    title?: string;
    comment?: string;
    created_at: string;
  }>;
  brand: {
    id: string;
    name: string;
    slug: string;
    logo_url?: string;
  };
  categories: Array<{
    id: string;
    name: string;
    slug: string;
  }>;
  main_category?: {
    id: string;
    name: string;
    slug: string;
  };
  created_at: string;
  updated_at: string;
}

export interface ReviewData {
  rating: number;
  title?: string;
  comment?: string;
}

class ProductAPI {
  async getProducts(filters: ProductFilters = {}): Promise<ProductResponse> {
    const normalizedFilters: ProductFilters = {
      ...filters,
      in_stock_only: filters.in_stock_only ?? true,
    };
    const params = new URLSearchParams();

    Object.entries(normalizedFilters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        if (Array.isArray(value)) {
          params.append(key, value.join(","));
        } else if (typeof value === "boolean") {
          params.append(key, value.toString());
        } else {
          params.append(key, value.toString());
        }
      }
    });

    const endpoint = `/user/products${
      params.toString() ? `?${params.toString()}` : ""
    }`;
    return apiRequest(endpoint); // Use apiRequest from single source
  }

  async getDealsProducts(
    limit: number = 48,
    inStockOnly: boolean = true,
  ): Promise<Product[]> {
    const data = await apiRequest(
      `/user/products/deals?limit=${limit}&in_stock_only=${inStockOnly}`,
    );
    return data;
  }

  async getProductById(id: string): Promise<ProductDetail> {
    return apiRequest(`/user/products/${id}`);
  }

  async getProductBySlug(slug: string): Promise<ProductDetail> {
    return apiRequest(`/user/products/slug/${slug}`);
  }

  async getFeaturedProducts(limit: number = 8): Promise<Product[]> {
    const data = await apiRequest(`/user/products/featured?limit=${limit}`);
    return data;
  }

  async searchProducts(query: string, limit: number = 10): Promise<Product[]> {
    const data = await apiRequest(
      `/user/products/search?q=${encodeURIComponent(query)}&limit=${limit}`,
    );
    return data;
  }

  async getRelatedProducts(
    productId: string,
    limit: number = 4,
  ): Promise<Product[]> {
    const data = await apiRequest(
      `/user/products/${productId}/related?limit=${limit}`,
    );
    return data;
  }

  async getProductsByCategory(
    slug: string,
    filters: ProductFilters = {},
  ): Promise<ProductResponse> {
    const normalizedFilters: ProductFilters = {
      ...filters,
      in_stock_only: filters.in_stock_only ?? true,
    };
    const params = new URLSearchParams();

    Object.entries(normalizedFilters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        if (Array.isArray(value)) {
          params.append(key, value.join(","));
        } else if (typeof value === "boolean") {
          params.append(key, value.toString());
        } else {
          params.append(key, value.toString());
        }
      }
    });

    const endpoint = `/user/products/categories/${slug}/products${
      params.toString() ? `?${params.toString()}` : ""
    }`;
    return apiRequest(endpoint);
  }

  async getProductsByBrand(
    slug: string,
    filters: ProductFilters = {},
  ): Promise<ProductResponse> {
    const normalizedFilters: ProductFilters = {
      ...filters,
      in_stock_only: filters.in_stock_only ?? true,
    };
    const params = new URLSearchParams();

    Object.entries(normalizedFilters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        if (Array.isArray(value)) {
          params.append(key, value.join(","));
        } else if (typeof value === "boolean") {
          params.append(key, value.toString());
        } else {
          params.append(key, value.toString());
        }
      }
    });

    const endpoint = `/user/products/brands/${slug}/products${
      params.toString() ? `?${params.toString()}` : ""
    }`;
    return apiRequest(endpoint);
  }

  async createReview(productId: string, reviewData: ReviewData): Promise<unknown> {
    return apiRequest(`/user/products/${productId}/reviews`, {
      method: "POST",
      body: JSON.stringify(reviewData),
    });
  }

  async getMenuTree(): Promise<MenuTreeResponse> {
    return apiRequest('/user/categories/menu-tree');
  }

  async getCategoryTree(maxDepth: number = 5): Promise<CategoryTreeResponse> {
    return apiRequest(`/user/categories/tree?maxDepth=${maxDepth}`);
  }

  async searchCategories(query: string, maxDepth: number = 5): Promise<CategorySearchResult[]> {
    return apiRequest(`/user/categories/search?q=${encodeURIComponent(query)}&maxDepth=${maxDepth}`);
  }

  async universalSearch(
    query: string,
    limit: number = 5,
  ): Promise<{
    products: Product[];
    categories: CategorySearchResult[];
    brands: Array<{ id: string; name: string; slug: string; count: number }>;
  }> {
    const [productResponse, categories] = await Promise.all([
      this.getProducts({ search: query, limit }),
      this.searchCategories(query, limit),
    ]);

    const brandsFromFilters = productResponse.filters?.brands ?? [];
    let brands: Array<{ id: string; name: string; slug: string; count: number }>;
    if (brandsFromFilters.length > 0) {
      brands = brandsFromFilters.slice(0, limit);
    } else {
      const uniqueBrands = new Map<
        string,
        { id: string; name: string; slug: string; count: number }
      >();
      for (const product of productResponse.products ?? []) {
        if (!product.brand_slug) continue;
        const existing = uniqueBrands.get(product.brand_slug);
        if (existing) {
          existing.count += 1;
        } else {
          uniqueBrands.set(product.brand_slug, {
            id: product.brand_slug,
            name: product.brand_name,
            slug: product.brand_slug,
            count: 1,
          });
        }
      }
      brands = Array.from(uniqueBrands.values()).slice(0, limit);
    }

    return {
      products: productResponse.products ?? [],
      categories,
      brands,
    };
  }

  async getCategories(): Promise<Category[]> {
    try {
      const response = await apiRequest("/user/products?limit=1");
      if (response.filters && response.filters.categories) {
        return response.filters.categories.map((cat: FilterOptions["categories"][number]) => ({
          id: cat.id,
          name: cat.name,
          slug: cat.slug,
          product_count: cat.count,
        }));
      }
      return [];
    } catch (error) {
      console.error("Error fetching categories:", error);
      return [];
    }
  }
}

export const productAPI = new ProductAPI();
