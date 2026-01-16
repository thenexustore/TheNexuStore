// app/products/[slug]/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import ProductCard from "../../components/ProductCard";
import ReviewForm from "../../components/ReviewForm";
import { productAPI, ProductDetail, Product } from "../../lib/products";
import { ProductDetailSkeleton } from "../../components/ProductDetailSkeleton";

export default function ProductPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);
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
      } catch (err) {
        setError("Failed to load product");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      fetchProductData();
    }
  }, [slug]);

  const handleAddToCart = () => {
    console.log("Add to cart:", {
      productId: product?.id,
      variantId: selectedVariant,
      quantity,
    });
  };

  const handleReviewSubmit = async (reviewData: {
    rating: number;
    title?: string;
    comment?: string;
  }) => {
    try {
      if (!product) return;

      const response = await productAPI.createReview(product.id, reviewData);
      console.log("Review submitted:", response);
    } catch (err) {
      console.error("Failed to submit review:", err);
    }
  };

  if (loading) {
    return <ProductDetailSkeleton />;
  }

  if (error || !product) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-500">
            {error || "Product not found"}
          </h2>
          <a
            href="/products"
            className="mt-4 inline-block text-blue-600 hover:underline"
          >
            Back to Products
          </a>
        </div>
      </div>
    );
  }

  const currentVariant =
    product.variants.find((v) => v.id === selectedVariant) ||
    product.variants[0];
  const images =
    currentVariant?.images?.length > 0 ? currentVariant.images : product.images;
  const isOutOfStock = currentVariant?.stock_status === "OUT_OF_STOCK";

  return (
    <div className="container mx-auto px-4 py-8 bg-white text-black">
      <div className="mb-6 text-sm text-gray-600">
        <a href="/" className="hover:underline">
          Home
        </a>
        <span className="mx-2">/</span>
        <a href="/products" className="hover:underline">
          Products
        </a>
        <span className="mx-2">/</span>
        <span>{product.title}</span>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div>
          <div className="aspect-square overflow-hidden rounded-lg bg-gray-100">
            {images.length > 0 ? (
              <div className="relative h-full w-full bg-gray-100">
                <Image
                  src={
                    imageError
                      ? "/No_Image_Available.png"
                      : images[selectedImage]?.url || "/No_Image_Available.png"
                  }
                  alt={product.title}
                  width={600}
                  height={600}
                  priority={selectedImage === 0}
                  className="h-full w-full object-cover object-center"
                  onError={() => {
                    if (!imageError) setImageError(true);
                  }}
                />
              </div>
            ) : (
              <div className="flex h-full items-center justify-center bg-gray-100">
                <span className="text-gray-400">No Image</span>
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
                      ? "border-blue-500 ring-2 ring-blue-200"
                      : "border-gray-200 hover:border-gray-400"
                  }`}
                >
                  <div className="relative h-full w-full bg-gray-100">
                    <Image
                      src={image?.url || "/No_Image_Available.png"}
                      alt={`${product.title} - ${index + 1}`}
                      width={80}
                      height={80}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        // @ts-ignore
                        e.currentTarget.src = "/No_Image_Available.png";
                      }}
                    />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <h1 className="mb-2 text-3xl font-bold">{product.title}</h1>

          <div className="mb-4 flex items-center gap-4">
            <div className="flex items-center">
              <span className="text-2xl font-bold">
                €{currentVariant.price.toFixed(2)}
              </span>
              {currentVariant.compare_at_price &&
                currentVariant.compare_at_price > currentVariant.price && (
                  <span className="ml-2 text-lg text-gray-500 line-through">
                    €{currentVariant.compare_at_price.toFixed(2)}
                  </span>
                )}
            </div>

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
                ? `In Stock (${currentVariant.stock_quantity} available)`
                : currentVariant.stock_status === "LOW_STOCK"
                ? `Low Stock (${currentVariant.stock_quantity} left)`
                : "Out of Stock"}
            </span>
          </div>

          {product.variants.length > 1 && (
            <div className="mb-6">
              <h3 className="mb-2 font-medium">Options</h3>
              <div className="flex flex-wrap gap-2">
                {product.variants.map((variant) => (
                  <button
                    key={variant.id}
                    onClick={() => setSelectedVariant(variant.id)}
                    className={`rounded border px-4 py-2 ${
                      selectedVariant === variant.id
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-gray-300 hover:border-gray-400"
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
              <h3 className="mb-2 font-medium">Specifications</h3>
              <div className="space-y-1">
                {product.attributes.map((attr) => (
                  <div key={attr.key} className="flex">
                    <span className="w-32 text-gray-600">{attr.name}:</span>
                    <span>{attr.values.join(", ")}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mb-8">
            <div className="mb-4 flex items-center gap-4">
              <div className="flex items-center border border-gray-300 rounded">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="px-3 py-2 hover:bg-gray-100"
                  disabled={isOutOfStock}
                >
                  -
                </button>
                <input
                  type="number"
                  min="1"
                  max={currentVariant.stock_quantity}
                  value={quantity}
                  onChange={(e) =>
                    setQuantity(Math.max(1, parseInt(e.target.value) || 1))
                  }
                  className="w-16 text-center"
                  disabled={isOutOfStock}
                />
                <button
                  onClick={() =>
                    setQuantity(
                      Math.min(currentVariant.stock_quantity, quantity + 1)
                    )
                  }
                  className="px-3 py-2 hover:bg-gray-100"
                  disabled={
                    isOutOfStock || quantity >= currentVariant.stock_quantity
                  }
                >
                  +
                </button>
              </div>

              <button
                onClick={handleAddToCart}
                disabled={isOutOfStock}
                className={`flex-1 rounded px-6 py-3 font-medium ${
                  isOutOfStock
                    ? "cursor-not-allowed bg-gray-300 text-gray-500"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
              >
                {isOutOfStock ? "Out of Stock" : "Add to Cart"}
              </button>
            </div>
          </div>

          {product.description_html && (
            <div className="mb-8">
              <h3 className="mb-4 text-xl font-semibold">Description</h3>
              <div
                className="prose max-w-none"
                dangerouslySetInnerHTML={{ __html: product.description_html }}
              />
            </div>
          )}
        </div>
      </div>

      {relatedProducts.length > 0 && (
        <div>
          <h2 className="mb-6 text-2xl font-bold">Related Products</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {relatedProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
