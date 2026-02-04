"use client";

import Footer from "./components/Footer";
import Navbar from "./components/Navbar";
import "./globals.css";
import { usePathname } from "next/navigation";
import { CartProvider } from "../context/CartContext";
import { AuthProvider } from "./providers/AuthProvider";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const hideLayout =
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password");

  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <CartProvider>
            {!hideLayout && <Navbar />}

            <main className={!hideLayout ? "" : undefined}>{children}</main>

            {!hideLayout && <Footer />}
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
