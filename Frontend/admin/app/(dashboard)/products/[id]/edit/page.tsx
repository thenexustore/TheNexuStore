"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { fetchAdminData, putAdminData } from "@/lib/api";

export default function ProductEditPage() {
  const { id } = useParams();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [brands, setBrands] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [imageError, setImageError] = useState("");
  const [isClient, setIsClient] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    brandId: "",
    sale_price: 0,
    compare_at_price: 0,
    qty_on_hand: 0,
    categories: [] as string[],
    images: [] as string[],
  });

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    setLoadingData(true);
    Promise.all([
      fetchAdminData(`products/${id}`),
      fetchAdminData("brands"),
      fetchAdminData("categories"),
    ])
      .then(([product, brands, categories]) => {
        setBrands(brands);
        setCategories(categories);

        const firstSku = product.skus?.[0];
        const priceData = firstSku?.price;
        const inventoryData = firstSku?.inventory;

        setFormData({
          title: product.title || "",
          description: product.description_html || "",
          brandId: product.brand_id || "",
          sale_price: Number(priceData?.sale_price || 0),
          compare_at_price: Number(priceData?.compare_at_price || 0),
          qty_on_hand: Number(inventoryData?.qty_on_hand || 0),
          categories: product.categories?.map((c: any) => c.id) || [],
          images: product.media?.map((m: any) => m.url) || [],
        });
      })
      .catch((error) => {
        console.error("Failed to load product:", error);
        alert("Failed to load product data");
      })
      .finally(() => setLoadingData(false));
  }, [id]);

  const convertToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      const img = new Image();

      reader.onload = () => (img.src = reader.result as string);

      img.onload = () => {
        const canvas = document.createElement("canvas");
        const scale = Math.min(1, 800 / img.width);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;

        canvas
          .getContext("2d")
          ?.drawImage(img, 0, 0, canvas.width, canvas.height);

        const base64 = canvas.toDataURL("image/jpeg", 0.7);
        const size = Math.ceil((base64.length * 3) / 4);

        size > 1024 * 1024
          ? reject("Image must be less than 1MB")
          : resolve(base64);
      };

      reader.readAsDataURL(file);
    });

  const handleImagesSelect = async (e: any) => {
    try {
      const files = Array.from(e.target.files || []);
      const imgs = await Promise.all(files.map(convertToBase64));
      setFormData((p) => ({ ...p, images: [...p.images, ...imgs] }));
      setImageError("");
    } catch (err: any) {
      setImageError(err);
    }
  };

  const removeImage = (index: number) => {
    setFormData((p) => ({
      ...p,
      images: p.images.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      alert("Product title is required");
      return;
    }

    if (!formData.brandId) {
      alert("Please select a brand");
      return;
    }

    if (formData.sale_price <= 0) {
      alert("Sale price must be greater than 0");
      return;
    }

    if (formData.qty_on_hand < 0) {
      alert("Stock quantity cannot be negative");
      return;
    }

    setLoading(true);

    try {
      await putAdminData(`products/${id}`, {
        title: formData.title,
        brandId: formData.brandId,
        description_html: formData.description,
        short_description: formData.description.slice(0, 200),
        sale_price: formData.sale_price,
        compare_at_price: formData.compare_at_price || null,
        qty_on_hand: formData.qty_on_hand,
        categories: formData.categories,
        images_base64: formData.images,
      });

      router.push(`/products/${id}`);
    } catch (error) {
      console.error("Failed to update product:", error);
      alert("Failed to update product");
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  const SelectComponent = isClient
    ? require("react-select").default
    : () => null;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Edit Product</h1>
        <p className="text-gray-600">Update product details below</p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white border rounded-lg p-6 grid gap-6"
      >
        <div>
          <label className="block text-sm font-medium mb-2">
            Product Title *
          </label>
          <input
            value={formData.title}
            onChange={(e) =>
              setFormData({ ...formData, title: e.target.value })
            }
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter product title"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Brand *</label>
          <select
            value={formData.brandId}
            onChange={(e) =>
              setFormData({ ...formData, brandId: e.target.value })
            }
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="">Select a brand</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Sale Price (₹) *
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              value={formData.sale_price}
              onChange={(e) =>
                setFormData({ ...formData, sale_price: Number(e.target.value) })
              }
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Compare at Price (₹)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="Optional"
              value={formData.compare_at_price || ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  compare_at_price: Number(e.target.value) || 0,
                })
              }
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Stock Quantity *
            </label>
            <input
              type="number"
              min="0"
              placeholder="0"
              value={formData.qty_on_hand}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  qty_on_hand: Number(e.target.value),
                })
              }
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Categories</label>
          {isClient && (
            <SelectComponent
              isMulti
              options={categories.map((c) => ({ value: c.id, label: c.name }))}
              value={categories
                .filter((c) => formData.categories.includes(c.id))
                .map((c) => ({ value: c.id, label: c.name }))}
              onChange={(s: any) =>
                setFormData({
                  ...formData,
                  categories: s ? s.map((x: any) => x.value) : [],
                })
              }
              placeholder="Select categories..."
              className="react-select-container"
              classNamePrefix="react-select"
            />
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Product Images
          </label>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleImagesSelect}
              className="hidden"
              id="image-upload"
            />
            <label
              htmlFor="image-upload"
              className="cursor-pointer block p-4 hover:bg-gray-50 rounded"
            >
              <div className="text-gray-500 mb-2">
                <svg
                  className="w-8 h-8 mx-auto"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <div className="text-sm text-gray-600">
                Click to upload images
              </div>
              <div className="text-xs text-gray-500 mt-1">
                PNG, JPG, GIF up to 1MB
              </div>
            </label>
          </div>
          {imageError && (
            <p className="text-red-600 text-sm mt-2">{imageError}</p>
          )}

          {formData.images.length > 0 && (
            <div className="mt-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {formData.images.map((img, i) => (
                  <div key={i} className="relative group">
                    <img
                      src={img}
                      className="h-32 w-full object-cover rounded border"
                      alt={`Product image ${i + 1}`}
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(i)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Product Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter detailed product description..."
            rows={6}
          />
          <p className="text-xs text-gray-500 mt-1">
            HTML is supported in description
          </p>
        </div>

        <div className="flex gap-3 pt-4 border-t">
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {loading ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-5 py-2.5 border rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
