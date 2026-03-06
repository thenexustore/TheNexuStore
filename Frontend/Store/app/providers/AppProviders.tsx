"use client";

import type { ReactNode } from "react";
import { AuthProvider } from "./AuthProvider";
import { CartProvider } from "../../context/CartContext";

export default function AppProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <CartProvider>{children}</CartProvider>
    </AuthProvider>
  );
}
