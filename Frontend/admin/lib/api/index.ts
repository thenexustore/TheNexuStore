export { adminLogin, updateAdminCredentials, type LoginResponse } from "./auth";

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

export {
  fetchOrders,
  fetchOrderById,
  fetchOrderTimeline,
  addOrderNote,
  type Order,
  type OrderDetail,
  type OrderTimelineEntry,
  type OrdersResponse,
} from "./orders";

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
  fetchShippingRules,
  updateShippingRules,
  fetchTaxZones,
  updateTaxZones,
  type ShippingZone,
  type ShippingRule,
  type TaxZone,
} from "./shipping-tax";

export {
  fetchImportConfig,
  fetchImportHistory,
  fetchImportRun,
  fetchImportRunErrors,
  fetchImportRuns,
  fetchProviderStats,
  retryImport,
  testImportConnection,
  triggerImport,
  updateImportConfig,
  type ImportConfigResponse,
  type ImportConnectionTestResponse,
  type ImportHistoryItem,
  type ImportHistoryResponse,
  type ImportRun,
  type ImportRunError,
  type ProviderStatsResponse,
  type UpdateImportConfigInput,
} from "./imports";

export {
  fetchRmas,
  fetchRmaById,
  updateRmaStatus,
  type Rma,
  type RmaStatus,
} from "./rmas";
