import "server-only";

import { decryptTrackingValue, maskIp } from "./crypto";
import { getTrackingDatabase } from "./db";
import type { TrackingEventType } from "./events";

export type TrackingRange = "24h" | "7d" | "30d" | "90d";
export const RANGE_MS: Record<TrackingRange, number> = {
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
  "90d": 90 * 24 * 60 * 60 * 1000,
};

export type TrackingFilters = {
  range: TrackingRange;
  country?: string;
  network?: string;
  eventType?: "all" | TrackingEventType;
  search?: string;
};

type SessionRow = {
  id: string;
  ip_ciphertext: string;
  country_code: string | null;
  country_name: string | null;
  asn: string | null;
  as_name: string | null;
  as_domain: string | null;
  device_type: string | null;
  browser_family: string | null;
  first_seen_at: number;
  last_seen_at: number;
  pages: number;
  prompts: number;
  downloads: number;
  plays: number;
  clicks: number;
};

function startFor(range: TrackingRange) {
  return Date.now() - RANGE_MS[range];
}

function whereFor(filters: TrackingFilters) {
  const clauses = ["s.is_bot = 0", "s.is_internal = 0", "e.occurred_at >= ?"];
  const values: (string | number)[] = [startFor(filters.range)];
  if (filters.country) {
    clauses.push("s.country_code = ?");
    values.push(filters.country);
  }
  if (filters.network) {
    clauses.push("s.as_domain = ?");
    values.push(filters.network);
  }
  if (filters.eventType && filters.eventType !== "all") {
    clauses.push("e.event_type = ?");
    values.push(filters.eventType);
  }
  return { clause: clauses.join(" AND "), values };
}

