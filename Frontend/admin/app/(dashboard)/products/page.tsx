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
  type Product,
} from "@/lib/api";

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

  const runSync = async () => {
    try {
      setSyncing(true);
      const res = await fetch("http://localhost:4000/admin/infortisa/sync", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error("Sync failed");
      }
      const data = await res.json();
      alert(`Synced products`);
      loadProducts();
    } catch (err) {
      alert("Infortisa sync failed");
    } finally {
      setSyncing(false);
    }
  };

  const runFullSync = async () => {
    try {
      setSyncing(true);
      const res = await fetch(
        "http://localhost:4000/admin/infortisa/sync/full",
        {
          method: "POST",
          credentials: "include",
        },
      );
      if (!res.ok) throw new Error("Full sync failed");
      const data = await res.json();
      alert(`Full sync initiated: ${data.message}`);
      loadProducts();
    } catch (err) {
      alert("Full sync failed");
    } finally {
      setSyncing(false);
    }
  };

  const runStockSync = async () => {
    try {
      setSyncing(true);
      const res = await fetch(
        "http://localhost:4000/admin/infortisa/sync/stock",
        {
          method: "POST",
          credentials: "include",
        },
      );
      if (!res.ok) throw new Error("Stock sync failed");
      const data = await res.json();
      alert(`Stock sync initiated: ${data.message}`);
      loadProducts();
    } catch (err) {
      alert("Stock sync failed");
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
    setTotalPages(Math.ceil(filtered.length / 20));
  };

  useEffect(() => {
    filterProducts();
  }, [stockFilter, allProducts]);

  useEffect(() => {
    loadProducts();
  }, [page, search, statusFilter, categoryFilter]);

  const getPaginatedProducts = () => {
    const startIndex = (page - 1) * 20;
    const endIndex = startIndex + 20;
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
          <div className="flex items-center gap-1">
            <button
              onClick={runFullSync}
              disabled={syncing}
              className="px-3 py-1.5 bg-gray-800 hover:bg-gray-900 text-white text-xs font-medium rounded transition-colors disabled:opacity-50"
            >
              Full Sync
            </button>
            <button
              onClick={runStockSync}
              disabled={syncing}
              className="px-3 py-1.5 bg-gray-800 hover:bg-gray-900 text-white text-xs font-medium rounded transition-colors disabled:opacity-50"
            >
              Stock Sync
            </button>
          </div>

          <button
            onClick={runSync}
            disabled={syncing}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${syncing ? "animate-spin" : ""}`} />
            Sync All
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
                            <span className="text-gray-900">
                              {product.stock_quantity}
                            </span>
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
                            €{product.price.toLocaleString()}
                          </span>
                          {product.discount_price && (
                            <span className="text-xs text-gray-400 line-through">
                              €{product.discount_price.toLocaleString()}
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
