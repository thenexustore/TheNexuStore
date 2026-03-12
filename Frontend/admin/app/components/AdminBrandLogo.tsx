"use client";

import { useEffect, useMemo, useState } from "react";
import {
  resolveAdminLogoCandidates,
  type AdminLogoFit,
  type AdminSettings,
} from "@/lib/admin-settings";

export default function AdminBrandLogo({
  settings,
  variant = "light",
  className,
  alt = "Logo",
  fit,
  height,
}: {
  settings: AdminSettings;
  variant?: "light" | "dark";
  className?: string;
  alt?: string;
  fit?: AdminLogoFit;
  height?: number;
}) {
  const candidates = useMemo(() => resolveAdminLogoCandidates(settings, variant), [settings, variant]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [candidates]);

  const src = candidates[index] || "/logo.png";
  const brightness = Math.max(60, Math.min(140, Number(settings.brandLogoBrightness) || 100));
  const saturation = Math.max(60, Math.min(140, Number(settings.brandLogoSaturation) || 100));
  const filter = brightness === 100 && saturation === 100
    ? "none"
    : `brightness(${brightness}%) saturate(${saturation}%)`;

  return (
    <img
      src={src}
      alt={alt}
      onError={() => {
            setIndex((current) => (current < candidates.length - 1 ? current + 1 : current));
      }}
      className={className}
      style={{
        height: `${height ?? settings.brandLogoHeight}px`,
        objectFit: fit ?? settings.brandLogoFit,
        filter,
        imageRendering: "-webkit-optimize-contrast",
        maxWidth: "100%",
        width: "auto",
        display: "block",
      }}
    />
  );
}
