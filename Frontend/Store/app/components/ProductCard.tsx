"use client";

import React, { useEffect, useState } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { Star } from "lucide-react";
import { Product } from "../lib/products";
import { useCart } from "../../context/CartContext";
import { useTranslations } from "next-intl";

interface ProductCardProps {
  product: Product;
  className?: string;
}

const ProductCard: React.FC<ProductCardProps> = ({
  product,
  className = "",
}) => {
  if (!product) {
    return (
      <div className={`bg-white rounded-xl shadow-sm p-4 ${className}`}>
        <div className="text-center text-gray-500 py-8">
          Product not available
        </div>
      </div>
    );
  }

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
      // Use sku_id instead of sku_code
      await addItem(product.sku_code, 1);

      let legacyCart: any[] = JSON.parse(localStorage.getItem("cart") || "[]");
      const index = legacyCart.findIndex((i: any) => i.id === product.id);

      if (index >= 0) {
        legacyCart[index].quantity += 1;
      } else {
        legacyCart.push({
          id: product.id,
          sku_id: product.sku_id,
          sku_code: product.sku_code,
          name: product.title,
          price: product.price,
          quantity: 1,
          image: product.thumbnail,
          slug: product.slug,
          brand: product.brand_name,
          stock_status: product.stock_status,
        });
      }

      localStorage.setItem("cart", JSON.stringify(legacyCart));
      window.dispatchEvent(new CustomEvent("cart-update"));
    } catch (error) {
      console.error("Failed to add to cart:", error);

      let legacyCart: any[] = JSON.parse(localStorage.getItem("cart") || "[]");
      const index = legacyCart.findIndex((i: any) => i.id === product.id);

      if (index >= 0) {
        legacyCart[index].quantity += 1;
      } else {
        legacyCart.push({
          id: product.id,
          sku_id: product.sku_id,
          sku_code: product.sku_code,
          name: product.title,
          price: product.price,
          quantity: 1,
          image: product.thumbnail,
          slug: product.slug,
          brand: product.brand_name,
          stock_status: product.stock_status,
        });
      }

      localStorage.setItem("cart", JSON.stringify(legacyCart));
      window.dispatchEvent(new CustomEvent("cart-update"));
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
      // Use sku_id
      await addItem(product.sku_id || product.sku_code, 1);

      let legacyCart: any[] = JSON.parse(localStorage.getItem("cart") || "[]");
      const index = legacyCart.findIndex((i: any) => i.id === product.id);

      if (index >= 0) {
        legacyCart[index].quantity += 1;
      } else {
        legacyCart.push({
          id: product.id,
          sku_id: product.sku_id,
          sku_code: product.sku_code,
          name: product.title,
          price: product.price,
          quantity: 1,
          image: product.thumbnail,
          slug: product.slug,
          brand: product.brand_name,
          stock_status: product.stock_status,
        });
      }

      localStorage.setItem("cart", JSON.stringify(legacyCart));
      window.dispatchEvent(new CustomEvent("cart-update"));
    } catch (error) {
      console.error("Failed to increase quantity:", error);

      let legacyCart: any[] = JSON.parse(localStorage.getItem("cart") || "[]");
      const index = legacyCart.findIndex((i: any) => i.id === product.id);

      if (index >= 0) {
        legacyCart[index].quantity += 1;
        localStorage.setItem("cart", JSON.stringify(legacyCart));
        window.dispatchEvent(new CustomEvent("cart-update"));
      }
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

      let legacyCart: any[] = JSON.parse(localStorage.getItem("cart") || "[]");
      const index = legacyCart.findIndex((i: any) => i.id === product.id);

      if (index >= 0) {
        if (legacyCart[index].quantity > 1) {
          legacyCart[index].quantity -= 1;
        } else {
          legacyCart = legacyCart.filter((i: any) => i.id !== product.id);
        }
        localStorage.setItem("cart", JSON.stringify(legacyCart));
        window.dispatchEvent(new CustomEvent("cart-update"));
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
      // Use sku_id
      await addItem(product.sku_id || product.sku_code, 1);

      let legacyCart: any[] = JSON.parse(localStorage.getItem("cart") || "[]");
      const index = legacyCart.findIndex((i: any) => i.id === product.id);

      if (index >= 0) {
        legacyCart[index].quantity += 1;
      } else {
        legacyCart.push({
          id: product.id,
          sku_id: product.sku_id,
          sku_code: product.sku_code,
          name: product.title,
          price: product.price,
          quantity: 1,
          image: product.thumbnail,
          slug: product.slug,
          brand: product.brand_name,
          stock_status: product.stock_status,
        });
      }

      localStorage.setItem("cart", JSON.stringify(legacyCart));
      window.dispatchEvent(new CustomEvent("cart-update"));

      setTimeout(() => {
        router.push("/cart");
      }, 500);
    } catch (error) {
      console.error("Failed to buy now:", error);
      setBuyNowLoading(false);
      setIsLoading(false);

      let legacyCart: any[] = JSON.parse(localStorage.getItem("cart") || "[]");
      const index = legacyCart.findIndex((i: any) => i.id === product.id);

      if (index >= 0) {
        legacyCart[index].quantity += 1;
      } else {
        legacyCart.push({
          id: product.id,
          sku_id: product.sku_id,
          sku_code: product.sku_code,
          name: product.title,
          price: product.price,
          quantity: 1,
          image: product.thumbnail,
          slug: product.slug,
          brand: product.brand_name,
          stock_status: product.stock_status,
        });
      }

      localStorage.setItem("cart", JSON.stringify(legacyCart));
      window.dispatchEvent(new CustomEvent("cart-update"));

      setTimeout(() => {
        router.push("/cart");
      }, 500);
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

  const imageSrc =
    product.thumbnail && product.thumbnail.trim() !== ""
      ? product.thumbnail
      : "/No_Image_Available.png";

  return (
    <div
      className={`group relative flex h-full min-w-0 flex-col overflow-hidden rounded-xl bg-white shadow-sm transition-all duration-300 hover:shadow-lg ${
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
              {buyNowLoading ? "Adding to cart..." : "Loading..."}
            </span>
          </div>
        </div>
      )}

      <Link href={`/products/${product.slug}`} className="block p-4">
        <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-gray-50 mb-4">
          <img
            src={imageSrc}
            alt={product.title}
            loading="lazy"
            decoding="async"
            style={{
              height: "100%",
              width: "100%",
              objectFit: "contain",
              padding: "2px",
            }}
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = "/No_Image_Available.png";
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
            <div className="absolute top-2 left-2">
              <span className="rounded-full bg-amber-500 px-3 py-1 text-xs font-bold text-white">
                Low Stock
              </span>
            </div>
          )}

          {product.discount_percentage && product.discount_percentage > 0 && (
            <div className="absolute top-2 right-2">
              <span className="rounded-full bg-red-600 px-3 py-1 text-xs font-bold text-white">
                -{product.discount_percentage}%
              </span>
            </div>
          )}

          <button
            onClick={toggleFavorite}
            className="absolute top-2 right-2 z-10 p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-md hover:bg-white transition-colors"
            style={{ right: product.discount_percentage ? "3.5rem" : "0.5rem" }}
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

        <div className="flex justify-between items-center mb-3">
          <span className="text-xs font-semibold uppercase text-gray-500 tracking-wide">
            {product.brand_name}
          </span>
          {cartItem && (
            <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded">
              {quantity} in cart
            </span>
          )}
        </div>

        <div className="space-y-3 min-w-0">
          <h3 className="line-clamp-2 min-h-12 break-words text-base font-bold leading-tight text-gray-900 sm:text-lg">
            {product.title}
          </h3>

          <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">
            {product.short_description ||
              "Premium quality product with excellent features and performance."}
          </p>

          {rating > 0 && reviewCount > 0 && (
            <div className="flex min-h-14 flex-wrap items-center gap-x-2 gap-y-1">
              <div className="flex items-center">
                <Star size={16} className="fill-amber-400 text-amber-400" />
                <span className="ml-1 text-sm font-semibold">
                  {rating.toFixed(1)}
                </span>
              </div>
              <span className="text-xs text-gray-500">/ 5</span>
              <span className="text-xs text-gray-400">
                ({reviewCount} {reviewCount === 1 ? "review" : "reviews"})
              </span>
            </div>
          )}

          <div className="flex min-h-14 flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-xl font-bold text-gray-900 sm:text-2xl">
              €{product.price.toFixed(2)}
            </span>

            {product.compare_at_price &&
              product.compare_at_price > product.price && (
                <>
                  <span className="text-sm text-gray-500 line-through sm:text-base">
                    €{product.compare_at_price.toFixed(2)}
                  </span>
                  <span className="text-xs font-semibold text-red-600 sm:text-sm">
                    Save €
                    {(product.compare_at_price - product.price).toFixed(2)}
                  </span>
                </>
              )}
          </div>
        </div>
      </Link>

      <div className="mt-auto px-4 pb-4">
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          <button
            onClick={handleBuyNow}
            disabled={isOutOfStock || buyNowLoading || cartLoading}
            className={`w-full py-3 text-xs font-bold text-white rounded-lg transition-all duration-200 sm:text-sm ${
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
                Adding...
              </span>
            ) : (
              "Buy Now"
            )}
          </button>

          {isOutOfStock ? (
            <button
              disabled
              className="w-full rounded-lg bg-gray-400 py-3 text-xs font-semibold text-white cursor-not-allowed sm:text-sm"
            >
              {t("outOfStock")}
            </button>
          ) : quantity === 0 ? (
            <button
              onClick={handleAddToCart}
              disabled={cartLoading}
              className={`w-full py-3 text-xs font-semibold text-white rounded-lg transition-colors duration-200 active:scale-95 sm:text-sm ${
                cartLoading
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-[#0B123A] hover:bg-[#1a245a]"
              }`}
            >
              {cartLoading ? "Adding..." : t("addToCart")}
            </button>
          ) : (
            <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-4 py-2">
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
