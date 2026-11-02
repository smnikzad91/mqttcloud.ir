"use client";

import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

export type TopicMessage = { topic: string; payload: string; username: string; clientName: string; at: string };
export type ClientEvent = { clientName: string; username: string; event: "connect" | "disconnect"; createdAt: string };

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:4021";

/**
 * Admin-only live push from broker-service: every message published on
 * `topic` (exact match) and every device connect/disconnect. Opens its own
 * socket; a fresh token is fetched on every (re)connect since tokens expire
 * after 5 minutes. Returns whether the socket is currently connected, so the
 * page can fall back to polling when it isn't.
 */
export function useTopicLive(topic: string, onMessage: (m: TopicMessage) => void, onClient?: (e: ClientEvent) => void) {
  const [connected, setConnected] = useState(false);
  const handlers = useRef({ onMessage, onClient });
  useEffect(() => { handlers.current = { onMessage, onClient }; });

  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ["websocket"],
      auth: (cb) => {
        fetch("/api/user/mqtt/socket-token")
          .then((r) => r.json())
          .then(({ token }) => cb({ token }))
          .catch(() => cb({}));
      },
    });
    socket.on("connect", () => { setConnected(true); socket.emit("watch", topic); });
    socket.on("disconnect", () => setConnected(false));
    socket.on("mqtt:message", (m: TopicMessage) => { if (m.topic === topic) handlers.current.onMessage(m); });
    socket.on("mqtt:client", (e: ClientEvent) => handlers.current.onClient?.(e));
    return () => { socket.disconnect(); };
  }, [topic]);

  return connected;
}
