import "./globals.css";
import { cookies } from "next/headers";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const locale = cookieStore.get("NEXT_LOCALE")?.value || "es";

  return (
    <html lang={locale}>
      <body>{children}</body>
    </html>
  );
}
