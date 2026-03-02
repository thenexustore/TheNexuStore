import type { Metadata } from "next";
import ProductPage from "@/app/products/[slug]/page";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { slug, locale } = await params;
  return {
    alternates: {
      canonical: `/${locale}/products/${slug}`,
      languages: {
        es: `/es/products/${slug}`,
        en: `/en/products/${slug}`,
      },
    },
  };
}

export default ProductPage;
