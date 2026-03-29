import "server-only";

import { WebSocketServer } from "ws";

const DEFAULT_WS_PORT = 3002;

type GlobalRealtimeState = {
  safeWaveWss?: WebSocketServer;
};

const globalRealtime = globalThis as typeof globalThis & GlobalRealtimeState;

export type RealtimeEventName =
  | "system"
  | "new_incident"
  | "assignment_update"
  | "status_update"
  | "overview_update";

export interface RealtimeEnvelope {
  event: RealtimeEventName;
  payload: unknown;
  timestamp: string;
}

function getWsPort() {
  const value = Number(process.env.SAFEWAVE_WS_PORT ?? DEFAULT_WS_PORT);
  return Number.isFinite(value) ? value : DEFAULT_WS_PORT;
}

export function getPublicWsUrl() {
  return process.env.NEXT_PUBLIC_SAFEWAVE_WS_URL ?? `ws://localhost:${getWsPort()}`;
}

export function ensureRealtimeServer() {
  if (globalRealtime.safeWaveWss) {
    return globalRealtime.safeWaveWss;
  }

  try {
    const wss = new WebSocketServer({
      port: getWsPort(),
      host: "0.0.0.0",
    });

    wss.on("connection", (socket) => {
      socket.send(
        JSON.stringify({
          event: "system",
          payload: { message: "Connected to SafeWave realtime stream" },
          timestamp: new Date().toISOString(),
        } satisfies RealtimeEnvelope)
      );

      socket.on("message", () => {
        // SafeWave currently uses server-side broadcast only.
      });
    });

    globalRealtime.safeWaveWss = wss;
    return wss;
  } catch {
    return undefined;
  }
}

export function broadcastRealtime(event: RealtimeEventName, payload: unknown) {
  const server = ensureRealtimeServer();

  if (!server) {
    return;
  }

  const envelope: RealtimeEnvelope = {
    event,
    payload,
    timestamp: new Date().toISOString(),
  };

  const message = JSON.stringify(envelope);

  for (const client of server.clients) {
    if (client.readyState === 1) {
      client.send(message);
    }
  }
}
