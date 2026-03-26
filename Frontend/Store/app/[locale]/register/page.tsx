import type { Metadata } from "next";
import RegisterPage from "../../register/page";
import { getUtilityPageMetadata } from "@/app/lib/utility-metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return getUtilityPageMetadata({ key: "register", locale, routePath: "/register" });
}

export default RegisterPage;
