"use client";

import { useEffect, useState, useRef } from "react";
import {
  fetchConversations,
  fetchConversation,
  updateConversationStatus,
  type ChatConversation,
  type ChatMessage,
  type ChatStatus,
} from "@/lib/api";
import { useAdminChatSocket, type NewMessagePayload } from "@/lib/useChatSocket";
import { MessageCircle, Send, ArrowLeft, RefreshCw, ImageIcon } from "lucide-react";
import { toast } from "sonner";

const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const STATUS_OPTIONS: { value: ChatStatus; label: string }[] = [
  { value: "OPEN", label: "Open" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "RESOLVED", label: "Resolved" },
  { value: "CLOSED", label: "Closed" },
];

export default function ChatPage() {
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<ChatStatus | "">("");
  const [selected, setSelected] = useState<ChatConversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadConversations();
  }, [page, statusFilter]);

  const loadConversations = async () => {
    setLoading(true);
    try {
      const res = await fetchConversations(page, 20, statusFilter || undefined);
      setConversations(res.conversations);
      setTotal(res.total);
    } catch (e) {
      toast.error("Failed to load conversations");
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (c: ChatConversation) => {
    setSelected(c);
    fetchConversation(c.id).then(setSelected).catch(() => toast.error("Failed to load"));
  };

  const handleNewMessage = (msg: NewMessagePayload) => {
    if (!selected || msg.conversation_id !== selected.id) return;
    const m: ChatMessage = {
      id: msg.id,
      conversation_id: msg.conversation_id,
      sender_type: msg.sender_type as any,
      sender_id: msg.sender_id,
      content: msg.content,
      image_base64: msg.image_base64,
      is_read: msg.is_read,
      created_at: msg.created_at,
    };
    setSelected((prev) => {
      if (!prev) return null;
      const hasTemp = prev.messages.some(
        (x) =>
          x.id.startsWith("temp-") &&
          x.sender_type === "STAFF" &&
          (msg.image_base64 ? x.image_base64 === msg.image_base64 : x.content === msg.content)
      );
      const filtered = hasTemp
        ? prev.messages.filter(
            (x) =>
              !(
                x.id.startsWith("temp-") &&
                (msg.image_base64 ? x.image_base64 === msg.image_base64 : x.content === msg.content)
              )
          )
        : prev.messages;
      return { ...prev, messages: [...filtered, m] };
    });
  };

  const { connected, sendMessage } = useAdminChatSocket({
    conversationId: selected?.id ?? null,
    onNewMessage: handleNewMessage,
    enabled: true,
  });

  const handleSend = () => {
    const text = input.trim();
    if ((!text && !pendingImage) || !selected) return;
    sendMessage(text || "", pendingImage || undefined);
    const tempMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      conversation_id: selected.id,
      sender_type: "STAFF",
      sender_id: null,
      content: text,
      image_base64: pendingImage || undefined,
      is_read: false,
      created_at: new Date().toISOString(),
    };
    setSelected((prev) =>
      prev ? { ...prev, messages: [...prev.messages, tempMsg] } : null
    );
    setInput("");
    setPendingImage(null);
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    if (file.size > MAX_IMAGE_SIZE) {
      toast.error("Image must be under 2MB");
      return;
    }
    const base64 = await fileToBase64(file);
    setPendingImage(base64);
    e.target.value = "";
  };

  const handleStatusChange = async (newStatus: ChatStatus) => {
    if (!selected) return;
    setUpdatingStatus(true);
    try {
      await updateConversationStatus(selected.id, newStatus);
      setSelected((prev) => (prev ? { ...prev, status: newStatus } : null));
      setConversations((prev) =>
        prev.map((c) => (c.id === selected.id ? { ...c, status: newStatus } : c))
      );
      toast.success("Status updated");
    } catch {
      toast.error("Failed to update status");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const formatTime = (s: string) =>
    new Date(s).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

  const customerName = selected?.customer
    ? `${selected.customer.first_name} ${selected.customer.last_name}`.trim() ||
      selected.customer.email
    : "Customer";

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-zinc-900 flex items-center gap-2">
          <MessageCircle className="w-7 h-7 text-zinc-700" />
          Customer Chat
        </h1>
        <button
          onClick={loadConversations}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 border border-zinc-300 rounded-xl hover:bg-zinc-50 text-sm font-medium disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <div className="flex-1 flex gap-4 min-h-0">
        <div className="w-80 flex-shrink-0 bg-white border border-zinc-200 rounded-xl overflow-hidden flex flex-col">
          <div className="p-3 border-b border-zinc-100 flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as ChatStatus | "")}
              className="flex-1 px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
            >
              <option value="">All statuses</option>
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-6 text-center">
                <div className="animate-spin w-8 h-8 border-2 border-zinc-300 border-t-zinc-700 rounded-full mx-auto" />
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-6 text-center text-zinc-500 text-sm">
                No conversations found.
              </div>
            ) : (
              conversations.map((c) => (
                <button
                  key={c.id}
                  onClick={() => handleSelect(c)}
                  className={`w-full text-left px-4 py-3 border-b border-zinc-100 hover:bg-zinc-50 transition-colors ${
                    selected?.id === c.id
                      ? "bg-zinc-900 text-white hover:bg-zinc-800"
                      : ""
                  }`}
                >
                  <p className="font-medium truncate text-sm">
                    {c.customer
                      ? `${c.customer.first_name} ${c.customer.last_name}`.trim() ||
                        c.customer.email
                      : "Customer"}
                  </p>
                  <p
                    className={`text-xs truncate ${
                      selected?.id === c.id ? "text-zinc-300" : "text-zinc-500"
                    }`}
                  >
                    {c.subject || "Support"} · {c.status}
                  </p>
                </button>
              ))
            )}
          </div>
          {total > 0 && (
            <div className="p-2 border-t border-zinc-100 text-xs text-zinc-500 text-center">
              {total} total
            </div>
          )}
        </div>

        <div className="flex-1 flex flex-col bg-white border border-zinc-200 rounded-xl overflow-hidden min-h-0">
          {selected ? (
            <>
              <div className="p-4 border-b border-zinc-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelected(null)}
                    className="lg:hidden p-2 hover:bg-zinc-100 rounded-lg"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div>
                    <p className="font-semibold text-zinc-900">{customerName}</p>
                    <p className="text-sm text-zinc-500">
                      {selected.customer?.email} · {selected.subject || "Support"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {connected && (
                    <span className="text-xs text-green-600 font-medium">● Live</span>
                  )}
                  <select
                    value={selected.status}
                    onChange={(e) => handleStatusChange(e.target.value as ChatStatus)}
                    disabled={updatingStatus}
                    className="px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400 disabled:opacity-50"
                  >
                    {STATUS_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {selected.messages.map((m) => {
                  const isStaff = m.sender_type === "STAFF";
                  return (
                    <div
                      key={m.id}
                      className={`flex ${isStaff ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-xl px-4 py-2 ${
                          isStaff
                            ? "bg-zinc-900 text-white"
                            : "bg-zinc-100 text-zinc-800"
                        }`}
                      >
                        {m.image_base64 && (
                          <img
                            src={m.image_base64}
                            alt=""
                            className="max-w-full max-h-64 rounded-lg mb-1 object-contain"
                          />
                        )}
                        {m.content && (
                          <p className="text-sm whitespace-pre-wrap">{m.content}</p>
                        )}
                        <p
                          className={`text-xs mt-1 ${
                            isStaff ? "text-zinc-300" : "text-zinc-500"
                          }`}
                        >
                          {formatTime(m.created_at)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="p-3 border-t border-zinc-200">
                {pendingImage && (
                  <div className="mb-2 flex items-center gap-2">
                    <img
                      src={pendingImage}
                      alt=""
                      className="h-12 w-12 object-cover rounded border"
                    />
                    <button
                      type="button"
                      onClick={() => setPendingImage(null)}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageSelect}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 border border-zinc-300 rounded-xl hover:bg-zinc-50 shrink-0"
                  >
                    <ImageIcon className="w-5 h-5 text-zinc-600" />
                  </button>
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === "Enter" && !e.shiftKey && handleSend()
                    }
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-2 border border-zinc-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
                  />
                  <button
                    onClick={handleSend}
                    disabled={!input.trim() && !pendingImage}
                    className="p-2 bg-zinc-900 text-white rounded-xl hover:bg-zinc-800 disabled:opacity-50 shrink-0"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-zinc-500">
              <div className="text-center">
                <MessageCircle className="w-16 h-16 mx-auto mb-3 text-zinc-300" />
                <p>Select a conversation to view and reply</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
