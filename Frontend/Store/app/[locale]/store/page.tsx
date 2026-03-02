import type { Metadata } from "next";
import StorePage from "@/app/store/page";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    alternates: {
      canonical: `/${locale}/store`,
      languages: {
        es: "/es/store",
        en: "/en/store",
      },
    },
  };
}

export default StorePage;