export function writeTrackingEvent(input: {
  sessionId: string;
  ipHash: string;
  ipCiphertext: string;
  deviceType: string;
  browserFamily: string;
  isBot: boolean;
  isInternal: boolean;
  eventType: TrackingEventType;
  pathname: string;
  referrerHost?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  promptCiphertext?: string | null;
  promptLength?: number | null;
  chatOutcome?: string | null;
  target?: string | null;
  detail?: Record<string, string | number | boolean | null> | null;
}) {
  const database = getTrackingDatabase();
  const now = Date.now();
  return database.transaction(() => {
    const isNewSession = !database
      .prepare("SELECT 1 FROM tracking_sessions WHERE id = ?")
      .get(input.sessionId);
    const cachedEnrichment = isNewSession
      ? (database
          .prepare(
            `SELECT country_code, country_name, asn, as_name, as_domain, attribution_confidence
             FROM tracking_sessions
             WHERE ip_hash = ? AND id != ?
               AND (country_code IS NOT NULL OR as_name IS NOT NULL OR as_domain IS NOT NULL)
             ORDER BY last_seen_at DESC LIMIT 1`,
          )
          .get(input.ipHash, input.sessionId) as
          | {
              country_code: string | null; country_name: string | null; asn: string | null;
              as_name: string | null; as_domain: string | null; attribution_confidence: string;
            }
          | undefined)
      : undefined;
    database
      .prepare(
        `INSERT INTO tracking_sessions (
          id, ip_hash, ip_ciphertext, device_type, browser_family, first_seen_at,
          last_seen_at, is_bot, is_internal
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET last_seen_at = excluded.last_seen_at`,
      )
      .run(
        input.sessionId,
        input.ipHash,
        input.ipCiphertext,
        input.deviceType,
        input.browserFamily,
        now,
        now,
        Number(input.isBot),
        Number(input.isInternal),
      );
    if (isNewSession && cachedEnrichment) {
      database
        .prepare(
          `UPDATE tracking_sessions SET country_code = ?, country_name = ?, asn = ?, as_name = ?,
           as_domain = ?, attribution_confidence = ? WHERE id = ?`,
        )
        .run(
          cachedEnrichment.country_code,
          cachedEnrichment.country_name,
          cachedEnrichment.asn,
          cachedEnrichment.as_name,
          cachedEnrichment.as_domain,
          cachedEnrichment.attribution_confidence,
          input.sessionId,
        );
    }
    database
      .prepare(
        `INSERT INTO tracking_events (
          session_id, event_type, pathname, referrer_host, utm_source, utm_medium,
          utm_campaign, prompt_ciphertext, prompt_length, chat_outcome, target, detail, occurred_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        input.sessionId,
        input.eventType,
        input.pathname,
        input.referrerHost ?? null,
        input.utmSource ?? null,
        input.utmMedium ?? null,
        input.utmCampaign ?? null,
        input.promptCiphertext ?? null,
        input.promptLength ?? null,
        input.chatOutcome ?? null,
        input.target ?? null,
        input.detail ? JSON.stringify(input.detail) : null,
        now,
      );
    return { isNewSession, hasCachedEnrichment: Boolean(cachedEnrichment) };
  })();
}

export function cleanupExpiredTracking(retentionDays: number) {
  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  const database = getTrackingDatabase();
  database.transaction(() => {
    database.prepare("DELETE FROM tracking_events WHERE occurred_at < ?").run(cutoff);
    database
      .prepare(
        `DELETE FROM tracking_sessions
         WHERE last_seen_at < ? AND id NOT IN (SELECT DISTINCT session_id FROM tracking_events)`,
      )
      .run(cutoff);
  })();
}

function parseDetail(raw: string | null): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

/** `raw` is "<occurred_at>|<detail json>" from the MAX() trick, or the bare id. */
function trackLabel(raw: string | null, id: string) {
  const detail = parseDetail(raw?.slice(raw.indexOf("|") + 1) ?? null);
  const title = typeof detail?.title === "string" ? detail.title : null;
  const artist = typeof detail?.artist === "string" ? detail.artist : null;
  return title ? (artist ? `${title} — ${artist}` : title) : id;
}

export function getDashboardData(filters: TrackingFilters) {
  const database = getTrackingDatabase();
  const { clause, values } = whereFor(filters);
  const kpis = database
    .prepare(
      `SELECT
        COUNT(CASE WHEN e.event_type = 'page_view' THEN 1 END) AS pageViews,
        COUNT(DISTINCT e.session_id) AS uniqueSessions,
        COUNT(DISTINCT s.ip_hash) AS uniqueIps,
        COUNT(DISTINCT CASE WHEN e.event_type = 'chat_prompt' THEN e.session_id END) AS chatSessions,
        COUNT(CASE WHEN e.event_type = 'chat_prompt' THEN 1 END) AS promptCount,
        COUNT(CASE WHEN e.event_type = 'resume_download' THEN 1 END) AS downloadCount,
        COUNT(DISTINCT CASE WHEN e.event_type = 'music_play' THEN e.session_id END) AS musicSessions,
        COUNT(CASE WHEN e.event_type = 'music_play' THEN 1 END) AS playCount,
        COUNT(CASE WHEN e.event_type = 'music_complete' THEN 1 END) AS completeCount,
        COUNT(CASE WHEN e.event_type = 'outbound_click' THEN 1 END) AS clickCount
       FROM tracking_events e JOIN tracking_sessions s ON s.id = e.session_id
       WHERE ${clause}`,
    )
    .get(...values) as Record<string, number>;

  const daily = database
    .prepare(
      `SELECT strftime('%Y-%m-%d', e.occurred_at / 1000, 'unixepoch') AS day,
        COUNT(CASE WHEN e.event_type = 'page_view' THEN 1 END) AS pageViews,
        COUNT(CASE WHEN e.event_type = 'chat_prompt' THEN 1 END) AS prompts,
        COUNT(CASE WHEN e.event_type = 'resume_download' THEN 1 END) AS downloads,
        COUNT(CASE WHEN e.event_type = 'music_play' THEN 1 END) AS plays
       FROM tracking_events e JOIN tracking_sessions s ON s.id = e.session_id
       WHERE ${clause} GROUP BY day ORDER BY day ASC`,
    )
    .all(...values) as { day: string; pageViews: number; prompts: number; downloads: number; plays: number }[];

  const topPages = database
    .prepare(
      `SELECT e.pathname AS label, COUNT(*) AS count FROM tracking_events e
       JOIN tracking_sessions s ON s.id = e.session_id WHERE ${clause}
       AND e.event_type = 'page_view' GROUP BY e.pathname ORDER BY count DESC LIMIT 8`,
    )
    .all(...values) as { label: string; count: number }[];
  const sources = database
    .prepare(
      `SELECT COALESCE(NULLIF(e.utm_source, ''), NULLIF(e.referrer_host, ''), 'Direct') AS label,
        COUNT(*) AS count FROM tracking_events e JOIN tracking_sessions s ON s.id = e.session_id
       WHERE ${clause} AND e.event_type = 'page_view' GROUP BY label ORDER BY count DESC LIMIT 8`,
    )
    .all(...values) as { label: string; count: number }[];
  const countries = database
    .prepare(
      `SELECT COALESCE(s.country_name, 'Unknown') AS label, s.country_code AS code, COUNT(*) AS count
       FROM tracking_events e JOIN tracking_sessions s ON s.id = e.session_id
       WHERE ${clause} GROUP BY s.country_name ORDER BY count DESC LIMIT 8`,
    )
    .all(...values) as { label: string; code: string | null; count: number }[];
  const networks = database
    .prepare(
      `SELECT COALESCE(s.as_name, s.as_domain, 'Unknown network') AS label,
        s.as_domain AS domain, COUNT(*) AS count FROM tracking_events e
       JOIN tracking_sessions s ON s.id = e.session_id WHERE ${clause}
       GROUP BY s.as_name, s.as_domain ORDER BY count DESC LIMIT 8`,
    )
    .all(...values) as { label: string; domain: string | null; count: number }[];
  // Grouped by record id; the label comes from the most recent detail payload.
  const topTracks = database
    .prepare(
      `SELECT MAX(e.occurred_at || '|' || COALESCE(e.detail, '')) AS raw, e.target AS id,
        SUM(CASE WHEN e.event_type = 'music_play' THEN 1 ELSE 0 END) AS count,
        SUM(CASE WHEN e.event_type = 'music_complete' THEN 1 ELSE 0 END) AS completes
       FROM tracking_events e JOIN tracking_sessions s ON s.id = e.session_id
       WHERE ${clause} AND e.event_type IN ('music_play', 'music_complete') AND e.target IS NOT NULL
       GROUP BY e.target ORDER BY count DESC, completes DESC LIMIT 8`,
    )
    .all(...values) as { raw: string; id: string; count: number; completes: number }[];
  const topLinks = database
    .prepare(
      `SELECT e.target AS label, COUNT(*) AS count FROM tracking_events e
       JOIN tracking_sessions s ON s.id = e.session_id WHERE ${clause}
       AND e.event_type = 'outbound_click' AND e.target IS NOT NULL
       GROUP BY e.target ORDER BY count DESC LIMIT 8`,
    )
    .all(...values) as { label: string; count: number }[];

  const sessions = database
    .prepare(
      `SELECT s.id, s.ip_ciphertext, s.country_code, s.country_name, s.asn, s.as_name,
        s.as_domain, s.device_type, s.browser_family, s.first_seen_at, s.last_seen_at,
        COUNT(CASE WHEN e.event_type = 'page_view' THEN 1 END) AS pages,
        COUNT(CASE WHEN e.event_type = 'chat_prompt' THEN 1 END) AS prompts,
        COUNT(CASE WHEN e.event_type = 'resume_download' THEN 1 END) AS downloads,
        COUNT(CASE WHEN e.event_type = 'music_play' THEN 1 END) AS plays,
        COUNT(CASE WHEN e.event_type = 'outbound_click' THEN 1 END) AS clicks
       FROM tracking_sessions s JOIN tracking_events e ON e.session_id = s.id
       WHERE ${clause} GROUP BY s.id ORDER BY s.last_seen_at DESC LIMIT 80`,
    )
    .all(...values) as SessionRow[];

  const downloadRows = database
    .prepare(
      `SELECT e.id, e.session_id, e.pathname, e.occurred_at, s.ip_ciphertext,
        s.country_name, s.as_name, s.as_domain, s.device_type, s.browser_family
       FROM tracking_events e JOIN tracking_sessions s ON s.id = e.session_id
       WHERE ${clause} AND e.event_type = 'resume_download'
       ORDER BY e.occurred_at DESC LIMIT 100`,
    )
    .all(...values) as {
      id: number; session_id: string; pathname: string; occurred_at: number;
      ip_ciphertext: string; country_name: string | null; as_name: string | null;
      as_domain: string | null; device_type: string | null; browser_family: string | null;
    }[];

  const promptRows = database
    .prepare(
      `SELECT e.id, e.session_id, e.pathname, e.prompt_ciphertext, e.prompt_length,
        e.chat_outcome, e.occurred_at, s.ip_ciphertext, s.as_name, s.as_domain
       FROM tracking_events e JOIN tracking_sessions s ON s.id = e.session_id
       WHERE ${clause} AND e.event_type = 'chat_prompt'
       ORDER BY e.occurred_at DESC LIMIT 160`,
    )
    .all(...values) as {
      id: number; session_id: string; pathname: string; prompt_ciphertext: string | null;
      prompt_length: number | null; chat_outcome: string | null; occurred_at: number;
      ip_ciphertext: string; as_name: string | null; as_domain: string | null;
    }[];

  const normalizedSearch = filters.search?.trim().toLocaleLowerCase();
  const prompts = promptRows
    .map((row) => ({
      id: row.id,
      sessionId: row.session_id,
      pathname: row.pathname,
      prompt: decryptTrackingValue(row.prompt_ciphertext) ?? "[Unable to decrypt]",
      length: row.prompt_length ?? 0,
      outcome: row.chat_outcome ?? "accepted",
      occurredAt: row.occurred_at,
      ip: maskIp(decryptTrackingValue(row.ip_ciphertext)),
      network: row.as_name ?? row.as_domain ?? "Unknown network",
    }))
    .filter((row) => !normalizedSearch || row.prompt.toLocaleLowerCase().includes(normalizedSearch));

  return {
    kpis: {
      pageViews: kpis.pageViews ?? 0,
      uniqueSessions: kpis.uniqueSessions ?? 0,
      uniqueIps: kpis.uniqueIps ?? 0,
      chatSessions: kpis.chatSessions ?? 0,
      promptCount: kpis.promptCount ?? 0,
      downloadCount: kpis.downloadCount ?? 0,
      musicSessions: kpis.musicSessions ?? 0,
      playCount: kpis.playCount ?? 0,
      completeCount: kpis.completeCount ?? 0,
      clickCount: kpis.clickCount ?? 0,
      musicUseRate:
        (kpis.uniqueSessions ?? 0) > 0
          ? Math.round(((kpis.musicSessions ?? 0) / kpis.uniqueSessions) * 100)
          : 0,
      chatUseRate:
        (kpis.uniqueSessions ?? 0) > 0
          ? Math.round(((kpis.chatSessions ?? 0) / kpis.uniqueSessions) * 100)
          : 0,
    },
    daily,
    topPages,
    sources,
    countries,
    networks,
    topTracks: topTracks.map((row) => ({
      id: row.id,
      label: trackLabel(row.raw, row.id),
      count: row.count,
      completes: row.completes,
    })),
    topLinks,
    sessions: sessions.map((row) => ({
      id: row.id,
      ip: maskIp(decryptTrackingValue(row.ip_ciphertext)),
      countryCode: row.country_code,
      country: row.country_name ?? "Unknown",
      network: row.as_name ?? row.as_domain ?? "Unknown network",
      device: [row.browser_family, row.device_type].filter(Boolean).join(" · ") || "Unknown",
      firstSeenAt: row.first_seen_at,
      lastSeenAt: row.last_seen_at,
      pages: row.pages,
      prompts: row.prompts,
      downloads: row.downloads,
      plays: row.plays,
      clicks: row.clicks,
    })),
    prompts,
    downloads: downloadRows.map((row) => ({
      id: row.id,
      sessionId: row.session_id,
      pathname: row.pathname,
      occurredAt: row.occurred_at,
      ip: maskIp(decryptTrackingValue(row.ip_ciphertext)),
      country: row.country_name ?? "Unknown",
      network: row.as_name ?? row.as_domain ?? "Unknown network",
      device: [row.browser_family, row.device_type].filter(Boolean).join(" · ") || "Unknown",
    })),
  };
}

export function getSessionDetail(sessionId: string) {
  const database = getTrackingDatabase();
  const session = database
    .prepare(
      `SELECT id, ip_ciphertext, country_code, country_name, asn, as_name, as_domain,
        attribution_confidence, device_type, browser_family, first_seen_at, last_seen_at
       FROM tracking_sessions WHERE id = ? AND is_bot = 0 AND is_internal = 0`,
    )
    .get(sessionId) as {
      id: string; ip_ciphertext: string; country_code: string | null; country_name: string | null;
      asn: string | null; as_name: string | null; as_domain: string | null;
      attribution_confidence: string; device_type: string | null; browser_family: string | null;
      first_seen_at: number; last_seen_at: number;
    } | undefined;
  if (!session) return null;
  const events = database
    .prepare(
      `SELECT id, event_type, pathname, referrer_host, utm_source, utm_medium, utm_campaign,
        prompt_ciphertext, prompt_length, chat_outcome, target, detail, occurred_at
       FROM tracking_events WHERE session_id = ? ORDER BY occurred_at DESC LIMIT 240`,
    )
    .all(sessionId) as {
      id: number; event_type: TrackingEventType; pathname: string;
      referrer_host: string | null; utm_source: string | null; utm_medium: string | null;
      utm_campaign: string | null; prompt_ciphertext: string | null; prompt_length: number | null;
      chat_outcome: string | null; target: string | null; detail: string | null; occurred_at: number;
    }[];
  return {
    session: {
      id: session.id,
      ip: decryptTrackingValue(session.ip_ciphertext) ?? "Unavailable",
      country: session.country_name ?? "Unknown",
      countryCode: session.country_code,
      network: session.as_name ?? session.as_domain ?? "Unknown network",
      asn: session.asn,
      domain: session.as_domain,
      confidence: session.attribution_confidence,
      device: [session.browser_family, session.device_type].filter(Boolean).join(" · ") || "Unknown",
      firstSeenAt: session.first_seen_at,
      lastSeenAt: session.last_seen_at,
    },
    events: events.map((event) => ({
      ...event,
      prompt: event.event_type === "chat_prompt" ? decryptTrackingValue(event.prompt_ciphertext) : null,
      detail: parseDetail(event.detail),
    })),
  };
}
