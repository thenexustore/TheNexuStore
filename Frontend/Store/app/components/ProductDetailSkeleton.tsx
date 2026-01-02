// app/components/ProductDetailSkeleton.tsx
export function ProductDetailSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="animate-pulse">
        <div className="mb-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
          <div className="aspect-square rounded-lg bg-gray-200"></div>
          <div className="space-y-4">
            <div className="h-8 w-3/4 rounded bg-gray-200"></div>
            <div className="h-4 w-1/2 rounded bg-gray-200"></div>
            <div className="h-12 w-1/4 rounded bg-gray-200"></div>
            <div className="h-24 rounded bg-gray-200"></div>
            <div className="h-12 rounded bg-gray-200"></div>
          </div>
        </div>
      </div>
    </div>
  );
}