import type { Metadata } from "next";
import ChatPage from "../../chat/page";
import { getUtilityPageMetadata } from "@/app/lib/utility-metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return getUtilityPageMetadata({ key: "chat", locale, routePath: "/chat" });
}

export default ChatPage;
