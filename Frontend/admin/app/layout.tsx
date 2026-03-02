import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "react-hot-toast";

export const metadata: Metadata = {
  title: "TheNexuStore Admin",
  description: "Admin dashboard for TheNexuStore",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50">
        <Toaster position="top-right" />
        {children}
      </body>
    </html>
  );
}