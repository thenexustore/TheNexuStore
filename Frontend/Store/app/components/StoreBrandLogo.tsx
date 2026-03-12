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

  useEffect(() => {
    setIndex(0);
  }, [candidates]);

  const src = candidates[index] || "/logo.png";
  const brightness = Math.max(60, Math.min(140, Number(resolved.brightness) || 100));
  const saturation = Math.max(60, Math.min(140, Number(resolved.saturation) || 100));
  const filter = brightness === 100 && saturation === 100
    ? "none"
    : `brightness(${brightness}%) saturate(${saturation}%)`;

  return (
    <img
      src={src}
      alt={alt}
      onError={() => {
            setIndex((i) => (i < candidates.length - 1 ? i + 1 : i));
      }}
      className={className}
      style={{
        height: `${height ?? resolved.height}px`,
        objectFit: resolved.fit,
        filter,
        imageRendering: "-webkit-optimize-contrast",
        maxWidth: "100%",
        width: "auto",
        display: "block",
      }}
    />
  );
}
