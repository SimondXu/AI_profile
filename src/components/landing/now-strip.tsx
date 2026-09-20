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
function relativeTime(isoDate: string): string {
  const seconds = Math.max(
    0,
    Math.round((Date.now() - new Date(isoDate).getTime()) / 1000),
  );

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
    if (value >= 1) {
      return `${value} ${unit}${value === 1 ? "" : "s"} ago`;
    }
  }

  return "just now";
}

function githubUsername(githubUrl: string): string | null {
  try {
    const { pathname } = new URL(githubUrl);
    const segment = pathname.split("/").filter(Boolean).pop();
    return segment ?? null;
  } catch {
    return null;
  }
}

async function fetchLastPush(username: string) {
  const response = await fetch(
    `https://api.github.com/users/${username}/events/public?per_page=30`,
    {
      next: { revalidate: 3600 },
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "simondxu.com",
      },
    },
  );

  if (!response.ok) {
    return null;
  }

  const events: unknown = await response.json();
  if (!Array.isArray(events)) {
    return null;
  }

  const pushEvent = events.find(isPushEvent);
  return pushEvent ?? null;
}

/**
 * Server component: one muted, mono line about the most recent GitHub
 * public push. Renders nothing (not a placeholder) if the API fails, is
 * rate-limited, or has no push in the recent event window.
 */
export async function NowStrip() {
  const config = getConfig();

  try {
    const username = githubUsername(config.social.github);
    if (!username) return null;

    const pushEvent = await fetchLastPush(username);
    if (!pushEvent) return null;

    const location = config.personal.location?.current;

    // Deliberately no repo name: the latest public push may be an unrelated
    // side project; the signal here is "still shipping", not "what".
    return (
      <p className="font-mono text-[13px] text-muted-foreground sm:text-sm">
        Last GitHub push ·{" "}
        <a
          href={config.social.github}
          target="_blank"
          rel="noopener noreferrer"
          className="underline-offset-4 hover:text-foreground hover:underline"
        >
          {relativeTime(pushEvent.created_at)}
        </a>
        {location ? ` · Based in ${location}` : null}
      </p>
    );
  } catch {
    return null;
  }
}
