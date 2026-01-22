"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  ChevronUp,
  ChevronDown,
  Loader2,
} from "lucide-react";
import {
  fetchFeaturedProducts,
  deleteFeaturedProduct,
  toggleFeaturedProductStatus,
  updateFeaturedProductOrder,
  type FeaturedProduct,
} from "@/lib/api";

export default function FeaturedProductsPage() {
  const router = useRouter();
  const [featuredProducts, setFeaturedProducts] = useState<FeaturedProduct[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isActiveFilter, setIsActiveFilter] = useState<string>("");
  const [total, setTotal] = useState(0);
  const [skip, setSkip] = useState(0);
  const [take] = useState(20);
  const [reordering, setReordering] = useState(false);

  const loadFeaturedProducts = async () => {
    try {
      setLoading(true);
      const response = await fetchFeaturedProducts({
        skip,
        take,
        is_active:
          isActiveFilter === "" ? undefined : isActiveFilter === "true",
        search: search || undefined,
      });
      setFeaturedProducts(response.data);
      setTotal(response.meta.total);
    } catch (error) {
      console.error("Error loading featured products:", error);
      alert("Failed to load featured products");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFeaturedProducts();
  }, [skip, take, isActiveFilter]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (skip === 0) {
        loadFeaturedProducts();
      } else {
        setSkip(0);
      }
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [search]);

  const handleToggleStatus = async (id: string) => {
    try {
      await toggleFeaturedProductStatus(id);
      loadFeaturedProducts();
    } catch (error) {
      console.error("Error toggling status:", error);
      alert("Failed to toggle status");
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this featured product?")) {
      try {
        await deleteFeaturedProduct(id);
        loadFeaturedProducts();
      } catch (error) {
        console.error("Error deleting featured product:", error);
        alert("Failed to delete featured product");
      }
    }
  };

  const handleReorder = async (direction: "up" | "down", index: number) => {
    if (reordering) return;

    const items = [...featuredProducts];
    const item = items[index];
    const swapIndex = direction === "up" ? index - 1 : index + 1;

    if (swapIndex < 0 || swapIndex >= items.length) return;

    setReordering(true);
    const swapItem = items[swapIndex];

    const tempOrder = item.sort_order;
    item.sort_order = swapItem.sort_order;
    swapItem.sort_order = tempOrder;

    try {
      await updateFeaturedProductOrder([
        { id: item.id, sort_order: item.sort_order },
        { id: swapItem.id, sort_order: swapItem.sort_order },
      ]);

      items[index] = swapItem;
      items[swapIndex] = item;
      setFeaturedProducts([...items]);
    } catch (error) {
      console.error("Error reordering:", error);
      alert("Failed to reorder featured products");
    } finally {
      setReordering(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Featured Products
          </h1>
          <p className="text-gray-600">
            Manage featured products displayed on the homepage
          </p>
        </div>
        <button
          onClick={() => router.push("/featured-products/new")}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          <Plus className="w-4 h-4" />
          Add Featured Product
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <select
            value={isActiveFilter}
            onChange={(e) => setIsActiveFilter(e.target.value)}
            className="border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Status</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>

          <button
            onClick={() => {
              setSearch("");
              setIsActiveFilter("");
            }}
            className="flex items-center justify-center gap-2 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition"
          >
            <Filter className="w-4 h-4" />
            Clear Filters
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Total Featured</p>
          <p className="text-2xl font-bold">{total}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Active</p>
          <p className="text-2xl font-bold text-green-600">
            {featuredProducts.filter((p) => p.is_active).length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Inactive</p>
          <p className="text-2xl font-bold text-red-600">
            {featuredProducts.filter((p) => !p.is_active).length}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
            <p className="mt-2 text-gray-600">Loading featured products...</p>
          </div>
        ) : featuredProducts.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-gray-500 mb-4">
              <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Search className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-lg font-medium text-gray-900">
                No featured products found
              </p>
              <p className="text-gray-600">
                {search || isActiveFilter
                  ? "Try changing your filters"
                  : "Add your first featured product!"}
              </p>
            </div>
            {!search && !isActiveFilter && (
              <button
                onClick={() => router.push("/featured-products/new")}
                className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
              >
                <Plus className="w-4 h-4" />
                Add Featured Product
              </button>
            )}
          </div>
        ) : (
          <>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sort
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Custom Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Order
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {featuredProducts.map((item, index) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        {index > 0 && (
                          <button
                            onClick={() => handleReorder("up", index)}
                            disabled={reordering}
                            className="p-1 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Move up"
                          >
                            <ChevronUp className="w-4 h-4" />
                          </button>
                        )}
                        {index < featuredProducts.length - 1 && (
                          <button
                            onClick={() => handleReorder("down", index)}
                            disabled={reordering}
                            className="p-1 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Move down"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="h-10 w-10 flex-shrink-0">
                          <img
                            className="h-10 w-10 rounded-md object-cover"
                            src={
                              item.image_url ||
                              item.product.skus?.[0]?.image_url ||
                              "/No_Image_Available.png"
                            }
                            alt={item.product.title}
                          />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {item.product.title}
                          </div>
                          <div className="text-sm text-gray-500">
                            SKU: {item.product.skus[0]?.sku_code || "N/A"}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{item.title}</div>
                      {item.subtitle && (
                        <div className="text-sm text-gray-500">
                          {item.subtitle}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                          item.is_active
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {item.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {item.sort_order}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleStatus(item.id)}
                          className="text-gray-600 hover:text-gray-900"
                          title={item.is_active ? "Deactivate" : "Activate"}
                        >
                          {item.is_active ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() =>
                            router.push(`/featured-products/${item.id}/edit`)
                          }
                          className="text-blue-600 hover:text-blue-900"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="text-red-600 hover:text-red-900"
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

            {total > take && (
              <div className="px-6 py-4 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-700">
                    Showing <span className="font-medium">{skip + 1}</span> to{" "}
                    <span className="font-medium">
                      {Math.min(skip + take, total)}
                    </span>{" "}
                    of <span className="font-medium">{total}</span> results
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSkip(Math.max(0, skip - take))}
                      disabled={skip === 0}
                      className="px-3 py-1 border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setSkip(skip + take)}
                      disabled={skip + take >= total}
                      className="px-3 py-1 border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
