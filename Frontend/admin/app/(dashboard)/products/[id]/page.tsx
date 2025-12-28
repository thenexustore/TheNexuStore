"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { fetchAdminData } from "@/lib/api";

export default function ProductViewPage() {
  const { id } = useParams();
  const router = useRouter();
  const [product, setProduct] = useState<any>(null);

  useEffect(() => {
    fetchAdminData(`products/${id}`).then(setProduct);
  }, [id]);

  if (!product) return <div className="p-6">Loading...</div>;

  const sku = product.skus?.[0];
  const price = sku?.prices?.[0];
  const inventory = sku?.inventory?.[0];

  return (
    <div className="p-6">
      <div className="flex justify-between mb-6">
        <h1 className="text-2xl font-bold">{product.title}</h1>
        <button
          onClick={() => router.push(`/products/${id}/edit`)}
          className="bg-black text-white px-4 py-2 rounded"
        >
          Edit
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <p>
            <b>Brand:</b> {product.brand?.name}
          </p>
          <p>
            <b>Status:</b> {product.status}
          </p>
          <p>
            <b>Price:</b> ₹{price?.sale_price}
          </p>
          <p>
            <b>MRP:</b> ₹{price?.compare_at_price}
          </p>
          <p>
            <b>Stock:</b> {inventory?.qty_on_hand}
          </p>

          <div className="mt-4">
            <b>Categories:</b>
            <div className="flex gap-2 mt-1 flex-wrap">
              {product.categories.map((c: any) => (
                <span
                  key={c.id}
                  className="bg-gray-100 px-2 py-1 rounded text-sm"
                >
                  {c.name}
                </span>
              ))}
            </div>
          </div>

          <div
            className="prose mt-4"
            dangerouslySetInnerHTML={{ __html: product.description_html }}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          {product.media.map((m: any) => (
            <img
              key={m.id}
              src={m.url}
              className="rounded border object-cover h-40 w-full"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
