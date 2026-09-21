/**
 * Event vocabulary shared by the browser trackers, the write API, and the
 * dashboard. Adding an event means extending this list plus the zod schema in
 * `app/api/tracking/event/route.ts`; the SQLite table no longer constrains it.
 */
export const TRACKING_EVENT_TYPES = [
  "page_view",
  "chat_prompt",
  "resume_download",
  "music_play",
  "music_complete",
  "outbound_click",
] as const;

export type TrackingEventType = (typeof TRACKING_EVENT_TYPES)[number];

/** Events a visitor's browser may report through `/api/tracking/event`. */
export type InteractionEventType = "music_play" | "music_complete" | "outbound_click";

export function isTrackingEventType(value: string): value is TrackingEventType {
  return (TRACKING_EVENT_TYPES as readonly string[]).includes(value);
}

export const TRACKING_EVENT_LABELS: Record<TrackingEventType, string> = {
  page_view: "Page view",
  chat_prompt: "Question submitted",
  resume_download: "Resume downloaded",
  music_play: "Played a record",
  music_complete: "Finished a record",
  outbound_click: "Left via link",
};
