import type { Metadata } from "next";
import CheckoutPage from "../../checkout/page";
import { getUtilityPageMetadata } from "@/app/lib/utility-metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return getUtilityPageMetadata({ key: "checkout", locale, routePath: "/checkout" });
}

export default CheckoutPage;
