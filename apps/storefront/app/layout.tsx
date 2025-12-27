"use client";

import Footer from "./components/Footer";
import Navbar from "./components/Navbar";
import "./globals.css";
import { usePathname } from "next/navigation";

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
      <body className="min-h-screen flex flex-col font-sans">
        {!hideLayout && <Navbar />}

        <main className="flex-1">{children}</main>

        {!hideLayout && <Footer />}
      </body>
    </html>
  );
}
