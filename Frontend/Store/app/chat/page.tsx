"use client";

import { useEffect, useState, useRef } from "react";
import { getMe } from "../lib/auth";
import {
  initGuestSession,
  createConversation,
  getMyConversations,
  getConversation,
  type ChatConversation,
  type ChatMessage,
} from "../lib/chat";
import { useChatSocket, type NewMessagePayload } from "../hooks/useChatSocket";
import { MessageCircle, Plus, Send, ArrowLeft, ImageIcon } from "lucide-react";

const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function ChatPage() {
  const [chatReady, setChatReady] = useState(false);
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [selected, setSelected] = useState<ChatConversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [newFormImage, setNewFormImage] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newSubject, setNewSubject] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const newFormFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const init = async () => {
      const u = await getMe();
      if (u) {
        setUser(u);
        setChatReady(true);
      } else {
        await initGuestSession().catch(() => {});
        setChatReady(true);
      }
    };
    init().finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!chatReady) return;
    getMyConversations()
      .then(setConversations)
      .catch(() => {});
  }, [chatReady]);

  const handleSelect = (c: ChatConversation) => {
    setSelected(c);
    getConversation(c.id).then(setSelected);
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
          x.sender_type === "CUSTOMER" &&
          (msg.image_base64
            ? x.image_base64 === msg.image_base64
            : x.content === msg.content),
      );
      const filtered = hasTemp
        ? prev.messages.filter(
            (x) =>
              !(
                x.id.startsWith("temp-") &&
                (msg.image_base64
                  ? x.image_base64 === msg.image_base64
                  : x.content === msg.content)
              ),
          )
        : prev.messages;
      return { ...prev, messages: [...filtered, m] };
    });
  };

  const { connected, sendMessage } = useChatSocket({
    conversationId: selected?.id ?? null,
    onNewMessage: handleNewMessage,
    enabled: chatReady,
  });

  const handleSend = () => {
    const text = input.trim();
    if ((!text && !pendingImage) || !selected) return;
    sendMessage(text || "", pendingImage || undefined);
    const tempMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      conversation_id: selected.id,
      sender_type: "CUSTOMER",
      sender_id: user?.id ?? null,
      content: text,
      image_base64: pendingImage || undefined,
      is_read: false,
      created_at: new Date().toISOString(),
    };
    setSelected((prev) =>
      prev ? { ...prev, messages: [...prev.messages, tempMsg] } : null,
    );
    setInput("");
    setPendingImage(null);
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    if (file.size > MAX_IMAGE_SIZE) {
      alert("Image must be under 2MB");
      return;
    }
    const base64 = await fileToBase64(file);
    setPendingImage(base64);
    e.target.value = "";
  };

  const handleNewFormImageSelect = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    if (file.size > MAX_IMAGE_SIZE) {
      alert("Image must be under 2MB");
      return;
    }
    const base64 = await fileToBase64(file);
    setNewFormImage(base64);
    e.target.value = "";
  };

  const handleCreateConversation = async () => {
    if (!newMessage.trim() && !newFormImage) return;
    try {
      const conv = await createConversation({
        subject: newSubject.trim() || undefined,
        initialMessage: newMessage.trim() || undefined,
        initialImage: newFormImage || undefined,
      });
      setConversations((prev) => [conv, ...prev]);
      setSelected(conv);
      setShowNewForm(false);
      setNewSubject("");
      setNewMessage("");
      setNewFormImage(null);
    } catch (e) {
      console.error(e);
    }
  };

  const formatTime = (s: string) =>
    new Date(s).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

  if (loading || !chatReady) return null;

  return (
    <div className="min-h-[calc(100vh-5rem)] flex flex-col max-w-4xl mx-auto p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <MessageCircle className="w-7 h-7 text-[#0B123A]" />
          Support Chat
        </h1>
        <button
          onClick={() => setShowNewForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#0B123A] text-white rounded-lg hover:bg-[#1a245a] transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          New conversation
        </button>
      </div>

      {showNewForm && (
        <div className="mb-4 p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
          <h3 className="font-semibold text-slate-800 mb-3">
            Start a new conversation
          </h3>
          <input
            placeholder="Subject (optional)"
            value={newSubject}
            onChange={(e) => setNewSubject(e.target.value)}
            className="w-full mb-3 px-4 py-2 border border-slate-300 rounded-lg text-sm text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0B123A]/20 focus:border-[#0B123A]"
          />
          <textarea
            placeholder="Your message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            rows={3}
            className="w-full mb-3 px-4 py-2 border border-slate-300 rounded-lg text-sm text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0B123A]/20 focus:border-[#0B123A] resize-none"
          />
          <div className="flex items-center gap-2 mb-3">
            <input
              ref={newFormFileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleNewFormImageSelect}
            />
            <button
              type="button"
              onClick={() => newFormFileRef.current?.click()}
              className="p-2 border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              <ImageIcon className="w-4 h-4 text-slate-600" />
            </button>
            {newFormImage && (
              <div className="relative inline-block">
                <img
                  src={newFormImage}
                  alt="Attach"
                  className="h-14 w-14 object-cover rounded-lg border"
                />
                <button
                  type="button"
                  onClick={() => setNewFormImage(null)}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs"
                >
                  ×
                </button>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCreateConversation}
              disabled={!newMessage.trim() && !newFormImage}
              className="px-4 py-2 bg-[#0B123A] text-white rounded-lg hover:bg-[#1a245a] disabled:opacity-50 text-sm font-medium"
            >
              Start conversation
            </button>
            <button
              onClick={() => {
                setShowNewForm(false);
                setNewSubject("");
                setNewMessage("");
                setNewFormImage(null);
              }}
              className="px-4 py-2 border border-slate-300 rounded-lg text-black hover:bg-slate-50 text-sm font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col md:flex-row gap-4 min-h-0">
        <div className="md:w-72 flex-shrink-0 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="p-3 border-b border-slate-100 bg-slate-50">
            <p className="text-xs font-medium text-slate-500">
              Your conversations
            </p>
          </div>
          <div className="overflow-y-auto max-h-[300px] md:max-h-[calc(100vh-20rem)]">
            {conversations.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-sm">
                No conversations yet.
              </div>
            ) : (
              conversations.map((c) => (
                <button
                  key={c.id}
                  onClick={() => handleSelect(c)}
                  className={`w-full text-left px-4 py-3 border-b border-slate-100 hover:bg-slate-50 transition-colors ${
                    selected?.id === c.id
                      ? "bg-[#0B123A]/5 border-l-4 border-l-[#0B123A]"
                      : ""
                  }`}
                >
                  <p className="font-medium text-slate-800 truncate">
                    {c.subject || "Support request"}
                  </p>
                  <p className="text-xs text-slate-500">
                    {c.status} · {new Date(c.updated_at).toLocaleDateString()}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col bg-white border border-slate-200 rounded-xl overflow-hidden min-h-[400px]">
          {selected ? (
            <>
              <div className="p-3 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelected(null)}
                    className="md:hidden p-1 hover:bg-slate-100 rounded"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div>
                    <p className="font-medium text-slate-800">
                      {selected.subject || "Support request"}
                    </p>
                    <p className="text-xs text-slate-500">{selected.status}</p>
                  </div>
                </div>
                {connected && (
                  <span className="text-xs text-green-600 font-medium">
                    ● Live
                  </span>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {selected.messages.map((m) => {
                  const isMe = m.sender_type === "CUSTOMER";
                  return (
                    <div
                      key={m.id}
                      className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg px-4 py-2 ${
                          isMe
                            ? "bg-[#0B123A] text-white"
                            : "bg-slate-100 text-slate-800"
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
                          <p className="text-sm whitespace-pre-wrap">
                            {m.content}
                          </p>
                        )}
                        <p
                          className={`text-xs mt-1 ${
                            isMe ? "text-white/80" : "text-slate-500"
                          }`}
                        >
                          {formatTime(m.created_at)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="p-3 border-t border-slate-200">
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
                    className="p-2 border border-slate-300 rounded-lg hover:bg-slate-50 shrink-0"
                  >
                    <ImageIcon className="w-5 h-5 text-slate-600" />
                  </button>
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === "Enter" && !e.shiftKey && handleSend()
                    }
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-sm text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0B123A]/20 focus:border-[#0B123A]"
                  />
                  <button
                    onClick={handleSend}
                    disabled={!input.trim() && !pendingImage}
                    className="p-2 bg-[#0B123A] text-white rounded-lg hover:bg-[#1a245a] disabled:opacity-50 shrink-0"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-500">
              <div className="text-center">
                <MessageCircle className="w-16 h-16 mx-auto mb-3 text-slate-300" />
                <p>Select a conversation or start a new one</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
