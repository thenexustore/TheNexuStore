"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();
  const hasRedirected = useRef(false);

  useEffect(() => {
    if (!hasRedirected.current) {
      hasRedirected.current = true;

      const { origin, pathname } = window.location;
      if (pathname === "/") {
        router.replace("/store");
      }
    }
  }, [router]);

  return null;
}
