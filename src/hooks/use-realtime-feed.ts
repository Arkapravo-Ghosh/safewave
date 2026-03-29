"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type RealtimeEventName =
  | "system"
  | "new_incident"
  | "assignment_update"
  | "status_update"
  | "overview_update";

export interface RealtimeEvent {
  event: RealtimeEventName;
  payload: unknown;
  timestamp: string;
}

function resolveWebSocketUrl() {
  if (typeof window === "undefined") {
    return "";
  }

  if (process.env.NEXT_PUBLIC_SAFEWAVE_WS_URL) {
    return process.env.NEXT_PUBLIC_SAFEWAVE_WS_URL;
  }

  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  return `${protocol}://${window.location.hostname}:3002`;
}

export function useRealtimeFeed(onEvent?: (event: RealtimeEvent) => void) {
  const [events, setEvents] = useState<RealtimeEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const onEventRef = useRef(onEvent);

  const wsUrl = useMemo(() => resolveWebSocketUrl(), []);

  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    if (!wsUrl) {
      return;
    }

    let disposed = false;
    let reconnectTimer: number | null = null;
    let reconnectAttempt = 0;

    const scheduleReconnect = () => {
      if (disposed || reconnectTimer !== null) {
        return;
      }

      const delayMs = Math.min(10_000, 500 * 2 ** reconnectAttempt);
      reconnectAttempt += 1;

      reconnectTimer = window.setTimeout(() => {
        reconnectTimer = null;
        connect();
      }, delayMs);
    };

    const connect = () => {
      if (disposed) {
        return;
      }

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        reconnectAttempt = 0;
        setConnected(true);
      };

      ws.onclose = () => {
        if (wsRef.current === ws) {
          wsRef.current = null;
        }

        setConnected(false);
        scheduleReconnect();
      };

      ws.onerror = () => {
        ws.close();
      };

      ws.onmessage = (message) => {
        try {
          const parsed = JSON.parse(message.data as string) as RealtimeEvent;
          setEvents((previous) => [parsed, ...previous].slice(0, 80));
          onEventRef.current?.(parsed);
        } catch {
          // Ignore malformed realtime payloads.
        }
      };
    };

    connect();

    return () => {
      disposed = true;

      if (reconnectTimer !== null) {
        window.clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }

      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [wsUrl]);

  return { events, connected, wsUrl };
}
