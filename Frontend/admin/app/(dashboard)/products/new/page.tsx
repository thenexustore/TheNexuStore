"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Upload, X, Plus } from "lucide-react";
import {
  fetchBrands,
  fetchCategories,
  createBrand,
  createCategory,
  createProduct,
} from "@/lib/api";

export default function NewProductPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [brands, setBrands] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [showNewBrand, setShowNewBrand] = useState(false);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newBrandName, setNewBrandName] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");

  const [form, setForm] = useState({
    title: "",
    description: "",
    brandId: "",
    price: 0,
    comparePrice: 0,
    stock: 0,
    status: "DRAFT",
    categories: [] as string[],
    images: [] as string[],
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [brandsData, categoriesData] = await Promise.all([
      fetchBrands(),
      fetchCategories(),
    ]);
    setBrands(brandsData);
    setCategories(categoriesData);
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
      setShowNewBrand(false);
    } catch (error: any) {
      alert(error.message || "Failed to add brand");
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
      setShowNewCategory(false);
    } catch (error: any) {
      alert(error.message || "Failed to add category");
    }
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

    setLoading(true);
    try {
      await createProduct({
        title: form.title,
        brandId: form.brandId,
        description_html: form.description,
        short_description: form.description.slice(0, 200),
        sale_price: form.price,
        compare_at_price: form.comparePrice || undefined,
        qty_on_hand: form.stock,
        status: form.status,
        categories: form.categories,
        images_base64: form.images,
      });
      router.push("/products");
    } catch (error: any) {
      alert(error.message || "Failed to create product");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <button
          onClick={() => router.push("/products")}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-800 mb-4"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Products
        </button>
        <h1 className="text-2xl font-bold text-slate-900">
          Create New Product
        </h1>
        <p className="text-slate-600 mt-1">Add a new product to your catalog</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
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

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-slate-700">
              Brand *
            </label>
            <button
              type="button"
              onClick={() => setShowNewBrand(true)}
              className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              Add New Brand
            </button>
          </div>

          {showNewBrand ? (
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={newBrandName}
                onChange={(e) => setNewBrandName(e.target.value)}
                placeholder="Enter brand name"
                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg"
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
                onClick={() => setShowNewBrand(false)}
                className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          ) : null}

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
        </div>

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
              className="w-full px-4 py-3 border border-slate-300 rounded-lg"
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
              className="w-full px-4 py-3 border border-slate-300 rounded-lg"
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
              className="w-full px-4 py-3 border border-slate-300 rounded-lg"
              min="0"
              required
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-medium text-slate-700">
              Categories
            </label>
            <button
              type="button"
              onClick={() => setShowNewCategory(true)}
              className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              Add New Category
            </button>
          </div>

          {showNewCategory && (
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Enter category name"
                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg"
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
                onClick={() => setShowNewCategory(false)}
                className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <label
                key={cat.id}
                className="flex items-center gap-2 bg-slate-100 px-3 py-2 rounded-lg cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={form.categories.includes(cat.id)}
                  onChange={(e) => {
                    const newCats = e.target.checked
                      ? [...form.categories, cat.id]
                      : form.categories.filter((id) => id !== cat.id);
                    setForm((prev) => ({ ...prev, categories: newCats }));
                  }}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-slate-700">{cat.name}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Product Images
          </label>
          <label className="block border-2 border-dashed border-slate-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 transition-colors">
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            <Upload className="w-10 h-10 text-slate-400 mx-auto mb-3" />
            <div className="text-slate-600 font-medium">
              Click to upload images
            </div>
            <div className="text-sm text-slate-500 mt-1">
              PNG, JPG, GIF up to 1MB
            </div>
          </label>

          {form.images.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
              {form.images.map((img, index) => (
                <div key={index} className="relative group">
                  <img
                    src={img}
                    alt={`Product image ${index + 1}`}
                    className="h-32 w-full object-cover rounded-lg border"
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
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Description
          </label>
          <textarea
            value={form.description}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, description: e.target.value }))
            }
            placeholder="Enter product description..."
            className="w-full px-4 py-3 border border-slate-300 rounded-lg h-40"
            rows={6}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Status
          </label>
          <select
            value={form.status}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, status: e.target.value as any }))
            }
            className="w-full px-4 py-3 border border-slate-300 rounded-lg"
          >
            <option value="DRAFT">Draft</option>
            <option value="ACTIVE">Active</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </div>

        <div className="flex gap-3 pt-6 border-t">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create Product"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/products")}
            className="px-6 py-3 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
