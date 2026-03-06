import { redirect } from "next/navigation";

export default async function LocalizedHomeBuilderRedirectPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/homepage-sections`);
}
