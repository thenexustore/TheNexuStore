"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Route error boundary caught an error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-white text-slate-900 flex items-center justify-center p-6">
      <div className="w-full max-w-xl border-2 border-black bg-white p-8 shadow-[10px_10px_0px_0px_rgba(0,0,0,1)]">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-red-600">
          Something went wrong
        </p>
        <p className="mt-4 text-sm font-semibold break-words">
          {error.message || "Unexpected client error"}
        </p>
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={reset}
            className="bg-black px-4 py-2 text-white text-xs font-black uppercase tracking-widest"
          >
            Try again
          </button>
          <a
            href="/"
            className="border-2 border-black px-4 py-2 text-xs font-black uppercase tracking-widest"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}
