import "./globals.css";
import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import localFont from "next/font/local";
import AppProviders from "./providers/AppProviders";
import { getDefaultSiteMetadata } from "./lib/seo";

const inter = localFont({
  src: [
    {
      path: "../public/fonts/inter-variable-normal.woff2",
      weight: "100 900",
      style: "normal",
    },
    {
      path: "../public/fonts/inter-variable-italic.woff2",
      weight: "100 900",
      style: "italic",
    },
  ],
  variable: "--font-inter",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#0b123a",
};

export const metadata: Metadata = getDefaultSiteMetadata();

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
