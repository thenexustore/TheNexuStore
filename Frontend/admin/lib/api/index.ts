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

// Brands exports
export { fetchBrands, createBrand, type Brand } from "./brands";


export { fetchCategories, createCategory, type Category } from "./categories";

export { fetchOrders, type Order, type OrdersResponse } from "./orders";

export { fetchDashboardStats, type DashboardStats } from "./dashboard";

export { adminLogout } from "../utils";