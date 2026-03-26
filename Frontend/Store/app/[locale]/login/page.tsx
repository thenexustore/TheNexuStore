import type { Metadata } from "next";
import LoginPage from "../../login/page";
import { getUtilityPageMetadata } from "@/app/lib/utility-metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return getUtilityPageMetadata({ key: "login", locale, routePath: "/login" });
}

export default LoginPage;
