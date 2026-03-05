"use client";

import { useEffect, useMemo, useState } from "react";
import { loadStoreBranding, type StoreBranding } from "@/app/lib/admin-branding";

export default function StoreBrandLogo({
  branding,
  variant = "light",
  alt = "Logo",
  className,
  height,
}: {
  branding?: StoreBranding;
  variant?: "light" | "dark";
  alt?: string;
  className?: string;
  height?: number;
}) {
  const fallbackBranding = useMemo(() => loadStoreBranding(), []);
  const resolved = branding ?? fallbackBranding;
  const candidates = variant === "dark" ? resolved.darkSrcCandidates : resolved.srcCandidates;
  const [index, setIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setIndex(0);
    setLoaded(false);
  }, [candidates]);

  const src = candidates[index] || "/logo.png";

  return (
    <img
      src={src}
      alt={alt}
      onLoad={() => setLoaded(true)}
      onError={() => {
        setLoaded(false);
        setIndex((i) => (i < candidates.length - 1 ? i + 1 : i));
      }}
      className={className}
      style={{
        height: `${height ?? resolved.height}px`,
        objectFit: resolved.fit,
        opacity: loaded ? 1 : 0.7,
        transition: "opacity 120ms ease",
      }}
    />
  );
}
