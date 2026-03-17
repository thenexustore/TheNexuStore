import "./globals.css";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Inter } from "next/font/google";
import AppProviders from "./providers/AppProviders";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  other: {
    google: "notranslate",
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 5,
  },
  themeColor: "#0b123a",
} as Metadata;

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const locale = cookieStore.get("NEXT_LOCALE")?.value || "es";

  return (
    <html lang={locale} translate="no" className={`notranslate ${inter.variable}`} suppressHydrationWarning>
      <body translate="no" className="antialiased">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
