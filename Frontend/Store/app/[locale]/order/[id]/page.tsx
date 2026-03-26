import type { Metadata } from "next";
import OrderConfirmationPage from "../../../order/[id]/page";
import { getUtilityPageMetadata } from "@/app/lib/utility-metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { locale, id } = await params;
  return getUtilityPageMetadata({
    key: "order",
    locale,
    routePath: `/order/${id}`,
  });
}

export default OrderConfirmationPage;
