// app/products/[slug]/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { formatCurrency } from "../../lib/currency";
import Image from "next/image";
import ProductCard from "../../components/ProductCard";
import ReviewForm from "../../components/ReviewForm";
import { productAPI, ProductDetail, Product } from "../../lib/products";
import { ProductDetailSkeleton } from "../../components/ProductDetailSkeleton";
import { useCart } from "@/context/CartContext";

export default function ProductPage() {
  const params = useParams();
  const slug = params.slug as string;
  const t = useTranslations("products");

  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [selectedImage, setSelectedImage] = useState(0);
  const [imagesError, setImagesError] = useState<Record<number, boolean>>({});
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addingToCart, setAddingToCart] = useState(false);
  const [addToCartMessage, setAddToCartMessage] = useState<string | null>(null);
  const [addToCartError, setAddToCartError] = useState(false);
  const { addItem, updateItem, removeItem, cart, isLoading: cartLoading } =
    useCart();
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    const fetchProductData = async () => {
      try {
        setLoading(true);
        const productData = await productAPI.getProductBySlug(slug);
        setProduct(productData);

        const related = await productAPI.getRelatedProducts(productData.id);
        setRelatedProducts(related);

        if (productData.variants.length > 0) {
          setSelectedVariant(productData.variants[0].id);
        }
      } catch {
        setError(t("loadFailed"));
      } finally {
        setLoading(false);
      }
    };

    if (slug) fetchProductData();
  }, [slug]);

  const currentVariant =
    product?.variants.find((v) => v.id === selectedVariant) ||
    product?.variants[0];

  const images =
    currentVariant?.images && currentVariant.images.length > 0
      ? currentVariant.images
      : (product?.images ?? []);

  const isOutOfStock = currentVariant?.stock_status === "OUT_OF_STOCK";

  const cartItem = cart?.items.find(
    (item) =>
      item.sku_code === currentVariant?.sku_code ||
      item.sku_id === currentVariant?.sku_id,
  );

  const cartQuantity = cartItem?.quantity || 0;

  useEffect(() => {
    if (cartQuantity > 0) {
      setQuantity(cartQuantity);
    } else {
      setQuantity(1);
    }
  }, [cartQuantity]);

  const handleAddToCart = async () => {
    if (!product || !currentVariant) return;

    try {
      setAddingToCart(true);
      setAddToCartMessage(null);

      await addItem(currentVariant.sku_code, quantity);

      setAddToCartError(false);
      setAddToCartMessage(t("addedToCart", {quantity, title: product.title}));

      setTimeout(() => {
        setAddToCartMessage(null);
      }, 3000);
    } catch {
      setAddToCartError(true);
      setAddToCartMessage(t("loadAddFailed"));
    } finally {
      setAddingToCart(false);
    }
  };

  const handleReviewSubmit = async (reviewData: {
    rating: number;
    title?: string;
    comment?: string;
  }) => {
    if (!product) return;
    await productAPI.createReview(product.id, reviewData);
  };

  if (loading) return <ProductDetailSkeleton />;

  if (error || !product) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-red-100 bg-red-50 p-10 text-center">
          <svg
            className="h-12 w-12 text-red-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
            />
          </svg>
          <h2 className="text-xl font-bold text-red-700">
            {error || t("notFound")}
          </h2>
          <Link
            href="/products"
            className="mt-2 inline-flex items-center gap-2 rounded-full bg-[#0B123A] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1a245a]"
          >
            ← {t("backToProducts")}
          </Link>
        </div>
      </div>
    );
  }

  if (!currentVariant) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center text-red-500">{t("variantUnavailable")}</div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl overflow-x-clip bg-white px-4 pb-24 pt-6 text-black sm:px-6 sm:pb-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-center text-sm text-gray-600">
        <Link href="/" className="hover:underline">
          {t("home")}
        </Link>
        <span className="mx-2">/</span>
        <Link href="/products" className="hover:underline">
          {t("all")}
        </Link>
        <span className="mx-2">/</span>
        <span className="max-w-full break-words">{product.title}</span>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div>
          {/* MAIN IMAGE */}
          <div className="aspect-square overflow-hidden rounded-lg bg-gray-100">
            {images.length > 0 ? (
              <div className="relative h-full w-full bg-gray-100">
                {currentVariant.compare_at_price && currentVariant.compare_at_price > currentVariant.price && (
                  <span className="absolute left-3 top-3 z-10 rounded-md bg-red-600 px-2.5 py-1 text-xs font-extrabold uppercase tracking-wide text-white shadow">
                    -{Math.round(((currentVariant.compare_at_price - currentVariant.price) / currentVariant.compare_at_price) * 100)}%
                  </span>
                )}
                <Image
                  src={
                    imagesError[selectedImage]
                      ? "/No_Image_Available.png"
                      : images[selectedImage]?.url || "/No_Image_Available.png"
                  }
                  alt={product.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  priority={selectedImage === 0}
                  className="object-contain"
                  onError={() => {
                    setImagesError((prev) => ({
                      ...prev,
                      [selectedImage]: true,
                    }));
                  }}
                />
              </div>
            ) : (
              <div className="flex h-full items-center justify-center bg-gray-100">
                <span className="text-gray-400">{t("noImage")}</span>
              </div>
            )}
          </div>

          {/* THUMBNAILS */}
          {images.length > 1 && (
            <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
              {images.map((image, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setSelectedImage(index)}
                  aria-label={`View image ${index + 1}`}
                  className={`h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg border-2 transition-all duration-200 ${
                    selectedImage === index
                      ? "border-[#0B123A] ring-2 ring-[#0B123A]/30"
                      : "border-gray-200 hover:border-gray-400"
                  }`}
                >
                  <div className="relative h-full w-full bg-gray-100">
                    <Image
                      src={
                        imagesError[index]
                          ? "/No_Image_Available.png"
                          : image?.url || "/No_Image_Available.png"
                      }
                      alt={`${product.title} - ${index + 1}`}
                      fill
                      sizes="80px"
                      className="object-contain"
                      onError={() => {
                        setImagesError((prev) => ({
                          ...prev,
                          [index]: true,
                        }));
                      }}
                    />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <h1 className="mb-2 break-words text-2xl font-bold sm:text-3xl">{product.title}</h1>

          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="flex items-center">
              <span
                className={`text-2xl font-extrabold ${
                  currentVariant.compare_at_price && currentVariant.compare_at_price > currentVariant.price
                    ? "text-red-600"
                    : "text-gray-900"
                }`}
              >
                {formatCurrency(currentVariant.price)}
              </span>
              {currentVariant.compare_at_price &&
                currentVariant.compare_at_price > currentVariant.price && (
                  <span className="ml-2 text-lg text-black/80 line-through">
                    {formatCurrency(currentVariant.compare_at_price)}
                  </span>
                )}
            </div>

            {currentVariant.compare_at_price && currentVariant.compare_at_price > currentVariant.price && (
              <span className="rounded-md bg-red-600 px-2 py-1 text-xs font-extrabold text-white shadow">
                -{Math.round(((currentVariant.compare_at_price - currentVariant.price) / currentVariant.compare_at_price) * 100)}%
              </span>
            )}

            {product.rating_avg && (
              <div className="flex items-center">
                <span className="mr-1 text-yellow-400">★</span>
                <span className="font-medium">
                  {product.rating_avg.toFixed(1)}
                </span>
                <span className="ml-1 text-gray-600">
                  ({product.rating_count} reviews)
                </span>
              </div>
            )}
          </div>

          <div className="mb-6">
            <span
              className={`inline-block rounded-full px-3 py-1 text-sm font-medium ${
                currentVariant.stock_status === "IN_STOCK"
                  ? "bg-green-100 text-green-800"
                  : currentVariant.stock_status === "LOW_STOCK"
                    ? "bg-yellow-100 text-yellow-800"
                    : "bg-red-100 text-red-800"
              }`}
            >
              {currentVariant.stock_status === "IN_STOCK"
                ? t("inStock", {count: currentVariant.stock_quantity})
                : currentVariant.stock_status === "LOW_STOCK"
                  ? t("lowStock", {count: currentVariant.stock_quantity})
                  : t("outOfStock")}
            </span>
          </div>

          {product.variants.length > 1 && (
            <div className="mb-6">
              <h3 className="mb-2 font-medium">{t("options")}</h3>
              <div className="flex flex-wrap gap-2">
                {product.variants.map((variant) => (
                  <button
                    key={variant.id}
                    onClick={() => setSelectedVariant(variant.id)}
                    aria-pressed={selectedVariant === variant.id}
                    aria-label={`Select variant: ${variant.variant_name || variant.attributes.map((a) => a.value).join(" / ")}`}
                    className={`rounded-lg border px-4 py-2 text-sm font-medium transition-all ${
                      selectedVariant === variant.id
                        ? "border-[#0B123A] bg-[#0B123A] text-white shadow-sm"
                        : "border-gray-300 text-gray-700 hover:border-[#0B123A] hover:text-[#0B123A]"
                    } ${
                      variant.stock_status === "OUT_OF_STOCK"
                        ? "opacity-50 cursor-not-allowed"
                        : ""
                    }`}
                    disabled={variant.stock_status === "OUT_OF_STOCK"}
                  >
                    {variant.variant_name ||
                      variant.attributes.map((a) => a.value).join(" / ")}
                  </button>
                ))}
              </div>
            </div>
          )}

          {product.attributes.length > 0 && (
            <div className="mb-6">
              <h3 className="mb-2 font-medium">{t("specifications")}</h3>
              <div className="space-y-1">
                {product.attributes.map((attr) => (
                  <div key={attr.key} className="flex gap-2">
                    <span className="w-28 shrink-0 text-gray-600">{attr.name}:</span>
                    <span className="min-w-0 break-words">{attr.values.join(", ")}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mb-8 md:mb-4">
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <div className="flex w-fit items-center rounded border border-gray-300">
                <button
                  onClick={async () => {
                    if (!currentVariant) return;

                    if (cartItem) {
                      if (cartQuantity <= 1) {
                        await removeItem(cartItem.id);
                      } else {
                        await updateItem(cartItem.id, cartQuantity - 1);
                      }
                    }
                  }}
                  className="px-3 py-2 hover:bg-gray-100"
                  disabled={isOutOfStock || cartLoading}
                >
                  -
                </button>
                <input
                  type="number"
                  min={1}
                  max={currentVariant.stock_quantity}
                  value={quantity}
                  readOnly
                  onChange={(e) =>
                    setQuantity(
                      Math.min(
                        currentVariant.stock_quantity,
                        Math.max(1, Number(e.target.value)),
                      ),
                    )
                  }
                  className="w-14 bg-transparent text-center sm:w-16"
                  disabled={isOutOfStock || cartLoading}
                />
                <button
                  onClick={async () => {
                    if (!currentVariant) return;

                    if (cartItem) {
                      await updateItem(cartItem.id, cartQuantity + 1);
                    } else {
                      await addItem(currentVariant.sku_code, 1);
                    }
                  }}
                  className="px-3 py-2 hover:bg-gray-100"
                  disabled={
                    isOutOfStock ||
                    cartLoading ||
                    quantity >= currentVariant.stock_quantity
                  }
                >
                  +
                </button>
              </div>

              <button
                onClick={handleAddToCart}
                disabled={isOutOfStock || addingToCart || cartLoading}
                className={`hidden w-full rounded-xl px-6 py-3 font-semibold transition-all md:block md:flex-1 ${
                  isOutOfStock || addingToCart || cartLoading
                    ? "cursor-not-allowed bg-gray-300 text-gray-500"
                    : "bg-[#0B123A] text-white hover:bg-[#1a245a] active:scale-95"
                }`}
              >
                {addingToCart ? (
                  <span className="flex items-center justify-center">
                    <svg
                      className="animate-spin h-5 w-5 mr-2 text-white"
                      xmlns="http://www.w3.org/2000/svg"
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
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    {t("adding")}
                  </span>
                ) : isOutOfStock ? (
                  t("outOfStock")
                ) : (
                  t("addToCart")
                )}
              </button>
            </div>

            {addToCartMessage && (
              <div
                className={`p-3 rounded-lg text-sm font-medium ${
                  addToCartError
                    ? "bg-red-100 text-red-700"
                    : "bg-green-100 text-green-700"
                }`}
              >
                {addToCartMessage}
              </div>
            )}
          </div>

          {product.description_html && (
            <div className="mb-8">
              <h3 className="mb-4 text-xl font-semibold">{t("description")}</h3>
              <div
                className="prose max-w-none break-words"
                dangerouslySetInnerHTML={{ __html: product.description_html }}
              />
            </div>
          )}
        </div>
      </div>


      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 fixed-bottom-bar backdrop-blur md:hidden">
        <button
          onClick={handleAddToCart}
          disabled={isOutOfStock || addingToCart || cartLoading}
          className={`w-full rounded-xl px-6 py-3 text-sm font-semibold transition-all ${
            isOutOfStock || addingToCart || cartLoading
              ? "cursor-not-allowed bg-gray-300 text-gray-500"
              : "bg-[#0B123A] text-white hover:bg-[#1a245a] active:scale-95"
          }`}
        >
          {addingToCart ? t("adding") : isOutOfStock ? t("outOfStock") : t("addToCart")}
        </button>
      </div>

      {relatedProducts.length > 0 && (
        <div>
          <h2 className="mb-6 text-2xl font-bold lg:text-3xl">{t("relatedProducts")}</h2>
          <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4 xl:grid-cols-5 lg:gap-6">
            {relatedProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
