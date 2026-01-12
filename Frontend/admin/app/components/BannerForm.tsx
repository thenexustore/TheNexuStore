// Frontend/admin/app/components/BannerForm.tsx
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Banner, CreateBannerData } from "@/lib/api/banners";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";

interface ProductOption {
  id: string;
  title: string;
  slug: string;
  brand_name?: string;
  category_name?: string;
  thumbnail?: string;
  price?: number;
}

interface BannerFormProps {
  banner?: Banner;
  onSubmit: (data: CreateBannerData) => Promise<void>;
  isSubmitting: boolean;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export default function BannerForm({
  banner,
  onSubmit,
  isSubmitting,
}: BannerFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [imagePreview, setImagePreview] = useState(banner?.image || "");
  const [isUploading, setIsUploading] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [searchResults, setSearchResults] = useState<ProductOption[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showProductDropdown, setShowProductDropdown] = useState(false);

  const [formData, setFormData] = useState<CreateBannerData>({
    image: banner?.image || "",
    overlay: banner?.overlay || "#00000080",
    align: banner?.align || "center",
    title_text: banner?.title_text || "",
    title_color: banner?.title_color || "#ffffff",
    title_size: banner?.title_size || "3rem",
    title_weight: banner?.title_weight || "bold",
    title_font: banner?.title_font || "inherit",
    subtitle_text: banner?.subtitle_text || "",
    subtitle_color: banner?.subtitle_color || "#ffffff",
    subtitle_size: banner?.subtitle_size || "1.5rem",
    button_text: banner?.button_text || "",
    button_link: banner?.button_link || "",
    button_bg: banner?.button_bg || "#ffffff",
    button_color: banner?.button_color || "#000000",
    button_radius: banner?.button_radius || "4px",
    button_padding: banner?.button_padding || "12px 24px",
    is_active: banner?.is_active ?? true,
  });

  const searchProducts = useCallback(
    debounce(async (query: string) => {
      if (!query.trim()) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }

      try {
        setIsSearching(true);
        const response = await fetch(
          `${API_URL}/products?search=${encodeURIComponent(query)}&limit=10`,
          {
            headers: {
              "Content-Type": "application/json",
            },
            cache: "no-store",
          }
        );

        if (response.ok) {
          const data = await response.json();

          if (data.products && Array.isArray(data.products)) {
            const formattedResults: ProductOption[] = data.products.map(
              (product: any) => ({
                id: product.id,
                title: product.title,
                slug: product.slug,
                brand_name: product.brand_name,
                category_name: product.category_name,
                thumbnail: product.thumbnail,
                price: product.price,
              })
            );
            setSearchResults(formattedResults);
          } else {
            setSearchResults([]);
          }
        } else {
          setSearchResults([]);
        }
      } catch (err) {
        console.error("Search error:", err);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300),
    []
  );

  useEffect(() => {
    searchProducts(productSearch);
  }, [productSearch, searchProducts]);

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setError("Image size must be less than 10MB");
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file");
      return;
    }

    setIsUploading(true);
    setError("");

    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setImagePreview(base64String);
        setFormData((prev) => ({ ...prev, image: base64String }));
        setIsUploading(false);
      };
      reader.onerror = () => {
        setError("Failed to read image file");
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError("Failed to upload image");
      setIsUploading(false);
    }
  };

  const handleProductSelect = (product: ProductOption) => {
    const productUrl = `/products/${product.slug}`;
    setFormData((prev) => ({
      ...prev,
      button_link: productUrl,
    }));
    setProductSearch(product.title);
    setShowProductDropdown(false);
    setSearchResults([]);
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.image) {
      setError("Please upload an image");
      return;
    }

    if (formData.button_link && formData.button_link.trim() !== "") {
      const url = formData.button_link.trim();

      if (!url.startsWith("/")) {
        setError(
          'Button link must be a relative path starting with "/" (e.g., /products/sale)'
        );
        return;
      }

      const isValidRelativePath = /^\/[a-zA-Z0-9\-_\.\/]*$/.test(url);
      if (!isValidRelativePath) {
        setError(
          "Invalid relative path format. Use format like: /products/sale or /category/electronics"
        );
        return;
      }
    }

    try {
      await onSubmit(formData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save banner");
    }
  };

  const getFullUrlPreview = () => {
    if (!formData.button_link) return "";
    const baseUrl = "http://localhost:3000";
    return `${baseUrl}${formData.button_link}`;
  };

  return (
    <div className="max-w-6xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-8">
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Banner Image
          </h2>

          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-6">
              <div className="flex-shrink-0">
                <div className="relative w-full sm:w-80 h-48 rounded-lg overflow-hidden border border-gray-300 bg-gray-100">
                  {imagePreview ? (
                    <img
                      src={imagePreview}
                      alt="Banner preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <div className="text-center">
                        <svg
                          className="mx-auto h-12 w-12 text-gray-300"
                          stroke="currentColor"
                          fill="none"
                          viewBox="0 0 48 48"
                        >
                          <path
                            d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                            strokeWidth={2}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        <p className="mt-2 text-sm">No image selected</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex-1">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Upload Image (Max 10MB)
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                      >
                        {isUploading ? "Uploading..." : "Choose File"}
                      </button>
                      <span className="text-sm text-gray-500">
                        PNG, JPG, GIF up to 10MB
                      </span>
                    </div>
                    {formData.image && (
                      <p className="mt-2 text-sm text-green-600">
                        ✓ Image uploaded successfully
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Or Use Image URL
                    </label>
                    <input
                      type="text"
                      name="image"
                      value={formData.image}
                      onChange={handleChange}
                      placeholder="https://example.com/image.jpg"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Content</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Title
              </label>
              <input
                type="text"
                name="title_text"
                value={formData.title_text}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subtitle
              </label>
              <input
                type="text"
                name="subtitle_text"
                value={formData.subtitle_text}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Button Text
              </label>
              <input
                type="text"
                name="button_text"
                value={formData.button_text}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Button Link
              </label>
              <div className="space-y-2">
                <div className="relative">
                  <input
                    type="text"
                    name="button_link"
                    value={formData.button_link}
                    onChange={handleChange}
                    placeholder="/products/slug or /category/slug"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="space-y-2">
                  {showProductDropdown && searchResults.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                      {searchResults.map((product) => (
                        <button
                          key={product.id}
                          type="button"
                          onClick={() => handleProductSelect(product)}
                          className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 flex items-center gap-3"
                        >
                          {product.thumbnail && (
                            <img
                              src={product.thumbnail}
                              alt={product.title}
                              className="w-10 h-10 object-cover rounded"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900 truncate">
                              {product.title}
                            </div>
                            <div className="text-sm text-gray-500 flex items-center gap-2">
                              {product.brand_name && (
                                <>
                                  <span>{product.brand_name}</span>
                                  <span>•</span>
                                </>
                              )}
                              <span>{product.category_name}</span>
                              {product.price && (
                                <>
                                  <span>•</span>
                                  <span className="font-medium">
                                    €{product.price.toFixed(2)}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="text-xs text-blue-600 font-medium">
                            Select
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setFormData((prev) => ({
                          ...prev,
                          button_link: "/products",
                        }));
                      }}
                      className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Products Page
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFormData((prev) => ({
                          ...prev,
                          button_link: "/",
                        }));
                      }}
                      className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Homepage
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFormData((prev) => ({
                          ...prev,
                          button_link: "/categories",
                        }));
                      }}
                      className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Categories
                    </button>
                  </div>
                </div>

                {formData.button_link && (
                  <div className="mt-2 p-3 bg-gray-50 rounded-md">
                    <div className="text-sm text-gray-700">
                      <span className="font-medium">Selected Link:</span>
                      <span className="ml-2 text-blue-600 font-mono">
                        {formData.button_link}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      <span className="font-medium">Full URL:</span>
                      <span className="ml-2">{getFullUrlPreview()}</span>
                    </div>
                  </div>
                )}

                <div className="text-xs text-gray-400 mt-1">
                  Enter a relative path or search and select a product above.
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Alignment
              </label>
              <select
                name="align"
                value={formData.align}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="left">Left</option>
                <option value="center">Center</option>
                <option value="right">Right</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Overlay Color
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  name="overlay"
                  value={formData.overlay}
                  onChange={handleChange}
                  className="w-10 h-10 cursor-pointer rounded border border-gray-300"
                />
                <input
                  type="text"
                  name="overlay"
                  value={formData.overlay}
                  onChange={handleChange}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Typography
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Title Color
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  name="title_color"
                  value={formData.title_color}
                  onChange={handleChange}
                  className="w-10 h-10 cursor-pointer rounded border border-gray-300"
                />
                <input
                  type="text"
                  name="title_color"
                  value={formData.title_color}
                  onChange={handleChange}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Title Size
              </label>
              <input
                type="text"
                name="title_size"
                value={formData.title_size}
                onChange={handleChange}
                placeholder="3rem"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subtitle Color
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  name="subtitle_color"
                  value={formData.subtitle_color}
                  onChange={handleChange}
                  className="w-10 h-10 cursor-pointer rounded border border-gray-300"
                />
                <input
                  type="text"
                  name="subtitle_color"
                  value={formData.subtitle_color}
                  onChange={handleChange}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subtitle Size
              </label>
              <input
                type="text"
                name="subtitle_size"
                value={formData.subtitle_size}
                onChange={handleChange}
                placeholder="1.5rem"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Title Weight
              </label>
              <select
                name="title_weight"
                value={formData.title_weight}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="normal">Normal</option>
                <option value="medium">Medium</option>
                <option value="semibold">Semibold</option>
                <option value="bold">Bold</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Title Font
              </label>
              <input
                type="text"
                name="title_font"
                value={formData.title_font}
                onChange={handleChange}
                placeholder="inherit"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Button Styling
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Button Background
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  name="button_bg"
                  value={formData.button_bg}
                  onChange={handleChange}
                  className="w-10 h-10 cursor-pointer rounded border border-gray-300"
                />
                <input
                  type="text"
                  name="button_bg"
                  value={formData.button_bg}
                  onChange={handleChange}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Button Color
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  name="button_color"
                  value={formData.button_color}
                  onChange={handleChange}
                  className="w-10 h-10 cursor-pointer rounded border border-gray-300"
                />
                <input
                  type="text"
                  name="button_color"
                  value={formData.button_color}
                  onChange={handleChange}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Button Radius
              </label>
              <input
                type="text"
                name="button_radius"
                value={formData.button_radius}
                onChange={handleChange}
                placeholder="4px"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Button Padding
              </label>
              <input
                type="text"
                name="button_padding"
                value={formData.button_padding}
                onChange={handleChange}
                placeholder="12px 24px"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_active"
              name="is_active"
              checked={formData.is_active}
              onChange={handleChange}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label
              htmlFor="is_active"
              className="ml-2 block text-sm text-gray-900"
            >
              Set banner as active
            </label>
          </div>
        </div>

        <div className="flex items-center justify-end gap-4 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || isUploading}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Saving..." : "Save Banner"}
          </button>
        </div>
      </form>
    </div>
  );
}

function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}
