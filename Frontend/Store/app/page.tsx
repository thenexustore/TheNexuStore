"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { getMe } from "./lib/auth";

export default function HomePage() {
  const router = useRouter();
  const hasRedirected = useRef(false);

  useEffect(() => {
    if (hasRedirected.current) return;
    hasRedirected.current = true;

    (async () => {
      try {
        const user = await getMe();
        router.replace(user ? "/store" : "/login");
      } catch {
        router.replace("/login");
      }
    })();
  }, [router]);

  return null;
}
