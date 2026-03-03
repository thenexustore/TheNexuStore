import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import { cookies } from "next/headers";

export const metadata: Metadata = {
  title: "TheNexuStore Admin",
  description: "Admin dashboard for TheNexuStore",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const locale = cookieStore.get("NEXT_LOCALE")?.value || "es";

  return (
    <html lang={locale}>
      <body className="bg-gray-50">
        <Toaster position="top-right" />
        {children}
      </body>
    </html>
  );
}
