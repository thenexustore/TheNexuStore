"use client";

import Image from "next/image";
import React, { useEffect, useState } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { Star } from "lucide-react";
import { Product } from "../lib/products";
import { useCart } from "../../context/CartContext";
import { useTranslations } from "next-intl";
import { formatCurrency } from "../lib/currency";

interface ProductCardProps {
  product: Product;
  className?: string;
}

const ProductCard: React.FC<ProductCardProps> = ({
  product,
  className = "",
}) => {
  const isOutOfStock =
    product.stock_status === "OUT_OF_STOCK" ||
    (product.stock_quantity ?? 0) <= 0;
  const isLowStock = product.stock_status === "LOW_STOCK";
  const [isFavorite, setIsFavorite] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [buyNowLoading, setBuyNowLoading] = useState(false);
  const router = useRouter();
  const t = useTranslations("products");

  const {
    addItem,
    updateItem,
    removeItem,
    cart,
    isLoading: cartLoading,
  } = useCart();

  const rating = product.rating_avg || 0;
  const reviewCount = product.rating_count || 0;

  const cartItem = cart?.items.find((item) => {
    return item.sku_code === product.sku_code || item.sku_id === product.sku_id;
  });

  const quantity = cartItem?.quantity || 0;

  useEffect(() => {
    const favorites: string[] = JSON.parse(
      localStorage.getItem("favorites") || "[]",
    );
    setIsFavorite(favorites.includes(product.id));
  }, [product.id]);

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isOutOfStock) return;

    setIsLoading(true);
    try {
      await addItem(product.sku_code, 1);
    } catch (error) {
      console.error("Failed to add to cart:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleIncreaseQuantity = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isOutOfStock) return;

    setIsLoading(true);
    try {
      await addItem(product.sku_code, 1);
    } catch (error) {
      console.error("Failed to increase quantity:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDecreaseQuantity = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (quantity <= 0) return;

    setIsLoading(true);
    try {
      if (cartItem) {
        if (quantity === 1) {
          await removeItem(cartItem.id);
        } else {
          await updateItem(cartItem.id, quantity - 1);
        }
      }
    } catch (error) {
      console.error("Failed to decrease quantity:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBuyNow = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isOutOfStock || buyNowLoading) return;

    setBuyNowLoading(true);
    setIsLoading(true);

    try {
      await addItem(product.sku_code, 1);
      router.push("/cart");
    } catch (error) {
      console.error("Failed to buy now:", error);
      setBuyNowLoading(false);
      setIsLoading(false);
    }
  };

  const toggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    let favorites: string[] = JSON.parse(
      localStorage.getItem("favorites") || "[]",
    );

    if (isFavorite) {
      favorites = favorites.filter((id) => id !== product.id);
    } else {
      favorites.push(product.id);
    }

    setIsFavorite(!isFavorite);
    localStorage.setItem("favorites", JSON.stringify(favorites));
    window.dispatchEvent(new CustomEvent("favorites-update"));
  };

  if (!product) {
    return (
      <div className={`bg-white rounded-xl shadow-sm p-4 ${className}`}>
        <div className="text-center text-gray-500 py-8">
          Product not available
        </div>
      </div>
    );
  }

  const imageSrc =
    product.thumbnail && product.thumbnail.trim() !== ""
      ? product.thumbnail
      : "/No_Image_Available.png";

  const normalizeText = (value?: string | null) =>
    (value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();

  const normalizedTitle = normalizeText(product.title);
  const normalizedDescription = normalizeText(product.short_description);
  const rawShortDescription = (product.short_description || "").trim();
  const delimiterAfterTitleMatch = rawShortDescription.match(
    new RegExp(`^\\s*${product.title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*[:\\-–—|•·]\\s*(.+)$`, "i"),
  );
  const displayDescription = delimiterAfterTitleMatch
    ? delimiterAfterTitleMatch[1].trim()
    : rawShortDescription;
  const shouldShowDescription =
    normalizedDescription.length > 0 &&
    normalizedDescription !== normalizedTitle &&
    displayDescription.length > 0;

  return (
    <div
      className={`group relative flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm card-hover ${
        isLoading ? "pointer-events-none" : ""
      } ${className}`}
    >
      {isLoading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/80 backdrop-blur-sm rounded-xl">
          <div className="flex flex-col items-center gap-3">
            <svg
              className="animate-spin h-8 w-8 text-[#0B123A]"
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
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            <span className="text-sm font-semibold text-gray-700">
              {t("adding")}
            </span>
          </div>
        </div>
      )}

      <Link href={`/products/${product.slug}`} className="block p-3 sm:p-4 focus-ring">
        <div className="relative mb-3 aspect-square w-full overflow-hidden rounded-xl bg-gray-50 sm:mb-4">
          <Image
            src={imageSrc}
            alt={product.title}
            fill
            unoptimized
            sizes="(max-width: 768px) 50vw, (max-width: 1280px) 33vw, 25vw"
            className="p-2 object-contain transition-transform duration-300 group-hover:scale-105"
            onError={(e) => {
              const target = e.currentTarget as HTMLImageElement;
              if (target.src.endsWith("/No_Image_Available.png")) return;
              target.src = "/No_Image_Available.png";
            }}
          />

          {isOutOfStock && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
              <span className="rounded-full bg-red-600 px-3 py-1.5 text-sm font-bold text-white">
                {t("outOfStock")}
              </span>
            </div>
          )}
          {isLowStock && !isOutOfStock && (
            <div className="absolute bottom-2 right-2 z-10">
              <span className="rounded-full bg-amber-500 px-3 py-1 text-xs font-bold text-white shadow">
                {t("lowStockBadge")}
              </span>
            </div>
          )}

          {product.discount_percentage && product.discount_percentage > 0 && (
            <div className="absolute top-2 left-2 z-10">
              <span className="rounded-md bg-red-600 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide text-white shadow">
                -{product.discount_percentage}%
              </span>
            </div>
          )}

          <button
            onClick={toggleFavorite}
            aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
            aria-pressed={isFavorite}
            className="absolute top-2 right-2 z-10 rounded-full bg-white/90 p-2 shadow-md transition-colors hover:bg-white focus-ring"
          >
            <svg
              className={`w-5 h-5 ${isFavorite ? "fill-red-500 text-red-500" : "text-gray-400"}`}
              fill={isFavorite ? "currentColor" : "none"}
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={isFavorite ? "0" : "2"}
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
          </button>
        </div>

        <div className="mb-2 flex items-center justify-between sm:mb-3">
          <span className="truncate text-xs font-semibold uppercase text-gray-500 tracking-wide">
            {product.brand_name}
          </span>
          {cartItem && (
            <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded">
              {t("inCart", {count: quantity})}
            </span>
          )}
        </div>

        <div className="min-w-0 space-y-2 sm:space-y-3">
          <h3 className="break-words text-sm font-bold leading-tight text-gray-900 sm:text-lg">
            {product.title}
          </h3>

          {shouldShowDescription ? (
            <p className="text-xs leading-snug text-gray-600 break-words sm:text-sm sm:leading-relaxed">
              {displayDescription}
            </p>
          ) : null}

          {rating > 0 && reviewCount > 0 && (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <div className="flex items-center">
                <Star size={16} className="fill-amber-400 text-amber-400" />
                <span className="ml-1 text-sm font-semibold">
                  {rating.toFixed(1)}
                </span>
              </div>
              <span className="text-xs text-gray-500">/ 5</span>
              <span className="text-xs text-gray-400">
                ({reviewCount} {reviewCount === 1 ? t("review") : t("reviews")})
              </span>
            </div>
          )}

          <div className="mt-auto flex flex-col gap-0.5">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span
                className={`text-xl font-bold sm:text-2xl ${
                  product.compare_at_price && product.compare_at_price > product.price
                    ? "text-red-600"
                    : "text-gray-900"
                }`}
              >
                {formatCurrency(product.price)}
              </span>

              {product.compare_at_price &&
                product.compare_at_price > product.price && (
                  <span className="text-sm text-gray-500 line-through sm:text-base">
                    {formatCurrency(product.compare_at_price)}
                  </span>
                )}
            </div>

            {product.compare_at_price &&
              product.compare_at_price > product.price && (
                <span className="text-xs font-semibold text-red-600 sm:text-sm">
                  {t("save", { amount: formatCurrency(product.compare_at_price - product.price) })}
                </span>
              )}
          </div>
        </div>
      </Link>

      <div className="mt-auto px-3 pb-3 sm:px-4 sm:pb-4">
        <div className="grid grid-cols-2 gap-1.5 sm:gap-3">
          <button
            onClick={handleBuyNow}
            disabled={isOutOfStock || buyNowLoading || cartLoading}
            className={`focus-ring w-full rounded-xl px-1.5 py-2 text-[11px] font-bold leading-snug text-white transition-all duration-200 sm:py-3 sm:text-sm ${
              isOutOfStock || buyNowLoading || cartLoading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-[#0B123A] hover:bg-[#1a245a] active:scale-95"
            }`}
          >
            {buyNowLoading ? (
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
            ) : (
              <>
                <span className="hidden min-[400px]:inline">{t("buyNow")}</span>
                <span className="min-[400px]:hidden">{t("buyNowCompact")}</span>
              </>
            )}
          </button>

          {isOutOfStock ? (
            <button
              disabled
              className="w-full rounded-xl bg-gray-400 px-1.5 py-2 text-[11px] font-semibold leading-snug text-white cursor-not-allowed sm:py-3 sm:text-sm"
            >
              {t("outOfStock")}
            </button>
          ) : quantity === 0 ? (
            <button
              onClick={handleAddToCart}
              disabled={cartLoading}
              className={`focus-ring w-full rounded-xl px-1.5 py-2 text-[11px] font-semibold leading-snug text-white transition-colors duration-200 active:scale-95 sm:py-3 sm:text-sm ${
                cartLoading
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-[#0B123A] hover:bg-[#1a245a]"
              }`}
            >
              {cartLoading ? (
                t("adding")
              ) : (
                <>
                  <span className="hidden min-[400px]:inline">{t("addToCart")}</span>
                  <span className="min-[400px]:hidden">{t("addToCartCompact")}</span>
                </>
              )}
            </button>
          ) : (
            <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 sm:py-3">
              <button
                onClick={handleDecreaseQuantity}
                disabled={cartLoading}
                className="px-2 py-1 text-lg font-bold text-gray-700 hover:text-[#0B123A] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                −
              </button>
              <span className="font-semibold text-gray-900">{quantity}</span>
              <button
                onClick={handleIncreaseQuantity}
                disabled={cartLoading || isOutOfStock}
                className="px-2 py-1 text-lg font-bold text-gray-700 hover:text-[#0B123A] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                +
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
