"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Plus, X } from "lucide-react";
import {
  fetchProductById,
  updateProduct,
  fetchBrands,
  fetchCategories,
  createBrand,
  createCategory,
} from "@/lib/api";

export default function ProductEditPage() {
  const { id } = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  const [form, setForm] = useState({
    title: "",
    description: "",
    brandId: "",
    price: 0,
    comparePrice: 0,
    stock: 0,
    categories: [] as string[],
    images: [] as string[],
  });

  const [brands, setBrands] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [showAddBrand, setShowAddBrand] = useState(false);
  const [newBrandName, setNewBrandName] = useState("");
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const [productData, brandsData, categoriesData] = await Promise.all([
        fetchProductById(id as string),
        fetchBrands(),
        fetchCategories(),
      ]);

      setBrands(brandsData);
      setCategories(categoriesData);
      const product = productData as any;

      const sku = product.skus?.[0];
      setForm({
        title: product.title || "",
        description: product.description_html || "",
        brandId: product.brand_id || "",
        price: sku?.price?.sale_price || 0,
        comparePrice: sku?.price?.compare_at_price || 0,
        stock: sku?.inventory?.qty_on_hand || 0,
        categories: product.categories?.map((c: any) => c.id) || [],
        images: product.media?.map((m: any) => m.url) || [],
      });
    } catch (error) {
      console.error("Error loading data:", error);
      alert("Failed to load product data");
    } finally {
      setLoadingData(false);
    }
  };

  const handleAddBrand = async () => {
    if (!newBrandName.trim()) {
      alert("Brand name is required");
      return;
    }

    try {
      const newBrand = await createBrand({ name: newBrandName });
      setBrands((prev) => [...prev, newBrand]);
      setForm((prev) => ({ ...prev, brandId: newBrand.id }));
      setNewBrandName("");
      setShowAddBrand(false);
    } catch (error) {
      console.error("Failed to add brand:", error);
      alert("Failed to add brand");
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      alert("Category name is required");
      return;
    }

    try {
      const newCategory = await createCategory({ name: newCategoryName });
      setCategories((prev) => [...prev, newCategory]);
      setForm((prev) => ({
        ...prev,
        categories: [...prev.categories, newCategory.id],
      }));
      setNewCategoryName("");
      setShowAddCategory(false);
    } catch (error) {
      console.error("Failed to add category:", error);
      alert("Failed to add category");
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newImages: string[] = [];
    for (const file of Array.from(files)) {
      if (file.size > 1024 * 1024) {
        alert("Image must be less than 1MB");
        continue;
      }
      const reader = new FileReader();
      reader.readAsDataURL(file);
      const result = await new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string);
      });
      newImages.push(result);
    }
    setForm((prev) => ({ ...prev, images: [...prev.images, ...newImages] }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.title.trim()) {
      alert("Product title is required");
      return;
    }

    if (!form.brandId) {
      alert("Please select a brand");
      return;
    }

    if (form.price <= 0) {
      alert("Price must be greater than 0");
      return;
    }

    if (form.stock < 0) {
      alert("Stock cannot be negative");
      return;
    }

    setLoading(true);
    try {
      await updateProduct(id as string, {
        title: form.title,
        brandId: form.brandId,
        description_html: form.description,
        sale_price: form.price,
        compare_at_price: form.comparePrice || null,
        qty_on_hand: form.stock,
        categories: form.categories,
        images_base64: form.images,
      });
      router.push(`/products/${id}`);
    } catch (error) {
      console.error("Update failed:", error);
      alert("Failed to update product");
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.push(`/products/${id}`)}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-800 mb-4"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Product
        </button>
        <h1 className="text-2xl font-bold text-slate-900">Edit Product</h1>
        <p className="text-slate-600 mt-1">Update product information</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Product Title */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Product Title *
          </label>
          <input
            type="text"
            value={form.title}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, title: e.target.value }))
            }
            placeholder="Enter product title"
            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        {/* Brand Selection with Add Button */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-slate-700">
              Brand *
            </label>
            <button
              type="button"
              onClick={() => setShowAddBrand(true)}
              className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              Add New Brand
            </button>
          </div>

          {showAddBrand ? (
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={newBrandName}
                onChange={(e) => setNewBrandName(e.target.value)}
                placeholder="Enter new brand name"
                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
              <button
                type="button"
                onClick={handleAddBrand}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => setShowAddBrand(false)}
                className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          ) : (
            <select
              value={form.brandId}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, brandId: e.target.value }))
              }
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Select a brand</option>
              {brands.map((brand) => (
                <option key={brand.id} value={brand.id}>
                  {brand.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Price & Stock */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Sale Price (₹) *
            </label>
            <input
              type="number"
              value={form.price}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, price: Number(e.target.value) }))
              }
              placeholder="0.00"
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="0.01"
              step="0.01"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Compare Price (₹)
            </label>
            <input
              type="number"
              value={form.comparePrice || ""}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  comparePrice: Number(e.target.value) || 0,
                }))
              }
              placeholder="Optional"
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="0"
              step="0.01"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Stock Quantity *
            </label>
            <input
              type="number"
              value={form.stock}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, stock: Number(e.target.value) }))
              }
              placeholder="0"
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="0"
              required
            />
          </div>
        </div>

        {/* Categories with Add Button */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-medium text-slate-700">
              Categories
            </label>
            <button
              type="button"
              onClick={() => setShowAddCategory(true)}
              className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              Add New Category
            </button>
          </div>

          {showAddCategory && (
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Enter new category name"
                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
              <button
                type="button"
                onClick={handleAddCategory}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => setShowAddCategory(false)}
                className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="flex items-center gap-2 bg-slate-100 px-3 py-2 rounded-lg"
              >
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.categories.includes(cat.id)}
                    onChange={(e) => {
                      const newCats = e.target.checked
                        ? [...form.categories, cat.id]
                        : form.categories.filter((id) => id !== cat.id);
                      setForm((prev) => ({ ...prev, categories: newCats }));
                    }}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-slate-700">{cat.name}</span>
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Images */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-slate-700">
              Product Images
            </label>
            <label className="text-sm text-blue-600 hover:text-blue-700 cursor-pointer">
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              + Add Images
            </label>
          </div>

          <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center">
            {form.images.length === 0 ? (
              <div>
                <div className="text-slate-400 mb-3">
                  <svg
                    className="w-10 h-10 mx-auto"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <div className="text-slate-600 font-medium">
                  Drop images here or click to upload
                </div>
                <div className="text-sm text-slate-500 mt-1">
                  PNG, JPG, GIF up to 1MB
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {form.images.map((img, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={img}
                      alt={`Product image ${index + 1}`}
                      className="h-32 w-full object-cover rounded-lg border border-slate-200"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          images: prev.images.filter((_, i) => i !== index),
                        }))
                      }
                      className="absolute top-2 right-2 bg-red-500 text-white w-6 h-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                      aria-label="Remove image"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Product Description
          </label>
          <textarea
            value={form.description}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, description: e.target.value }))
            }
            placeholder="Enter detailed product description..."
            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-40"
            rows={6}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-6 border-t">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </button>

          <button
            type="button"
            onClick={() => router.push(`/products/${id}`)}
            className="px-6 py-3 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
