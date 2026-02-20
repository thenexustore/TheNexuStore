export { adminLogin, type LoginResponse } from "./auth";

export {
  fetchProducts,
  fetchProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  updateProductStatus,
  type Product,
  type ProductsResponse,
} from "./products";

export { fetchBrands, createBrand, type Brand } from "./brands";

export { fetchCategories, createCategory, type Category } from "./categories";

export { fetchOrders, type Order, type OrdersResponse } from "./orders";

export { fetchDashboardStats, type DashboardStats } from "./dashboard";

export { adminLogout } from "../utils";

export {
  fetchFeaturedProducts,
  fetchFeaturedProductById,
  createFeaturedProduct,
  updateFeaturedProduct,
  deleteFeaturedProduct,
  toggleFeaturedProductStatus,
  updateFeaturedProductOrder,
  fetchProductOptions,
  type FeaturedProduct,
  type FeaturedProductsResponse,
  type CreateFeaturedProductDto,
  type UpdateFeaturedProductDto,
  type ProductOption,
} from "./featured-products";
