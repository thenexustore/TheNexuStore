import { fetchWithAuth } from "../utils";

export type ChatStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
export type ChatSenderType = "CUSTOMER" | "STAFF" | "SYSTEM";

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_type: ChatSenderType;
  sender_id: string | null;
  content: string;
  image_base64?: string | null;
  is_read: boolean;
  created_at: string;
}

export interface ChatConversation {
  id: string;
  customer_id: string;
  status: ChatStatus;
  subject: string | null;
  created_at: string;
  updated_at: string;
  customer?: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
  };
  messages: ChatMessage[];
  _count?: { messages: number };
}

export interface ConversationsResponse {
  conversations: ChatConversation[];
  total: number;
  page: number;
  limit: number;
}

export async function fetchConversations(
  page = 1,
  limit = 20,
  status?: ChatStatus
): Promise<ConversationsResponse> {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (status) params.set("status", status);
  return fetchWithAuth(`/admin/chat/conversations?${params}`);
}

export async function fetchConversation(id: string): Promise<ChatConversation> {
  return fetchWithAuth(`/admin/chat/conversations/${id}`);
}

export async function sendAdminMessage(
  conversationId: string,
  content: string,
  image_base64?: string
): Promise<ChatMessage> {
  const body: { content?: string; image_base64?: string } = { content };
  if (image_base64) body.image_base64 = image_base64;
  return fetchWithAuth(`/admin/chat/conversations/${conversationId}/messages`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateConversationStatus(
  conversationId: string,
  status: ChatStatus
): Promise<ChatConversation> {
  return fetchWithAuth(`/admin/chat/conversations/${conversationId}/status`, {
    method: "POST",
    body: JSON.stringify({ status }),
  });
}
