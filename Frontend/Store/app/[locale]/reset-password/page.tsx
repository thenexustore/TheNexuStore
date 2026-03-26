import type { Metadata } from "next";
import ResetPasswordPage from "../../reset-password/page";
import { getUtilityPageMetadata } from "@/app/lib/utility-metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return getUtilityPageMetadata({
    key: "reset-password",
    locale,
    routePath: "/reset-password",
  });
}

export default ResetPasswordPage;
