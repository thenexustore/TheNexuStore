import StorePage from '../../store/page';

export async function generateMetadata({ params }: any) {
  const { locale } = await params;

  return {
    alternates: {
      canonical: `/${locale}/store`,
      languages: {
        es: '/es/store',
        en: '/en/store'
      }
    }
  };
}

export default StorePage;
