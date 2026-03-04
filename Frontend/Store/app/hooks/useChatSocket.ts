"use client";

import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { API_URL } from "../lib/env";

export interface NewMessagePayload {
  id: string;
  conversation_id: string;
  sender_type: string;
  sender_id: string | null;
  content: string;
  image_base64?: string | null;
  is_read: boolean;
  created_at: string;
}

type UseChatSocketOptions = {
  conversationId: string | null;
  onNewMessage?: (msg: NewMessagePayload) => void;
  enabled?: boolean;
};

export function useChatSocket({
  conversationId,
  onNewMessage,
  enabled = true,
}: UseChatSocketOptions) {
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const onNewMessageRef = useRef(onNewMessage);
  onNewMessageRef.current = onNewMessage;

  useEffect(() => {
    if (!enabled) return;

    const socket = io(API_URL, {
      path: "/chat-ws",
      withCredentials: true,
    });

    socketRef.current = socket;

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));

    socket.on("new_message", (msg: NewMessagePayload) => {
      onNewMessageRef.current?.(msg);
    });

    return () => {
      socket.emit("leave_conversation", { conversationId });
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [enabled]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !conversationId || !connected) return;

    socket.emit("join_conversation", { conversationId });

    return () => {
      socket.emit("leave_conversation", { conversationId });
    };
  }, [conversationId, connected]);

  const sendMessage = (content: string, image_base64?: string) => {
    const socket = socketRef.current;
    if (!socket || !conversationId) return;
    if (!content?.trim() && !image_base64?.trim()) return;
    socket.emit("send_message", { conversationId, content: content || "", image_base64 });
  };

  return { connected, sendMessage };
}
