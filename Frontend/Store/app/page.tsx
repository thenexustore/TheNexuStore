import type { Metadata } from "next";
import { redirect } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { buildPageMetadata, DEFAULT_STORE_LOCALE } from './lib/seo';

export const metadata: Metadata = buildPageMetadata({
  locale: DEFAULT_STORE_LOCALE,
  routePath: "/store",
  title: "TheNexuStore",
  description: "Redirecting to the localized TheNexuStore storefront.",
  indexable: false,
});

export default function HomePage() {
  redirect({ href: '/store', locale: routing.defaultLocale });
}
