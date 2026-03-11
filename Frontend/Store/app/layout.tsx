import "./globals.css";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import AppProviders from "./providers/AppProviders";

export const metadata: Metadata = {
  other: {
    google: "notranslate",
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const locale = cookieStore.get("NEXT_LOCALE")?.value || "es";

  return (
    <html lang={locale} translate="no" className="notranslate" suppressHydrationWarning>
      <body translate="no">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
