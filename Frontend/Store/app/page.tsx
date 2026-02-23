"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { getMe } from "./lib/auth";

export default function HomePage() {
  const router = useRouter();
  const hasRedirected = useRef(false);

  return null;
}
