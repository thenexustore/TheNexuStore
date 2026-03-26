import type { Metadata } from "next";
import ForgotPasswordPage from "../../forgot-password/page";
import { getUtilityPageMetadata } from "@/app/lib/utility-metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return getUtilityPageMetadata({
    key: "forgot-password",
    locale,
    routePath: "/forgot-password",
  });
}

export default ForgotPasswordPage;
