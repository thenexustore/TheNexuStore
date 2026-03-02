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

export {
  fetchCoupons,
  createCoupon,
  updateCoupon,
  disableCoupon,
  type Coupon,
  type CreateCouponInput,
  type UpdateCouponInput,
} from "./coupons";

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

export {
  fetchConversations,
  fetchConversation,
  sendAdminMessage,
  updateConversationStatus,
  type ChatConversation,
  type ChatMessage,
  type ChatStatus,
  type ConversationsResponse,
} from "./chat";

export {
  fetchShippingZones,
  updateShippingZones,
  fetchTaxZones,
  updateTaxZones,
  type ShippingZone,
  type TaxZone,
} from './shipping-tax';
