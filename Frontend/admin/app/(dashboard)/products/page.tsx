"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Eye,
  Package,
  Star,
  Layers,
  Hash,
  RefreshCw,
} from "lucide-react";
import {
  fetchProducts,
  deleteProduct,
  updateProductStatus,
  fetchImportHistory,
  triggerImport,
  type ImportHistoryItem,
  type Product,
} from "@/lib/api";
import { loadAdminSettings, subscribeAdminSettings } from "@/lib/admin-settings";


interface SavedProductView {
  name: string;
  search: string;
  statusFilter: string;
  categoryFilter: string;
  stockFilter: string;
}

const SAVED_VIEWS_KEY = "admin_products_saved_views_v1";

export default function ProductsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [stockFilter, setStockFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [syncing, setSyncing] = useState(false);
  const [importHistory, setImportHistory] = useState<ImportHistoryItem[]>([]);
  const [savedViews, setSavedViews] = useState<SavedProductView[]>([]);
  const [viewName, setViewName] = useState("");
  const [adminSettings, setAdminSettings] = useState(() => loadAdminSettings());

  useEffect(() => subscribeAdminSettings(setAdminSettings), []);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat(adminSettings.dateFormat, {
      style: "currency",
      currency: adminSettings.defaultCurrency,
    }).format(Number(amount || 0));

  const loadImportHistory = async () => {
    try {
      const data = await fetchImportHistory(1, 5);
      setImportHistory(data.items);
    } catch (error) {
      console.error("Failed to load import history:", error);
    }
  };

  const runImport = async (mode: "full" | "stock" | "images") => {
    try {
      setSyncing(true);
      await triggerImport(mode);
      alert(`${mode} import executed successfully`);
      await Promise.all([loadProducts(), loadImportHistory()]);
    } catch (err) {
      alert(`${mode} import failed`);
    } finally {
      setSyncing(false);
    }
  };

  const loadProducts = async () => {
    try {
      setLoading(true);
      const data = await fetchProducts(
        page,
        50,
        search,
        statusFilter,
        categoryFilter,
      );

      setAllProducts(data.products);
      filterProducts();
    } catch (error) {
      console.error("Failed to load products:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterProducts = () => {
    let filtered = [...allProducts];

    if (stockFilter !== "all") {
      filtered = filtered.filter((product: any) => {
        if (stockFilter === "IN_STOCK") {
          return product.stock_status === "IN_STOCK";
        } else if (stockFilter === "LOW_STOCK") {
          return product.stock_status === "LOW_STOCK";
        } else if (stockFilter === "OUT_OF_STOCK") {
          return product.stock_status === "OUT_OF_STOCK";
        }
        return true;
      });
    }

    setFilteredProducts(filtered);
    setTotalPages(Math.max(1, Math.ceil(filtered.length / adminSettings.productsPageSize)));
  };

  useEffect(() => {
    filterProducts();
  }, [adminSettings.productsPageSize, stockFilter, allProducts]);

  useEffect(() => {
    loadProducts();
  }, [page, search, statusFilter, categoryFilter]);

  useEffect(() => {
    loadImportHistory();
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SAVED_VIEWS_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setSavedViews(parsed as SavedProductView[]);
      }
    } catch (error) {
      console.error("Failed to load saved views", error);
    }
  }, []);

  const persistViews = (views: SavedProductView[]) => {
    setSavedViews(views);
    localStorage.setItem(SAVED_VIEWS_KEY, JSON.stringify(views));
  };

  const saveCurrentView = () => {
    const name = viewName.trim();
    if (!name) {
      alert("Please enter a view name");
      return;
    }

    const next = [
      ...savedViews.filter((v) => v.name.toLowerCase() !== name.toLowerCase()),
      { name, search, statusFilter, categoryFilter, stockFilter },
    ];

    persistViews(next);
    setViewName("");
  };

  const applyView = (view: SavedProductView) => {
    setSearch(view.search);
    setStatusFilter(view.statusFilter);
    setCategoryFilter(view.categoryFilter);
    setStockFilter(view.stockFilter);
    setPage(1);
  };

  const deleteView = (name: string) => {
    const next = savedViews.filter((v) => v.name !== name);
    persistViews(next);
  };

  const getPaginatedProducts = () => {
    const startIndex = (page - 1) * adminSettings.productsPageSize;
    const endIndex = startIndex + adminSettings.productsPageSize;
    return filteredProducts.slice(startIndex, endIndex);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure?")) return;
    try {
      await deleteProduct(id);
      loadProducts();
    } catch (error) {
      console.error("Failed to delete product:", error);
      alert("Failed to delete product");
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      await updateProductStatus(id, newStatus);
      loadProducts();
    } catch (error) {
      console.error("Failed to update status:", error);
      alert("Failed: " + (error as Error).message);
    }
  };

  const statusStyles: Record<string, string> = {
    ACTIVE: "bg-emerald-50 text-emerald-700 border-emerald-100",
    DRAFT: "bg-amber-50 text-amber-700 border-amber-100",
    ARCHIVED: "bg-slate-100 text-slate-600 border-slate-200",
  };

  const stockStatusStyles: Record<string, string> = {
    IN_STOCK: "bg-emerald-50 text-emerald-700",
    OUT_OF_STOCK: "bg-red-50 text-red-700",
    LOW_STOCK: "bg-amber-50 text-amber-700",
    PREORDER: "bg-blue-50 text-blue-700",
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <p className="text-gray-500 text-sm">
            Manage inventory, pricing, and visibility.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => runImport("full")}
            disabled={syncing}
            className="px-3 py-1.5 bg-gray-800 hover:bg-gray-900 text-white text-xs font-medium rounded transition-colors disabled:opacity-50"
          >
            Full Import
          </button>
          <button
            onClick={() => runImport("stock")}
            disabled={syncing}
            className="px-3 py-1.5 bg-gray-800 hover:bg-gray-900 text-white text-xs font-medium rounded transition-colors disabled:opacity-50"
          >
            Stock Sync
          </button>
          <button
            onClick={() => runImport("images")}
            disabled={syncing}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${syncing ? "animate-spin" : ""}`} />
            Image Sync
          </button>

          <button
            onClick={() => router.push("/products/new")}
            className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded transition-colors"
          >
            <Plus className="w-3 h-3" />
            Add
          </button>
        </div>
      </div>


      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-900">Supplier import history</h2>
          <button
            onClick={loadImportHistory}
            className="text-xs text-gray-500 hover:text-gray-800"
          >
            Refresh
          </button>
        </div>
        {importHistory.length === 0 ? (
          <p className="text-xs text-gray-500">No recent imports.</p>
        ) : (
          <div className="space-y-2">
            {importHistory.map((item) => (
              <div key={item.id} className="text-xs text-gray-600 flex flex-wrap items-center justify-between gap-2 border border-gray-100 rounded px-3 py-2">
                <span className="font-medium text-gray-800">{item.type}</span>
                <span>{new Date(item.last_sync).toLocaleString()}</span>
                <span className="text-gray-500">{item.details || "-"}</span>
              </div>
            ))}
          </div>
        )}
      </div>


      <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 className="text-sm font-semibold text-gray-900">Saved views</h2>
          <div className="flex gap-2 w-full sm:w-auto">
            <input
              value={viewName}
              onChange={(e) => setViewName(e.target.value)}
              placeholder="View name..."
              className="w-full sm:w-56 px-3 py-1.5 text-xs border border-gray-300 rounded"
            />
            <button
              onClick={saveCurrentView}
              className="px-3 py-1.5 text-xs rounded bg-gray-900 text-white"
            >
              Save view
            </button>
          </div>
        </div>

        {savedViews.length === 0 ? (
          <p className="text-xs text-gray-500">No saved views yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {savedViews.map((view) => (
              <div key={view.name} className="inline-flex items-center gap-1 border border-gray-200 rounded-full pl-3 pr-1 py-1 bg-gray-50">
                <button
                  onClick={() => applyView(view)}
                  className="text-xs text-gray-700 hover:text-black"
                >
                  {view.name}
                </button>
                <button
                  onClick={() => deleteView(view.name)}
                  className="w-5 h-5 rounded-full text-[10px] text-gray-500 hover:bg-red-100 hover:text-red-700"
                  title="Delete view"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
        <div className="md:col-span-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-3 py-2 bg-white border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
        </div>
        <div>
          <input
            type="text"
            placeholder="Category..."
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-gray-300 rounded text-sm focus:border-blue-500 outline-none"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-gray-300 rounded text-xs focus:border-blue-500 outline-none"
          >
            <option value="all">Status</option>
            <option value="ACTIVE">Active</option>
            <option value="DRAFT">Draft</option>
            <option value="ARCHIVED">Archived</option>
          </select>
          <select
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-gray-300 rounded text-xs focus:border-blue-500 outline-none"
          >
            <option value="all">Stock</option>
            <option value="IN_STOCK">In Stock</option>
            <option value="LOW_STOCK">Low Stock</option>
            <option value="OUT_OF_STOCK">Out of Stock</option>
          </select>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Product
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  SKU & Inventory
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Category
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Price
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={6} className="px-4 py-4">
                        <div className="h-8 bg-gray-100 rounded w-full" />
                      </td>
                    </tr>
                  ))
                : getPaginatedProducts().map((product: any) => (
                    <tr key={product.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1">
                            <span className="font-medium text-gray-900">
                              {product.title}
                            </span>
                            {product.featured_product && (
                              <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                            <Hash className="w-3 h-3" />
                            <span className="font-mono">
                              {product.sku_code}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-xs px-2 py-0.5 rounded ${
                                stockStatusStyles[product.stock_status]
                              }`}
                            >
                              {product.stock_status}
                            </span>
                            <span className="text-gray-900">{product.stock_quantity}</span>
                            {Number(product.stock_quantity || 0) <= adminSettings.lowStockThreshold && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">
                                ≤ {adminSettings.lowStockThreshold}
                              </span>
                            )}
                          </div>
                          {product.variants.length > 0 && (
                            <div className="flex items-center gap-1 text-xs text-gray-400">
                              <Layers className="w-3 h-3" />
                              <span>{product.variants.length} variants</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          {product.category && (
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[11px]">
                              {product.category}
                            </span>
                          )}
                          {product.categories.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {product.categories
                                .slice(0, 2)
                                .map((cat: any) => (
                                  <span
                                    key={`${product.id}-${cat}`}
                                    className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px]"
                                  >
                                    {cat}
                                  </span>
                                ))}
                              {product.categories.length > 2 && (
                                <span className="px-1.5 py-0.5 bg-gray-100 text-gray-400 rounded text-[10px]">
                                  +{product.categories.length - 2}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={product.product_status}
                          onChange={(e) =>
                            handleStatusChange(product.id, e.target.value)
                          }
                          className={`text-[11px] px-2 py-1 rounded border outline-none cursor-pointer ${
                            statusStyles[product.product_status]
                          }`}
                        >
                          <option value="ACTIVE">ACTIVE</option>
                          <option value="DRAFT">DRAFT</option>
                          <option value="ARCHIVED">ARCHIVED</option>
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-900">
                            {formatCurrency(product.price)}
                          </span>
                          {product.discount_price && (
                            <span className="text-xs text-gray-400 line-through">
                              {formatCurrency(product.discount_price)}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() =>
                              router.push(`/products/${product.id}`)
                            }
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="View"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() =>
                              router.push(`/products/${product.id}/edit`)
                            }
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(product.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
        {!loading && getPaginatedProducts().length === 0 && (
          <div className="py-12 text-center">
            <div className="inline-flex items-center justify-center w-10 h-10 bg-gray-100 text-gray-400 rounded-full mb-3">
              <Package className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-medium text-gray-900">
              No products found
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Try adjusting your filters or search terms.
            </p>
          </div>
        )}
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
          <span className="text-xs text-gray-500">
            Page {page} of {totalPages} ({filteredProducts.length} products)
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
