export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 sm:gap-4">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="animate-pulse rounded-2xl border border-slate-100 bg-white p-4">
          <div className="aspect-square rounded-xl bg-slate-100"></div>
          <div className="mt-4 space-y-3">
            <div className="h-3 w-1/3 rounded-full bg-slate-100"></div>
            <div className="h-5 rounded-lg bg-slate-100"></div>
            <div className="h-4 w-3/4 rounded-lg bg-slate-100"></div>
            <div className="h-6 w-1/2 rounded-lg bg-slate-100"></div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="h-10 rounded-xl bg-slate-100"></div>
            <div className="h-10 rounded-xl bg-slate-100"></div>
          </div>
        </div>
      ))}
    </div>
  );
}
