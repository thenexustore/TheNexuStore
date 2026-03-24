"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Check, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import {
  fetchFeaturedProductById,
  updateFeaturedProduct,
  fetchProductOptions,
  type UpdateFeaturedProductDto,
  type ProductOption,
} from "@/lib/api";

export default function EditFeaturedProductPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchingProducts, setSearchingProducts] = useState(false);
  const [productOptions, setProductOptions] = useState<ProductOption[]>([]);
  const [showProductDropdown, setShowProductDropdown] = useState(false);

  const [formData, setFormData] = useState<UpdateFeaturedProductDto>({
    product_id: "",
    is_active: true,
    layout_type: "default",
    button_text: "Shop Now",
    badge_color: "bg-blue-500",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadFeaturedProduct();
    loadInitialProductOptions();
  }, [id]);

  const loadFeaturedProduct = async () => {
    try {
      setLoading(true);
      const result: any = await fetchFeaturedProductById(id);
      const data = result.data;

      setFormData({
        product_id: data.product_id,
        title: data.title,
        subtitle: data.subtitle || undefined,
        description: data.description || undefined,
        image_url: data.image_url || undefined,
        badge_text: data.badge_text || undefined,
        badge_color: data.badge_color || "bg-blue-500",
        button_text: data.button_text || "Shop Now",
        button_link: data.button_link || undefined,
        layout_type: data.layout_type || "default",
        sort_order: data.sort_order,
        is_active: data.is_active,
      });

      setProductOptions((prev) => {
        const exists = prev.find((p) => p.id === data.product_id);
        if (!exists && data.product) {
          return [
            ...prev,
            {
              id: data.product_id,
              title: data.product.title,
              sku: data.product.skus[0]?.sku_code || "",
              brand: data.product.brand.name,
              category: data.product.main_category?.name,
              price: data.product.skus[0]?.prices[0]?.sale_price || "0",
              image: data.image_url || "/No_Image_Available.png",
            },
          ];
        }
        return prev;
      });
    } catch (error) {
      console.error("Error loading featured product:", error);
      alert("Failed to load featured product. Redirecting to list page.");
      router.push("/featured-products");
    } finally {
      setLoading(false);
    }
  };

  const loadInitialProductOptions = async () => {
    try {
      const result : any  = await fetchProductOptions();
      setProductOptions(result.data || []);
    } catch (error) {
      console.error("Error loading product options:", error);
      setProductOptions([]);
    }
  };

  const loadProductOptions = async (search?: string) => {
    try {
      setSearchingProducts(true);
      const result: any  = await fetchProductOptions(search);
      setProductOptions(result.data || []);
    } catch (error) {
      console.error("Error loading product options:", error);
      setProductOptions([]);
    } finally {
      setSearchingProducts(false);
    }
  };

  const handleProductSearch = (search: string) => {
    if (search.length > 2) {
      loadProductOptions(search);
      setShowProductDropdown(true);
    }
  };

  const handleSelectProduct = (product: ProductOption) => {
    setFormData({
      ...formData,
      product_id: product.id,
      title: formData.title || product.title,
      image_url: formData.image_url || product.image,
    });
    setShowProductDropdown(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const newErrors: Record<string, string> = {};
    if (!formData.product_id) {
      newErrors.product_id = "Please select a product";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      setSaving(true);
      await updateFeaturedProduct(id, formData);
      alert("Featured product updated successfully!");
      router.push("/featured-products");
    } catch (error: any) {
      console.error("Error updating featured product:", error);
      alert(error.message || "Failed to update featured product");
    } finally {
      setSaving(false);
    }
  };

  const selectedProduct = Array.isArray(productOptions)
    ? productOptions.find((p) => p.id === formData.product_id)
    : undefined;

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-center items-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <button
          onClick={() => router.push("/featured-products")}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Featured Products
        </button>
        <h1 className="text-2xl font-bold text-gray-900">
          Edit Featured Product
        </h1>
        <p className="text-gray-600">Update featured product details</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Product Selection
          </h2>

          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Product *
            </label>
            <input
              type="text"
              placeholder="Type to search products..."
              onChange={(e) => handleProductSearch(e.target.value)}
              className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />

            {showProductDropdown && (
              <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-auto">
                {searchingProducts ? (
                  <div className="p-4 text-center">
                    <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                  </div>
                ) : productOptions.length === 0 ? (
                  <div className="p-4 text-gray-500">No products found</div>
                ) : (
                  productOptions.map((product) => (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => handleSelectProduct(product)}
                      className="w-full text-left p-3 hover:bg-gray-50 flex items-center gap-3"
                    >
                      <img
                        src={product.image || "/No_Image_Available.png"}
                        alt={product.title}
                        className="w-10 h-10 rounded object-cover"
                      />
                      <div className="flex-1">
                        <div className="font-medium">{product.title}</div>
                        <div className="text-sm text-gray-500">
                          SKU: {product.sku} | Brand: {product.brand} | {formatCurrency(Number(product.price || 0))}
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}

            {errors.product_id && (
              <p className="mt-1 text-sm text-red-600">{errors.product_id}</p>
            )}

            {selectedProduct && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <img
                    src={selectedProduct.image || "/No_Image_Available.png"}
                    alt={selectedProduct.title}
                    className="w-12 h-12 rounded object-cover"
                  />
                  <div>
                    <div className="font-medium">{selectedProduct.title}</div>
                    <div className="text-sm text-gray-600">
                      SKU: {selectedProduct.sku} | Brand:{" "}
                      {selectedProduct.brand}
                    </div>
                  </div>
                  <Check className="w-5 h-5 text-green-600 ml-auto" />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Customization
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Custom Title
              </label>
              <input
                type="text"
                value={formData.title || ""}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder="Custom title (optional)"
                className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subtitle
              </label>
              <input
                type="text"
                value={formData.subtitle || ""}
                onChange={(e) =>
                  setFormData({ ...formData, subtitle: e.target.value })
                }
                placeholder="Subtitle (optional)"
                className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Badge Text
              </label>
              <input
                type="text"
                value={formData.badge_text || ""}
                onChange={(e) =>
                  setFormData({ ...formData, badge_text: e.target.value })
                }
                placeholder="e.g., New, Popular, Sale"
                className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Badge Color
              </label>
              <select
                value={formData.badge_color || "bg-blue-500"}
                onChange={(e) =>
                  setFormData({ ...formData, badge_color: e.target.value })
                }
                className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="bg-slate-500">Slate</option>
                <option value="bg-gray-500">Gray</option>
                <option value="bg-zinc-500">Zinc</option>
                <option value="bg-neutral-500">Neutral</option>
                <option value="bg-stone-500">Stone</option>

                <option value="bg-red-500">Red</option>
                <option value="bg-orange-500">Orange</option>
                <option value="bg-amber-500">Amber</option>
                <option value="bg-yellow-500">Yellow</option>
                <option value="bg-lime-500">Lime</option>
                <option value="bg-green-500">Green</option>
                <option value="bg-emerald-500">Emerald</option>
                <option value="bg-teal-500">Teal</option>
                <option value="bg-cyan-500">Cyan</option>
                <option value="bg-sky-500">Sky</option>
                <option value="bg-blue-500">Blue</option>
                <option value="bg-indigo-500">Indigo</option>
                <option value="bg-violet-500">Violet</option>
                <option value="bg-purple-500">Purple</option>
                <option value="bg-fuchsia-500">Fuchsia</option>
                <option value="bg-pink-500">Pink</option>
                <option value="bg-rose-500">Rose</option>

                <option value="bg-black">Black</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Button Text
              </label>
              <input
                type="text"
                value={formData.button_text || "Shop Now"}
                onChange={(e) =>
                  setFormData({ ...formData, button_text: e.target.value })
                }
                className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Button Link
              </label>
              <input
                type="text"
                value={formData.button_link || ""}
                onChange={(e) =>
                  setFormData({ ...formData, button_link: e.target.value })
                }
                placeholder="Leave empty for product page"
                className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={formData.description || ""}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Custom description (optional)"
                rows={3}
                className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Custom Image URL
              </label>
              <input
                type="text"
                value={formData.image_url || ""}
                onChange={(e) =>
                  setFormData({ ...formData, image_url: e.target.value })
                }
                placeholder="Leave empty for product image"
                className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Layout Type
              </label>
              <select
                value={formData.layout_type || "default"}
                onChange={(e) =>
                  setFormData({ ...formData, layout_type: e.target.value })
                }
                className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="default">Default</option>
                <option value="compact">Compact</option>
                <option value="highlight">Highlight</option>
                <option value="minimal">Minimal</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sort Order
              </label>
              <input
                type="number"
                value={formData.sort_order || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    sort_order: parseInt(e.target.value) || undefined,
                  })
                }
                placeholder="Position in list"
                className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) =>
                  setFormData({ ...formData, is_active: e.target.checked })
                }
                className="h-4 w-4 text-blue-600 rounded"
              />
              <label htmlFor="is_active" className="ml-2 text-sm text-gray-700">
                Active (visible on homepage)
              </label>
            </div>
          </div>
        </div>

        {selectedProduct && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Preview
            </h2>
            <div className="border rounded-lg p-6">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="md:w-1/3">
                  <img
                    src={
                      formData.image_url ||
                      selectedProduct.image ||
                      "/No_Image_Available.png"
                    }
                    alt={formData.title || selectedProduct.title}
                    className="w-full h-48 object-cover rounded-lg"
                  />
                </div>
                <div className="md:w-2/3">
                  {formData.badge_text && (
                    <span
                      className={`inline-block ${formData.badge_color} text-white px-2 py-1 rounded text-xs font-semibold mb-2`}
                    >
                      {formData.badge_text}
                    </span>
                  )}
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    {formData.title || selectedProduct.title}
                  </h3>
                  {formData.subtitle && (
                    <p className="text-gray-600 mb-3">{formData.subtitle}</p>
                  )}
                  <p className="text-gray-700 mb-4">
                    {formData.description ||
                      "Product description will appear here..."}
                  </p>
                  <button
                    type="button"
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                  >
                    {formData.button_text || "Shop Now"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => router.push("/featured-products")}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Update Featured Product
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
