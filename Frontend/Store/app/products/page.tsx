import { Suspense } from "react";
import ProductsClient from "./ProductsClient";

export default function ProductsPage() {
  return (
    <Suspense fallback={<div className="p-8">Loading products...</div>}>
      <ProductsClient />
    </Suspense>
  );
}
