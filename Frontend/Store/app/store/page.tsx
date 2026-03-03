"use client";

import HomeDynamicSections from "./HomeDynamicSections";

export default function StorePage() {
  return (
    <main className="min-h-screen bg-slate-50 pb-10">
      <div className="mx-auto flex w-full flex-col items-center gap-8">
        <HomeDynamicSections />
      </div>
    </main>
  );
}
