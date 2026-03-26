import OrderTrackingPage from '@/app/order/track/[token]/page';
import type { Metadata } from "next";
import { getUtilityPageMetadata } from "@/app/lib/utility-metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; token: string }>;
}): Promise<Metadata> {
  const { locale, token } = await params;
  return getUtilityPageMetadata({
    key: "order-tracking",
    locale,
    routePath: `/order/track/${token}`,
  });
}

export default function LocalizedOrderTrackingPage() {
  return <OrderTrackingPage />;
}
