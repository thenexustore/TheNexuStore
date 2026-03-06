"use client";

import NextLink from "next/link";
import React, { useEffect, useState } from "react";
import ProductCard from "../components/ProductCard";
import { productAPI, Product } from "../lib/products";

const StoreExplore: React.FC = () => {
  const [newArrivals, setNewArrivals] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchNewArrivals = async () => {
      try {
        setLoading(true);
        // Get newest products (sorted by newest)
        const data = await productAPI.getProducts({
          limit: 8,
          sort_by: "newest",
        });
        setNewArrivals(data.products || []);
      } catch (err) {
        setError("Failed to load new arrivals");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchNewArrivals();
  }, []);

  if (loading) {
    return (
      <section>
        <div className="mx-4">
          <div className="mb-8">
            <h2 className="text-3xl font-bold md:text-4xl lg:text-5xl">Explore</h2>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-square rounded-lg bg-gray-200"></div>
                <div className="mt-4 space-y-2">
                  <div className="h-4 rounded bg-gray-200"></div>
                  <div className="h-6 rounded bg-gray-200"></div>
                  <div className="h-4 rounded bg-gray-200"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section>
        <div className="container mx-4">
          <div className="mb-8">
            <h2 className="text-3xl font-bold md:text-4xl lg:text-5xl">Explore</h2>
          </div>
          <div className="text-center text-red-500">{error}</div>
        </div>
      </section>
    );
  }

  if (newArrivals.length === 0) {
    return null;
  }

  return (
    <section>
      <div className="container mx-4">
        <div className="mb-8 flex items-center justify-between">
          <h2 className="text-3xl font-bold md:text-4xl lg:text-5xl">Explore</h2>
          <NextLink
            href="/products?sort_by=newest"
            className="text-blue-600 hover:underline"
          >
            View All
          </NextLink>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {newArrivals.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default StoreExplore;
