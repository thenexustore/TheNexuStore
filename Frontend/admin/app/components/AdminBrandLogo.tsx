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
        setIndex((current) => (current < candidates.length - 1 ? current + 1 : current));
      }}
      className={className}
      style={{
        height: `${height ?? settings.brandLogoHeight}px`,
        objectFit: fit ?? settings.brandLogoFit,
        opacity: loaded ? 1 : 0.7,
        transition: "opacity 120ms ease",
        filter: `brightness(${settings.brandLogoBrightness}%) saturate(${settings.brandLogoSaturation}%)`,
      }}
    />
  );
}
