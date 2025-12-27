"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getMe } from "./lib/auth";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    async function redirect() {
      const user = await getMe();

      if (user) {
        router.replace("/account");
      } else {
        router.replace("/login");
      }
    }

    redirect();
  }, [router]);
  return null;
}
