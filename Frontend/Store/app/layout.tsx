import "./globals.css";
import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import AppProviders from "./providers/AppProviders";
import {
  DEFAULT_STORE_LOCALE,
  getDefaultSiteMetadata,
  getHtmlLanguageTag,
  resolveStoreLocale,
} from "./lib/seo";

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
  const requestLocale = await getLocale().catch(() => DEFAULT_STORE_LOCALE);
  const locale = resolveStoreLocale(requestLocale);
  const messages = await getMessages({ locale });

  return (
    <html
      lang={getHtmlLanguageTag(locale)}
      translate="no"
      className={`notranslate ${inter.variable}`}
      suppressHydrationWarning
    >
      <body translate="no" className="antialiased">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <AppProviders>{children}</AppProviders>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
