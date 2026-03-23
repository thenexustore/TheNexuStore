"use client";

import { useMemo, useState } from "react";
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
  const candidateKey = candidates.join("|");
  const [fallbackState, setFallbackState] = useState<{ key: string; failed: string[] }>({
    key: "",
    failed: [],
  });
  const failedCandidates = fallbackState.key === candidateKey ? fallbackState.failed : [];
  const src = candidates.find((candidate) => !failedCandidates.includes(candidate)) || "/logo.png";
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
        setFallbackState((current) => {
          const currentFailed = current.key === candidateKey ? current.failed : [];
          if (currentFailed.includes(src)) {
            return current.key === candidateKey ? current : { key: candidateKey, failed: currentFailed };
          }

          return {
            key: candidateKey,
            failed: [...currentFailed, src],
          };
        });
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
