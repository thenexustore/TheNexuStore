// app/components/ProductDetailSkeleton.tsx
export function ProductDetailSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="animate-pulse">
        {/* Breadcrumbs */}
        <div className="mb-6 flex items-center gap-2">
          <div className="h-4 w-16 rounded-full bg-slate-100"></div>
          <div className="h-4 w-4 rounded-full bg-slate-100"></div>
          <div className="h-4 w-24 rounded-full bg-slate-100"></div>
          <div className="h-4 w-4 rounded-full bg-slate-100"></div>
          <div className="h-4 w-32 rounded-full bg-slate-100"></div>
        </div>

        <div className="mb-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Image gallery */}
          <div className="space-y-3">
            <div className="aspect-square rounded-2xl bg-slate-100"></div>
            <div className="grid grid-cols-4 gap-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="aspect-square rounded-xl bg-slate-100"></div>
              ))}
            </div>
          </div>

          {/* Product info */}
          <div className="space-y-5">
            <div className="h-5 w-1/4 rounded-full bg-slate-100"></div>
            <div className="h-8 w-4/5 rounded-xl bg-slate-100"></div>
            <div className="h-6 w-1/3 rounded-xl bg-slate-100"></div>
            <div className="h-10 w-1/2 rounded-xl bg-slate-100"></div>
            <div className="space-y-2">
              <div className="h-4 rounded-lg bg-slate-100"></div>
              <div className="h-4 w-5/6 rounded-lg bg-slate-100"></div>
              <div className="h-4 w-4/6 rounded-lg bg-slate-100"></div>
            </div>
            <div className="h-14 rounded-2xl bg-slate-100"></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="h-12 rounded-2xl bg-slate-100"></div>
              <div className="h-12 rounded-2xl bg-slate-100"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}