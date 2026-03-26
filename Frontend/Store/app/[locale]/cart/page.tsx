import type { Metadata } from "next";
import CartPage from "../../cart/page";
import { getUtilityPageMetadata } from "@/app/lib/utility-metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return getUtilityPageMetadata({ key: "cart", locale, routePath: "/cart" });
}

export default CartPage;
