"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { ChevronRight, Star } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import ProductCard from "../../components/ProductCard";
import ReviewForm from "../../components/ReviewForm";
import { formatCurrency } from "../../lib/currency";
import { productAPI, Product, ProductDetail } from "../../lib/products";
import { useCart } from "@/context/CartContext";

export default function ProductDetailsClient({
  product,
  relatedProducts,
}: {
  product: ProductDetail;
  relatedProducts: Product[];
}) {
  const t = useTranslations("products");

  const [selectedImage, setSelectedImage] = useState(0);
  const [imagesError, setImagesError] = useState<Record<number, boolean>>({});
  const [selectedVariant, setSelectedVariant] = useState<string | null>(
    product.variants[0]?.id ?? null,
  );
  const [addingToCart, setAddingToCart] = useState(false);
  const [addToCartMessage, setAddToCartMessage] = useState<string | null>(null);
  const [addToCartError, setAddToCartError] = useState(false);
  const { addItem, updateItem, removeItem, cart, isLoading: cartLoading } =
    useCart();
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (product.variants.length > 0) {
      setSelectedVariant((current) => current ?? product.variants[0].id);
    }
  }, [product.variants]);

  const currentVariant =
    product.variants.find((variant) => variant.id === selectedVariant) ||
    product.variants[0];

  const images =
    currentVariant?.images && currentVariant.images.length > 0
      ? currentVariant.images
      : product.images ?? [];

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
    if (!currentVariant) return;

    try {
      setAddingToCart(true);
      setAddToCartMessage(null);

      await addItem(currentVariant.sku_code, quantity);

      setAddToCartError(false);
      setAddToCartMessage(t("addedToCart", { quantity, title: product.title }));

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
    await productAPI.createReview(product.id, reviewData);
  };

  if (!currentVariant) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center text-red-500">{t("variantUnavailable")}</div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl overflow-x-clip bg-white px-4 pb-24 pt-6 text-black sm:px-6 sm:pb-6 lg:px-8">
      <nav
        aria-label="breadcrumb"
        className="mb-6 flex flex-wrap items-center gap-1 text-sm text-gray-600"
      >
        <Link href="/" className="hover:text-[#0B123A] hover:underline">
          {t("home")}
        </Link>
        <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
        <Link href="/products" className="hover:text-[#0B123A] hover:underline">
          {t("all")}
        </Link>
        <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
        <span className="max-w-[16rem] truncate font-medium text-gray-900 sm:max-w-none sm:overflow-visible sm:whitespace-normal sm:break-words">
          {product.title}
        </span>
      </nav>

      <div className="mb-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div>
          <div className="aspect-square overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-sm">
            {images.length > 0 ? (
              <div className="relative h-full w-full bg-slate-50">
                {currentVariant.compare_at_price &&
                  currentVariant.compare_at_price > currentVariant.price && (
                    <span className="absolute left-3 top-3 z-10 rounded-md bg-red-600 px-2.5 py-1 text-xs font-extrabold uppercase tracking-wide text-white shadow">
                      -
                      {Math.round(
                        ((currentVariant.compare_at_price - currentVariant.price) /
                          currentVariant.compare_at_price) *
                          100,
                      )}
                      %
                    </span>
                  )}
                <Image
                  src={
                    imagesError[selectedImage]
                      ? "/No_Image_Available.png"
                      : images[selectedImage]?.url || "/No_Image_Available.png"
                  }
                  alt={images[selectedImage]?.alt_text || product.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  priority={selectedImage === 0}
                  className="object-contain"
                  onError={() => {
                    setImagesError((previous) => ({
                      ...previous,
                      [selectedImage]: true,
                    }));
                  }}
                />
              </div>
            ) : (
              <div className="flex h-full items-center justify-center bg-slate-50">
                <span className="text-gray-400">{t("noImage")}</span>
              </div>
            )}
          </div>

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
                  <div className="relative h-full w-full bg-slate-50">
                    <Image
                      src={
                        imagesError[index]
                          ? "/No_Image_Available.png"
                          : image?.url || "/No_Image_Available.png"
                      }
                      alt={image?.alt_text || `${product.title} - ${index + 1}`}
                      fill
                      sizes="80px"
                      className="object-contain"
                      onError={() => {
                        setImagesError((previous) => ({
                          ...previous,
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

          {product.brand_name && (
            <span className="mb-4 inline-block rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
              {product.brand_name}
            </span>
          )}

          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="flex items-center">
              <span
                className={`text-2xl font-extrabold ${
                  currentVariant.compare_at_price &&
                  currentVariant.compare_at_price > currentVariant.price
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

            {currentVariant.compare_at_price &&
              currentVariant.compare_at_price > currentVariant.price && (
                <span className="rounded-md bg-red-600 px-2 py-1 text-xs font-extrabold text-white shadow">
                  -
                  {Math.round(
                    ((currentVariant.compare_at_price - currentVariant.price) /
                      currentVariant.compare_at_price) *
                      100,
                  )}
                  %
                </span>
              )}

            {product.rating_avg && (
              <div className="flex items-center gap-1">
                <Star size={16} className="fill-amber-400 text-amber-400" aria-hidden="true" />
                <span className="font-semibold">{product.rating_avg.toFixed(1)}</span>
                <span className="text-xs text-gray-500">/ 5</span>
                <span className="text-xs text-gray-400">
                  ({product.rating_count}{" "}
                  {product.rating_count === 1 ? t("review") : t("reviews")})
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
                ? t("inStock", { count: currentVariant.stock_quantity })
                : currentVariant.stock_status === "LOW_STOCK"
                  ? t("lowStock", { count: currentVariant.stock_quantity })
                  : t("outOfStock")}
            </span>
          </div>

          {product.variants.length > 1 && (
            <div className="mb-6">
              <h2 className="mb-2 font-semibold text-slate-800">{t("options")}</h2>
              <div className="flex flex-wrap gap-2">
                {product.variants.map((variant) => (
                  <button
                    key={variant.id}
                    onClick={() => setSelectedVariant(variant.id)}
                    aria-pressed={selectedVariant === variant.id}
                    aria-label={`Select variant: ${
                      variant.variant_name ||
                      variant.attributes.map((attribute) => attribute.value).join(" / ")
                    }`}
                    className={`rounded-lg border px-4 py-2 text-sm font-medium transition-all ${
                      selectedVariant === variant.id
                        ? "border-[#0B123A] bg-[#0B123A] text-white shadow-sm"
                        : "border-gray-300 text-gray-700 hover:border-[#0B123A] hover:text-[#0B123A]"
                    } ${
                      variant.stock_status === "OUT_OF_STOCK"
                        ? "cursor-not-allowed opacity-50"
                        : ""
                    }`}
                    disabled={variant.stock_status === "OUT_OF_STOCK"}
                  >
                    {variant.variant_name ||
                      variant.attributes.map((attribute) => attribute.value).join(" / ")}
                  </button>
                ))}
              </div>
            </div>
          )}

          {product.attributes.length > 0 && (
            <div className="mb-6">
              <h2 className="mb-3 font-semibold text-slate-800">{t("specifications")}</h2>
              <div className="overflow-hidden rounded-xl border border-slate-200">
                {product.attributes.map((attribute, index) => (
                  <div
                    key={attribute.key}
                    className={`flex gap-3 px-4 py-2.5 text-sm ${
                      index % 2 === 0 ? "bg-slate-50" : "bg-white"
                    }`}
                  >
                    <span className="w-32 shrink-0 font-medium text-slate-500">
                      {attribute.name}
                    </span>
                    <span className="min-w-0 break-words text-slate-800">
                      {attribute.values.join(", ")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mb-8 md:mb-4">
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <div className="flex w-fit items-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
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
                  aria-label="Disminuir cantidad"
                  className="px-4 py-2.5 text-lg font-bold text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={isOutOfStock || cartLoading}
                >
                  −
                </button>
                <input
                  type="number"
                  min={1}
                  max={currentVariant.stock_quantity}
                  value={quantity}
                  readOnly
                  onChange={(event) =>
                    setQuantity(
                      Math.min(
                        currentVariant.stock_quantity,
                        Math.max(1, Number(event.target.value)),
                      ),
                    )
                  }
                  aria-label="Cantidad"
                  className="w-14 bg-transparent text-center font-semibold sm:w-16"
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
                  aria-label="Aumentar cantidad"
                  className="px-4 py-2.5 text-lg font-bold text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
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
                      className="mr-2 h-5 w-5 animate-spin text-white"
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
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
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
                className={`flex items-start gap-3 rounded-xl border p-3 text-sm font-medium ${
                  addToCartError
                    ? "border-red-200 bg-red-50 text-red-700"
                    : "border-green-200 bg-green-50 text-green-700"
                }`}
                role="alert"
              >
                {addToCartError ? (
                  <svg
                    className="mt-0.5 h-4 w-4 shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                ) : (
                  <svg
                    className="mt-0.5 h-4 w-4 shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
                <span>{addToCartMessage}</span>
              </div>
            )}
          </div>

          {product.description_html && (
            <div className="mb-8">
              <h2 className="mb-4 text-xl font-semibold">{t("description")}</h2>
              <div
                className="prose max-w-none break-words"
                dangerouslySetInnerHTML={{ __html: product.description_html }}
              />
            </div>
          )}
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 fixed-bottom-bar backdrop-blur md:hidden">
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <span
              className={`text-lg font-extrabold leading-tight ${
                currentVariant.compare_at_price &&
                currentVariant.compare_at_price > currentVariant.price
                  ? "text-red-600"
                  : "text-slate-900"
              }`}
            >
              {formatCurrency(currentVariant.price)}
            </span>
            {currentVariant.compare_at_price &&
              currentVariant.compare_at_price > currentVariant.price && (
                <span className="text-xs leading-none text-slate-400 line-through">
                  {formatCurrency(currentVariant.compare_at_price)}
                </span>
              )}
          </div>
          <button
            onClick={handleAddToCart}
            disabled={isOutOfStock || addingToCart || cartLoading}
            className={`flex-1 rounded-xl px-6 py-3 text-sm font-semibold transition-all ${
              isOutOfStock || addingToCart || cartLoading
                ? "cursor-not-allowed bg-gray-300 text-gray-500"
                : "bg-[#0B123A] text-white hover:bg-[#1a245a] active:scale-95"
            }`}
          >
            {addingToCart ? (
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="h-4 w-4 animate-spin"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
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
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
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
      </div>

      <div className="mb-8 mt-12">
        <ReviewForm onSubmit={handleReviewSubmit} productId={product.id} />
      </div>

      {relatedProducts.length > 0 && (
        <div>
          <h2 className="mb-6 text-2xl font-bold lg:text-3xl">{t("relatedProducts")}</h2>
          <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4 xl:grid-cols-5 lg:gap-6">
            {relatedProducts.map((relatedProduct) => (
              <ProductCard key={relatedProduct.id} product={relatedProduct} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
