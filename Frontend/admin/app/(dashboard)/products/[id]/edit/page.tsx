"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Plus,
  X,
  Trash2,
  Box,
  Image as ImageIcon,
} from "lucide-react";
import {
  fetchProductById,
  updateProduct,
  fetchBrands,
  fetchCategories,
  createBrand,
  createCategory,
  type Product,
} from "@/lib/api";

type FormAttribute = {
  key: string;
  value: string;
};

type FormVariant = {
  variant_name?: string;
  attributes: FormAttribute[];
  sale_price: number;
  compare_at_price?: number;
  qty_on_hand: number;
  images?: string[];
};

export default function ProductEditPage() {
  const { id } = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  const [form, setForm] = useState({
    title: "",
    brandId: "",
    category: "",
    categories: [] as string[],
    sale_price: 0,
    compare_at_price: 0,
    qty_on_hand: 0,
    stock_status: "IN_STOCK",
    description_html: "",
    short_description: "",
    images_base64: [] as string[],
    attributes: [] as FormAttribute[],
    variants: [] as FormVariant[],
    status: "DRAFT",
    featured: false,
  });

  const [brands, setBrands] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [showAddBrand, setShowAddBrand] = useState(false);
  const [newBrandName, setNewBrandName] = useState("");
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  // Variant state
  const [variantForm, setVariantForm] = useState<FormVariant>({
    variant_name: "",
    attributes: [],
    sale_price: 0,
    compare_at_price: 0,
    qty_on_hand: 0,
    images: [],
  });

  const [showVariantForm, setShowVariantForm] = useState(false);
  const [variantImage, setVariantImage] = useState<File | null>(null);

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
      const product = productData as Product;

      setForm({
        title: product.title || "",
        brandId: product.brand?.id || "",
        category: product.category?.id || "",
        categories: product.categories?.map((c) => c.id) || [],
        sale_price: product.price || 0,
        compare_at_price: product.discount_price || 0,
        qty_on_hand: product.stock_quantity || 0,
        stock_status: product.stock_status || "IN_STOCK",
        description_html: product.product_description || "",
        short_description: product.short_description || "",
        images_base64: product.product_images?.map((img) => img.url) || [],
        attributes: product.attributes || [],

        variants:
          product.variants?.map((v) => ({
            variant_name: "",
            attributes: v.attributes.map((a) => ({
              key: a.key,
              value: a.value,
            })),
            sale_price: v.price,
            compare_at_price: v.compare_at_price ?? 0,
            qty_on_hand: v.stock_quantity,
            images: [],
          })) || [],

        status: product.product_status || "DRAFT",
        featured: product.featured_product || false,
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
      const base64 = await convertToBase64(file);
      newImages.push(base64);
    }
    setForm((prev) => ({
      ...prev,
      images_base64: [...prev.images_base64, ...newImages],
    }));
  };

  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleVariantImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1024 * 1024) {
      alert("Image must be less than 1MB");
      return;
    }

    setVariantImage(file);
  };

  const handleAddAttribute = () => {
    const key = prompt("Enter attribute key:");
    if (!key) return;

    const value = prompt("Enter attribute value:");
    if (!value) return;

    setForm((prev) => ({
      ...prev,
      attributes: [...prev.attributes, { key, value }],
    }));
  };

  const handleAddVariantAttribute = () => {
    const key = prompt("Enter variant attribute key:");
    if (!key) return;

    const value = prompt("Enter variant attribute value:");
    if (!value) return;

    setVariantForm((prev) => ({
      ...prev,
      attributes: [...prev.attributes, { key, value }],
    }));
  };

  const handleAddVariant = async () => {
    if (variantForm.sale_price <= 0) {
      alert("Variant price must be greater than 0");
      return;
    }

    if (variantForm.qty_on_hand < 0) {
      alert("Variant stock cannot be negative");
      return;
    }

    let variantImages: string[] = [];
    if (variantImage) {
      const base64 = await convertToBase64(variantImage);
      variantImages = [base64];
    }

    const newVariant: FormVariant = {
      ...variantForm,
      images: variantImages,
    };

    setForm((prev) => ({
      ...prev,
      variants: [...prev.variants, newVariant],
    }));

    // Reset variant form
    setVariantForm({
      variant_name: "",
      attributes: [],
      sale_price: 0,
      compare_at_price: 0,
      qty_on_hand: 0,
      images: [],
    });
    setVariantImage(null);
    setShowVariantForm(false);
  };

  const handleRemoveVariant = (index: number) => {
    setForm((prev) => ({
      ...prev,
      variants: prev.variants.filter((_, i) => i !== index),
    }));
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

    if (form.sale_price <= 0) {
      alert("Price must be greater than 0");
      return;
    }

    if (form.qty_on_hand < 0) {
      alert("Stock cannot be negative");
      return;
    }

    setLoading(true);
    try {
      await updateProduct(id as string, {
        title: form.title,
        brandId: form.brandId,
        category: form.category,
        categories: form.categories,
        sale_price: form.sale_price,
        compare_at_price: form.compare_at_price || undefined,
        qty_on_hand: form.qty_on_hand,
        stock_status: form.stock_status,
        description_html: form.description_html,
        short_description: form.short_description,
        images_base64: form.images_base64,
        attributes: form.attributes,
        variants: form.variants.map((v, index) => ({
          sku_code: `${form.title.replace(/\s+/g, "-").toUpperCase()}-V${
            index + 1
          }`,
          variant_name: v.variant_name,
          attributes: v.attributes,
          sale_price: v.sale_price,
          compare_at_price: v.compare_at_price || undefined,
          qty_on_hand: v.qty_on_hand,
          images: v.images,
        })),
        status: form.status,
        featured: form.featured,
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
    <div className="max-w-6xl mx-auto">
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

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Basic Info */}
          <div className="space-y-6">
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

            {/* Brand Selection */}
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

            {/* Categories */}
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

              <div className="grid grid-cols-2 gap-2">
                {categories.map((cat) => (
                  <label
                    key={cat.id}
                    className="flex items-center gap-2 p-3 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
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
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-slate-700">{cat.name}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Product Attributes */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-slate-700">
                  Product Attributes
                </label>
                <button
                  type="button"
                  onClick={handleAddAttribute}
                  className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  Add Attribute
                </button>
              </div>

              {form.attributes.length > 0 ? (
                <div className="space-y-2">
                  {form.attributes.map((attr, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg"
                    >
                      <span className="font-medium text-slate-700">
                        {attr.key}:
                      </span>
                      <span className="text-slate-600 flex-1">
                        {attr.value}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setForm((prev) => ({
                            ...prev,
                            attributes: prev.attributes.filter(
                              (_, i) => i !== index
                            ),
                          }))
                        }
                        className="p-1 hover:bg-slate-200 rounded"
                      >
                        <X className="w-4 h-4 text-slate-500" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500 italic">
                  No attributes added
                </p>
              )}
            </div>
          </div>

          {/* Right Column - Pricing, Inventory, Images */}
          <div className="space-y-6">
            {/* Price & Stock */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Sale Price (€) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500">
                    €
                  </span>
                  <input
                    type="number"
                    value={form.sale_price}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        sale_price: Number(e.target.value),
                      }))
                    }
                    placeholder="0.00"
                    className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="0.01"
                    step="0.01"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Compare Price (€)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500">
                    €
                  </span>
                  <input
                    type="number"
                    value={form.compare_at_price || ""}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        compare_at_price: Number(e.target.value) || 0,
                      }))
                    }
                    placeholder="Optional"
                    className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Stock Quantity *
                </label>
                <div className="relative">
                  <Box className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="number"
                    value={form.qty_on_hand}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        qty_on_hand: Number(e.target.value),
                      }))
                    }
                    placeholder="0"
                    className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="0"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Stock Status *
                </label>
                <select
                  value={form.stock_status}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      stock_status: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="IN_STOCK">In Stock</option>
                  <option value="OUT_OF_STOCK">Out of Stock</option>
                  <option value="LOW_STOCK">Low Stock</option>
                  <option value="PREORDER">Preorder</option>
                </select>
              </div>
            </div>

            {/* Product Status & Featured */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Product Status *
                </label>
                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, status: e.target.value }))
                  }
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="DRAFT">Draft</option>
                  <option value="ACTIVE">Active</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Featured Product
                </label>
                <label className="flex items-center gap-2 p-3 border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.featured}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        featured: e.target.checked,
                      }))
                    }
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-slate-700">
                    Mark as featured product
                  </span>
                </label>
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
                  <Plus className="w-4 h-4 inline mr-1" />
                  Add Images
                </label>
              </div>

              <div className="border-2 border-dashed border-slate-300 rounded-lg p-6">
                {form.images_base64.length === 0 ? (
                  <div className="text-center py-8">
                    <ImageIcon className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                    <div className="text-slate-600 font-medium">
                      Drop images here or click to upload
                    </div>
                    <div className="text-sm text-slate-500 mt-1">
                      PNG, JPG, GIF up to 1MB
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-4">
                    {form.images_base64.map((img, index) => (
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
                              images_base64: prev.images_base64.filter(
                                (_, i) => i !== index
                              ),
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
            </div>

            {/* Short Description */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Short Description
              </label>
              <textarea
                value={form.short_description}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    short_description: e.target.value,
                  }))
                }
                placeholder="Brief product description for listings..."
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-24"
                rows={3}
              />
            </div>
          </div>
        </div>

        {/* Full-width sections */}
        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Detailed Description
          </label>
          <textarea
            value={form.description_html}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, description_html: e.target.value }))
            }
            placeholder="Enter detailed product description with features, specifications..."
            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-48"
            rows={8}
          />
        </div>

        {/* Variants Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">
                Product Variants
              </h3>
              <p className="text-sm text-slate-500">
                Add different variations of this product
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowVariantForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold flex items-center gap-2 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              Add Variant
            </button>
          </div>

          {/* Variants List */}
          {form.variants.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mb-6">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
                        Variant Name
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
                        Attributes
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
                        Price
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
                        Stock
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {form.variants.map((variant, index) => (
                      <tr
                        key={index}
                        className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                      >
                        <td className="py-3 px-4 text-slate-700">
                          {variant.variant_name}
                        </td>
                        <td className="py-3 px-4">
                          {variant.attributes.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {variant.attributes.map((attr, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-xs"
                                >
                                  {attr.key}: {attr.value}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-400 text-sm">
                              No attributes
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-medium">
                            €{variant.sale_price.toLocaleString()}
                          </span>

                          {variant.compare_at_price &&
                            variant.compare_at_price > 0 && (
                              <div className="text-xs text-slate-400 line-through">
                                €{variant.compare_at_price.toLocaleString()}
                              </div>
                            )}
                        </td>

                        <td className="py-3 px-4">
                          <span className="text-slate-700">
                            {variant.qty_on_hand} units
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <button
                            type="button"
                            onClick={() => handleRemoveVariant(index)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Variant Form */}
          {showVariantForm && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold text-slate-900">
                  Add New Variant
                </h4>
                <button
                  type="button"
                  onClick={() => setShowVariantForm(false)}
                  className="p-1 hover:bg-slate-200 rounded"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Variant Name
                    </label>
                    <input
                      type="text"
                      value={variantForm.variant_name}
                      onChange={(e) =>
                        setVariantForm((prev) => ({
                          ...prev,
                          variant_name: e.target.value,
                        }))
                      }
                      placeholder="e.g., Blue, Large"
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-slate-700">
                        Variant Attributes
                      </label>
                      <button
                        type="button"
                        onClick={handleAddVariantAttribute}
                        className="text-sm text-blue-600 hover:text-blue-700"
                      >
                        + Add Attribute
                      </button>
                    </div>
                    {variantForm.attributes.length > 0 && (
                      <div className="space-y-2">
                        {variantForm.attributes.map((attr, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <input
                              type="text"
                              value={attr.key}
                              onChange={(e) => {
                                const newAttrs = [...variantForm.attributes];
                                newAttrs[index] = {
                                  ...attr,
                                  key: e.target.value,
                                };
                                setVariantForm((prev) => ({
                                  ...prev,
                                  attributes: newAttrs,
                                }));
                              }}
                              placeholder="Key"
                              className="flex-1 px-3 py-1 border border-slate-300 rounded text-sm"
                            />
                            <input
                              type="text"
                              value={attr.value}
                              onChange={(e) => {
                                const newAttrs = [...variantForm.attributes];
                                newAttrs[index] = {
                                  ...attr,
                                  value: e.target.value,
                                };
                                setVariantForm((prev) => ({
                                  ...prev,
                                  attributes: newAttrs,
                                }));
                              }}
                              placeholder="Value"
                              className="flex-1 px-3 py-1 border border-slate-300 rounded text-sm"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setVariantForm((prev) => ({
                                  ...prev,
                                  attributes: prev.attributes.filter(
                                    (_, i) => i !== index
                                  ),
                                }))
                              }
                              className="p-1 hover:bg-slate-200 rounded"
                            >
                              <X className="w-4 h-4 text-slate-500" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Variant Price (€) *
                    </label>
                    <input
                      type="number"
                      value={variantForm.sale_price}
                      onChange={(e) =>
                        setVariantForm((prev) => ({
                          ...prev,
                          sale_price: Number(e.target.value),
                        }))
                      }
                      placeholder="0.00"
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                      min="0.01"
                      step="0.01"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Compare Price (€)
                    </label>
                    <input
                      type="number"
                      value={variantForm.compare_at_price || ""}
                      onChange={(e) =>
                        setVariantForm((prev) => ({
                          ...prev,
                          compare_at_price: Number(e.target.value) || 0,
                        }))
                      }
                      placeholder="Optional"
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg"
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
                      value={variantForm.qty_on_hand}
                      onChange={(e) =>
                        setVariantForm((prev) => ({
                          ...prev,
                          qty_on_hand: Number(e.target.value),
                        }))
                      }
                      placeholder="0"
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                      min="0"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Variant Image
                    </label>
                    <label className="block">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleVariantImageUpload}
                        className="hidden"
                      />
                      <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 text-center cursor-pointer hover:bg-slate-50">
                        {variantImage ? (
                          <div>
                            <img
                              src={URL.createObjectURL(variantImage)}
                              alt="Variant preview"
                              className="h-20 mx-auto object-cover rounded"
                            />
                            <p className="text-sm text-slate-600 mt-2">
                              {variantImage.name}
                            </p>
                          </div>
                        ) : (
                          <>
                            <ImageIcon className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                            <div className="text-slate-600 text-sm">
                              Click to upload variant image
                            </div>
                          </>
                        )}
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6 pt-6 border-t border-slate-200">
                <button
                  type="button"
                  onClick={handleAddVariant}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Add Variant
                </button>
                <button
                  type="button"
                  onClick={() => setShowVariantForm(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
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
                Saving Changes...
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
