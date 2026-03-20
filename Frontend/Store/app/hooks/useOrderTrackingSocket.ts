"use client";

import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { API_URL } from "../lib/env";

type OrderTrackingUpdatePayload = {
  trackingToken: string;
  reason: string;
  orderId?: string;
  orderStatus?: string;
  shipmentId?: string;
  emittedAt?: string;
};

export function useOrderTrackingSocket(params: {
  trackingToken: string | null;
  onUpdate?: (payload: OrderTrackingUpdatePayload) => void;
  enabled?: boolean;
}) {
  const { trackingToken, onUpdate, enabled = true } = params;
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const socket = io(API_URL, {
      path: "/order-tracking-ws",
      withCredentials: true,
    });

    socketRef.current = socket;

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));
    socket.on("order_tracking_updated", (payload: OrderTrackingUpdatePayload) => {
      onUpdateRef.current?.(payload);
    });

    return () => {
      if (trackingToken) {
        socket.emit("leave_order_tracking", { trackingToken });
      }
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [enabled, trackingToken]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !trackingToken || !connected) {
      return;
    }

    socket.emit("join_order_tracking", { trackingToken });

    return () => {
      socket.emit("leave_order_tracking", { trackingToken });
    };
  }, [connected, trackingToken]);

  return { connected };
}
