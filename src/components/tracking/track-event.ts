"use client";

import type { InteractionEventType } from "@/lib/tracking/events";
import { getTrackingSessionId } from "./session-id";

type InteractionPayload =
  | { type: "music_play" | "music_complete"; target: string; detail: { title: string; artist: string; source: "file" | "youtube" } }
  | { type: "outbound_click"; target: string; detail: { text: string | null } };

/**
 * Fire-and-forget report of a visitor interaction. Never throws and never
 * awaits: the UI must behave identically whether or not tracking succeeds.
 */
export function trackEvent(payload: InteractionPayload & { type: InteractionEventType }) {
  if (typeof window === "undefined") return;
  const pathname = window.location.pathname || "/";
  if (pathname.startsWith("/tracking")) return;
  try {
    void fetch("/api/tracking/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: getTrackingSessionId(), pathname, ...payload }),
      keepalive: true,
      credentials: "same-origin",
    }).catch(() => undefined);
  } catch {
    // Analytics must never interfere with the interaction being reported.
  }
}
