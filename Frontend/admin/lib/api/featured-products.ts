import { API_URL } from "../constants";
import { adminLogout } from "../utils";

async function fetchWithAuth(
  endpoint: string,
  options: RequestInit = {},
): Promise<any> {
  const token = localStorage.getItem("admin_token");

  if (!token) {
    throw new Error("No authentication token");
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const data = await response.json();

  if (response.status === 401) {
    adminLogout();
    throw new Error("Session expired");
  }

  if (!response.ok) {
    throw new Error(data.message || "API request failed");
  }

  return data;
}

export interface FeaturedProduct {
  id: string;
  product_id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  image_url: string | null;
  badge_text: string | null;
  badge_color: string;
  button_text: string;
  button_link: string | null;
  layout_type: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  product: {
    id: string;
    title: string;
    slug: string;
    brand: {
      name: string;
    };
    main_category: {
      name: string;
    } | null;
    skus: Array<{
      sku_code: string;
      prices: Array<{
        sale_price: string;
      }>;
    }>;
  };
}

export interface FeaturedProductsResponse {
  data: FeaturedProduct[];
  meta: {
    total: number;
    skip: number;
    take: number;
  };
}

export interface CreateFeaturedProductDto {
  product_id: string;
  title?: string;
  subtitle?: string;
  description?: string;
  image_url?: string;
  badge_text?: string;
  badge_color?: string;
  button_text?: string;
  button_link?: string;
  layout_type?: string;
  sort_order?: number;
  is_active?: boolean;
}

export interface UpdateFeaturedProductDto extends Partial<CreateFeaturedProductDto> {}

export interface ProductOption {
  id: string;
  title: string;
  sku: string;
  brand: string;
  category: string | undefined;
  price: string;
  image: string | undefined;
}

export const fetchFeaturedProducts = async (params?: {
  skip?: number;
  take?: number;
  is_active?: boolean;
  search?: string;
}): Promise<FeaturedProductsResponse> => {
  const queryParams = new URLSearchParams();
  if (params?.skip !== undefined)
    queryParams.append("skip", params.skip.toString());
  if (params?.take !== undefined)
    queryParams.append("take", params.take.toString());
  if (params?.is_active !== undefined)
    queryParams.append("is_active", params.is_active.toString());
  if (params?.search) queryParams.append("search", params.search);

  const response = await fetchWithAuth(
    `/admin/featured-products?${queryParams}`,
  );
  return response;
};

export const fetchFeaturedProductById = async (
  id: string,
): Promise<FeaturedProduct> => {
  const response = await fetchWithAuth(`/admin/featured-products/${id}`);
  return response;
};

export const createFeaturedProduct = async (
  data: CreateFeaturedProductDto,
): Promise<FeaturedProduct> => {
  const response = await fetchWithAuth("/admin/featured-products", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return response;
};

export const updateFeaturedProduct = async (
  id: string,
  data: UpdateFeaturedProductDto,
): Promise<FeaturedProduct> => {
  const response = await fetchWithAuth(`/admin/featured-products/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  return response;
};

export const deleteFeaturedProduct = async (
  id: string,
): Promise<{ success: boolean; message: string }> => {
  const response = await fetchWithAuth(`/admin/featured-products/${id}`, {
    method: "DELETE",
  });
  return response;
};

export const toggleFeaturedProductStatus = async (
  id: string,
): Promise<FeaturedProduct> => {
  const response = await fetchWithAuth(
    `/admin/featured-products/${id}/toggle-status`,
    {
      method: "PATCH",
    },
  );
  return response;
};

export const updateFeaturedProductOrder = async (
  items: Array<{ id: string; sort_order: number }>,
): Promise<{ success: boolean; message: string }> => {
  const response = await fetchWithAuth(
    "/admin/featured-products/update-order",
    {
      method: "POST",
      body: JSON.stringify({ items }),
    },
  );
  return response;
};

export const fetchProductOptions = async (
  search?: string,
): Promise<ProductOption[]> => {
  const queryParams = new URLSearchParams();
  if (search) queryParams.append("search", search);

  const response = await fetchWithAuth(
    `/admin/featured-products/product-options?${queryParams}`,
  );
  return response;
};
