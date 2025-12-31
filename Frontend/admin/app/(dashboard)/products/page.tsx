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
  Tag,
  Star,
  Layers,
  Hash,
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
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const data = await fetchProducts(
        page,
        20,
        search,
        statusFilter,
        categoryFilter
      );

      setProducts(data.products);
      setTotalPages(data.totalPages);
    } catch (error) {
      console.error("Failed to load products:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, [page, search, statusFilter, categoryFilter]);

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
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Products
          </h1>
          <p className="text-slate-500 text-sm">
            Manage inventory, pricing, and visibility.
          </p>
        </div>
        <button
          onClick={() => router.push("/products/new")}
          className="inline-flex items-center justify-center px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-all shadow-sm active:scale-95"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Product
        </button>
      </div>

      <div className="grid grid-cols-1 md:flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 outline-none transition-all text-sm"
          />
        </div>
        <input
          type="text"
          placeholder="Category filter..."
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-600"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-600 cursor-pointer"
        >
          <option value="all">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="DRAFT">Draft</option>
          <option value="ARCHIVED">Archived</option>
        </select>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-200">
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                  Product
                </th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                  SKU & Inventory
                </th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                  Category
                </th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                  Status
                </th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                  Price
                </th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={6} className="px-6 py-4">
                        <div className="h-10 bg-slate-100 rounded-lg w-full" />
                      </td>
                    </tr>
                  ))
                : products.map((product:any) => (
                    <tr
                      key={product.id}
                      className="group hover:bg-slate-50/50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900 text-sm group-hover:text-blue-600 transition-colors">
                              {product.title}
                            </span>
                            {product.featured_product && (
                              <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
                            <Hash className="w-3 h-3" />
                            <span className="font-mono">
                              {product.sku_code}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                                stockStatusStyles[product.stock_status]
                              }`}
                            >
                              {product.stock_status}
                            </span>
                            <span className="text-sm font-medium text-slate-900">
                              {product.stock_quantity} units
                            </span>
                          </div>
                          {product.variants.length > 0 && (
                            <div className="flex items-center gap-1 text-xs text-slate-400">
                              <Layers className="w-3 h-3" />
                              <span>{product.variants.length} variants</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1.5">
                          {product.category && (
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[11px] font-bold uppercase">
                              {product.category}
                            </span>
                          )}

                          {product.categories.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {product.categories.slice(0, 2).map((cat:any) => (
                                <span
                                  key={`${product.id}-${cat}`}
                                  className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px] font-medium"
                                >
                                  {cat}
                                </span>
                              ))}

                              {product.categories.length > 2 && (
                                <span className="px-1.5 py-0.5 bg-slate-100 text-slate-400 rounded text-[10px] font-medium">
                                  +{product.categories.length - 2}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <select
                          value={product.product_status}
                          onChange={(e) =>
                            handleStatusChange(product.id, e.target.value)
                          }
                          className={`text-[11px] font-bold px-2.5 py-1 rounded-full border outline-none transition-all cursor-pointer ${
                            statusStyles[product.product_status]
                          }`}
                        >
                          <option value="ACTIVE">ACTIVE</option>
                          <option value="DRAFT">DRAFT</option>
                          <option value="ARCHIVED">ARCHIVED</option>
                        </select>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-slate-900">
                            ₹{product.price.toLocaleString()}
                          </span>
                          {product.discount_price && (
                            <span className="text-xs text-slate-400 line-through">
                              ₹{product.discount_price.toLocaleString()}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() =>
                              router.push(`/products/${product.id}`)
                            }
                            className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() =>
                              router.push(`/products/${product.id}/edit`)
                            }
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(product.id)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
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

        {!loading && products.length === 0 && (
          <div className="py-20 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-slate-50 text-slate-400 rounded-full mb-4">
              <Package className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">
              No products found
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Try adjusting your filters or search terms.
            </p>
          </div>
        )}

        <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-tight">
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 text-xs font-bold bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-all"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 text-xs font-bold bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-all"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
