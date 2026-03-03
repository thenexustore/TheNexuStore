import { redirect } from '@/i18n/navigation';

export default async function LocaleHome({ params }: any) {
  const { locale } = await params;
  redirect({ href: '/store', locale });
}
