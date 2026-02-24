const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export async function initGuestSession(): Promise<void> {
  await fetch(`${API_URL}/chat/guest/init`, {
    method: "POST",
    credentials: "include",
  });
}

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

export async function createConversation(data: {
  subject?: string;
  initialMessage?: string;
  initialImage?: string;
}): Promise<ChatConversation> {
  const res = await fetch(`${API_URL}/chat/conversations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || "Failed to create conversation");
  return json.data;
}

export async function getMyConversations(): Promise<ChatConversation[]> {
  const res = await fetch(`${API_URL}/chat/conversations`, {
    credentials: "include",
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || "Failed to fetch conversations");
  return json.data;
}

export async function getConversation(id: string): Promise<ChatConversation> {
  const res = await fetch(`${API_URL}/chat/conversations/${id}`, {
    credentials: "include",
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || "Failed to fetch conversation");
  return json.data;
}

export async function sendMessage(
  conversationId: string,
  content: string,
  image_base64?: string
): Promise<ChatMessage> {
  const body: { content?: string; image_base64?: string } = { content };
  if (image_base64) body.image_base64 = image_base64;
  const res = await fetch(`${API_URL}/chat/conversations/${conversationId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || "Failed to send message");
  return json.data;
}
