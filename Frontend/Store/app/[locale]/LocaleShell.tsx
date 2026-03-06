"use client";

import { usePathname } from "@/i18n/navigation";
import Footer from "../components/Footer";
import Navbar from "../components/Navbar";

export default function LocaleShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "";
  const hideLayout =
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password");

  return (
    <>
      {!hideLayout && <Navbar />}
      <main>{children}</main>
      {!hideLayout && <Footer />}
    </>
  );
}
