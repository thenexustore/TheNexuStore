"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Heart, Star } from "lucide-react";
import { Product } from "../lib/products";

type CartItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  slug: string;
  brand: string;
  stock_status: string;
};

interface ProductCardProps {
  product: Product;
  className?: string;
}

const ProductCard: React.FC<ProductCardProps> = ({
  product,
  className = "",
}) => {
  const isOutOfStock =
    product.stock_status === "OUT_OF_STOCK" || product.stock_quantity <= 0;
  const isLowStock = product.stock_status === "LOW_STOCK";
  const [quantity, setQuantity] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Use actual rating data from product
  const rating = product.rating_avg || 0;
  const reviewCount = product.rating_count || 0;

  useEffect(() => {
    // Load cart quantity
    const cart: CartItem[] = JSON.parse(localStorage.getItem("cart") || "[]");
    const item = cart.find((i) => i.id === product.id);
    setQuantity(item ? item.quantity : 0);

    // Load favorite status from localStorage
    const favorites: string[] = JSON.parse(
      localStorage.getItem("favorites") || "[]"
    );
    setIsFavorite(favorites.includes(product.id));
  }, [product.id]);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isOutOfStock) return;

    let cart: CartItem[] = JSON.parse(localStorage.getItem("cart") || "[]");
    const index = cart.findIndex((i) => i.id === product.id);

    if (index >= 0) {
      cart[index].quantity += 1;
    } else {
      cart.push({
        id: product.id,
        name: product.title,
        price: product.price,
        quantity: 1,
        image: product.thumbnail,
        slug: product.slug,
        brand: product.brand_name,
        stock_status: product.stock_status,
      });
    }

    setQuantity((prev) => prev + 1);
    localStorage.setItem("cart", JSON.stringify(cart));
    window.dispatchEvent(new CustomEvent("cart-update"));
  };

  const handleBuyNow = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isOutOfStock) return;

    setIsLoading(true);

    // Add to cart first
    let cart: CartItem[] = JSON.parse(localStorage.getItem("cart") || "[]");
    const index = cart.findIndex((i) => i.id === product.id);

    if (index >= 0) {
      cart[index].quantity += 1;
    } else {
      cart.push({
        id: product.id,
        name: product.title,
        price: product.price,
        quantity: 1,
        image: product.thumbnail,
        slug: product.slug,
        brand: product.brand_name,
        stock_status: product.stock_status,
      });
    }

    localStorage.setItem("cart", JSON.stringify(cart));

    // Simulate API call delay
    setTimeout(() => {
      setIsLoading(false);
      // Redirect to checkout or cart page
      window.location.href = "/checkout";
    }, 500);
  };

  const toggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    let favorites: string[] = JSON.parse(
      localStorage.getItem("favorites") || "[]"
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

  return (
    <div
      className={`group relative bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 ${className}`}
    >
      <Link href={`/products/${product.slug}`} className="block p-4">
        {/* Product Image */}
        <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-gray-50 mb-4">
          <Image
            src={product.thumbnail}
            alt={product.title}
            width={300}
            height={300}
            className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105 p-4"
          />

          {/* Stock status badges */}
          {isOutOfStock && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
              <span className="rounded-full bg-red-600 px-3 py-1.5 text-sm font-bold text-white">
                Out of Stock
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

          {/* Discount badge */}
          {product.discount_percentage && product.discount_percentage > 0 && (
            <div className="absolute top-2 right-2">
              <span className="rounded-full bg-red-600 px-3 py-1 text-xs font-bold text-white">
                -{product.discount_percentage}%
              </span>
            </div>
          )}
        </div>

        <div className="flex justify-between items-center mb-3">
          <span className="text-xs font-semibold uppercase text-gray-500 tracking-wide">
            {product.brand_name}
          </span>
          <button
            onClick={toggleFavorite}
            className="p-1.5 rounded-full hover:bg-gray-100 transition-colors"
            aria-label={
              isFavorite ? "Remove from favorites" : "Add to favorites"
            }
          >
            <Heart
              size={20}
              className={
                isFavorite ? "fill-red-500 text-red-500" : "text-gray-400"
              }
            />
          </button>
        </div>

        {/* Product Details */}
        <div className="space-y-3">
          {/* Product Title */}
          <h3 className="text-lg font-bold text-gray-900 line-clamp-2 leading-tight">
            {product.title}
          </h3>

          {/* Short Description */}
          <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">
            {product.short_description ||
              "Premium quality product with excellent features and performance."}
          </p>

          {/* Rating - Only show if there are reviews */}
          {rating > 0 && reviewCount > 0 && (
            <div className="flex items-center gap-2">
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

          {/* Show message if no reviews yet */}
          {rating === 0 && reviewCount === 0 && (
            <div className="flex items-center gap-2">
              <div className="flex items-center">
                <Star size={16} className="text-gray-300" />
                <span className="ml-1 text-sm font-semibold text-gray-400">
                  No reviews yet
                </span>
              </div>
            </div>
          )}

          {/* Price */}
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-gray-900">
              €{product.price.toFixed(2)}
            </span>

            {product.compare_at_price &&
              product.compare_at_price > product.price && (
                <>
                  <span className="text-lg text-gray-500 line-through">
                    €{product.compare_at_price.toFixed(2)}
                  </span>
                  <span className="text-sm font-semibold text-red-600">
                    Save €
                    {(product.compare_at_price - product.price).toFixed(2)}
                  </span>
                </>
              )}
          </div>
        </div>
      </Link>

      {/* Action Buttons */}
      <div className="px-4 pb-4 mt-2">
        <div className="grid grid-cols-2 gap-3">
          {/* Buy Now Button */}
          <button
            onClick={handleBuyNow}
            disabled={isOutOfStock || isLoading}
            className={`flex-1 py-3 text-sm font-bold text-white rounded-lg transition-all duration-200 ${
              isOutOfStock || isLoading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-[#0B123A] hover:bg-[#1a245a] active:scale-95"
            }`}
          >
            {isLoading ? (
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
                Processing...
              </span>
            ) : (
              "Buy Now"
            )}
          </button>

          {/* Add to Cart / Quantity Selector */}
          {isOutOfStock ? (
            <button
              disabled
              className="w-full py-3 text-sm font-semibold text-white bg-gray-400 rounded-lg cursor-not-allowed"
            >
              Out of Stock
            </button>
          ) : quantity === 0 ? (
            <button
              onClick={handleAddToCart}
              className="w-full py-3 text-sm font-semibold text-white bg-[#0B123A] hover:bg-[#1a245a] rounded-lg transition-colors duration-200 active:scale-95"
            >
              Add to Cart
            </button>
          ) : (
            <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-4 py-2">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  let cart: CartItem[] = JSON.parse(
                    localStorage.getItem("cart") || "[]"
                  );
                  const index = cart.findIndex((i) => i.id === product.id);

                  if (index >= 0) {
                    if (cart[index].quantity > 1) {
                      cart[index].quantity -= 1;
                      setQuantity((prev) => prev - 1);
                    } else {
                      cart = cart.filter((i) => i.id !== product.id);
                      setQuantity(0);
                    }
                    localStorage.setItem("cart", JSON.stringify(cart));
                    window.dispatchEvent(new CustomEvent("cart-update"));
                  }
                }}
                className="px-2 py-1 text-lg font-bold text-gray-700 hover:text-[#0B123A] transition-colors"
              >
                −
              </button>
              <span className="font-semibold text-gray-900">{quantity}</span>
              <button
                onClick={handleAddToCart}
                className="px-2 py-1 text-lg font-bold text-gray-700 hover:text-[#0B123A] transition-colors"
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
