import { apiRequest } from "./api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

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
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
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
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
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
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
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

  async createReview(productId: string, reviewData: ReviewData): Promise<any> {
    return apiRequest(`/user/products/${productId}/reviews`, {
      method: "POST",
      body: JSON.stringify(reviewData),
    });
  }

  async getCategories(): Promise<Category[]> {
    try {
      const response = await apiRequest("/user/products?limit=1");
      if (response.filters && response.filters.categories) {
        return response.filters.categories.map((cat: any) => ({
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
