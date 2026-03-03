import ProductPage from '../../../products/[slug]/page';

export async function generateMetadata({ params }: any) {
  const { slug, locale } = await params;

  return {
    alternates: {
      canonical: `/${locale}/products/${slug}`,
      languages: {
        es: `/es/products/${slug}`,
        en: `/en/products/${slug}`
      }
    }
  };
}

export default ProductPage;
