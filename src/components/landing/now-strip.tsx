import { getConfig } from "@/lib/config-loader";

interface GitHubPushEvent {
  type: "PushEvent";
  created_at: string;
  repo: { name: string };
}

function isPushEvent(event: unknown): event is GitHubPushEvent {
  return (
    typeof event === "object" &&
    event !== null &&
    (event as { type?: unknown }).type === "PushEvent" &&
    typeof (event as { created_at?: unknown }).created_at === "string" &&
    typeof (event as { repo?: { name?: unknown } }).repo?.name === "string"
  );
}

/** "3 days ago" / "2 hours ago" / "just now", no dependency. */
export function relativeTime(isoDate: string): string {
  const seconds = Math.max(0, Math.round((Date.now() - new Date(isoDate).getTime()) / 1000));
  const units: Array<[string, number]> = [
    ["year", 31536000],
    ["month", 2592000],
    ["week", 604800],
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
  ];
  for (const [unit, unitSeconds] of units) {
    const value = Math.floor(seconds / unitSeconds);
    if (value >= 1) return `${value} ${unit}${value === 1 ? "" : "s"} ago`;
  }
  return "just now";
}

function githubUsername(githubUrl: string): string | null {
  try {
    const segment = new URL(githubUrl).pathname.split("/").filter(Boolean).pop();
    return segment ?? null;
  } catch {
    return null;
  }
}

export interface LastPush {
  /** e.g. "2 weeks ago" */
  relative: string;
  /** The profile URL (deliberately not the repo: the latest public push may be an unrelated side project). */
  href: string;
}

/**
 * Most recent public GitHub push for the configured account, revalidated
 * hourly. Returns null on any failure or when there is no push in the
 * recent event window — callers render nothing rather than a placeholder.
 */
export async function getLastPush(): Promise<LastPush | null> {
  const config = getConfig();
  try {
    const username = githubUsername(config.social.github);
    if (!username) return null;

    const response = await fetch(
      `https://api.github.com/users/${username}/events/public?per_page=30`,
      {
        next: { revalidate: 3600 },
        headers: { Accept: "application/vnd.github+json", "User-Agent": "simondxu.com" },
      },
    );
    if (!response.ok) return null;

    const events: unknown = await response.json();
    if (!Array.isArray(events)) return null;

    const pushEvent = events.find(isPushEvent);
    if (!pushEvent) return null;

    return { relative: relativeTime(pushEvent.created_at), href: config.social.github };
  } catch {
    return null;
  }
}
