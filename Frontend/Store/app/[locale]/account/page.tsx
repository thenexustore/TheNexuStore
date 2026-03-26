import type { Metadata } from "next";
import AccountPage from "../../account/page";
import { getUtilityPageMetadata } from "@/app/lib/utility-metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return getUtilityPageMetadata({ key: "account", locale, routePath: "/account" });
}

export default AccountPage;
