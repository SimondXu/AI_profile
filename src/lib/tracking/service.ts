import "server-only";

import { getDeviceDetails, getTrustedClientIp, isBotRequest } from "./client-ip";
import { encryptTrackingValue, hashIp } from "./crypto";
import { getRetentionDays, isTrackingEnabled } from "./config";
import type { InteractionEventType, TrackingEventType } from "./events";
import { enrichSessionFromIpinfo } from "./ip-enrichment";
import { cleanupExpiredTracking, writeTrackingEvent } from "./repository";
import { hasValidTrackingAdminRequest } from "./auth";

const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000;
let lastCleanupAt = 0;

type PageViewInput = {
  sessionId: string;
  pathname: string;
  referrerHost: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
};

export type InteractionDetail = Record<string, string | number | boolean | null>;

function record(input: Omit<PageViewInput, "referrerHost" | "utmSource" | "utmMedium" | "utmCampaign"> & {
  request: Request;
  eventType: TrackingEventType;
  referrerHost?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  prompt?: string;
  chatOutcome?: string;
  target?: string | null;
  detail?: InteractionDetail | null;
}) {
  if (
    !isTrackingEnabled() ||
    input.pathname.startsWith("/tracking") ||
    hasValidTrackingAdminRequest(input.request)
  ) return;
  const ip = getTrustedClientIp(input.request);
  const { deviceType, browserFamily } = getDeviceDetails(input.request);
  const isBot = isBotRequest(input.request);
  if (isBot) return;
  const createdAt = Date.now();

  try {
    const result = writeTrackingEvent({
      sessionId: input.sessionId,
      ipHash: hashIp(ip),
      ipCiphertext: encryptTrackingValue(ip),
      deviceType,
      browserFamily,
      isBot: false,
      isInternal: false,
      eventType: input.eventType,
      pathname: input.pathname,
      referrerHost: input.referrerHost,
      utmSource: input.utmSource,
      utmMedium: input.utmMedium,
      utmCampaign: input.utmCampaign,
      promptCiphertext: input.prompt ? encryptTrackingValue(input.prompt) : null,
      promptLength: input.prompt?.length ?? null,
      chatOutcome: input.chatOutcome ?? "accepted",
      target: input.target ?? null,
      detail: input.detail ?? null,
    });
    if (result.isNewSession && !result.hasCachedEnrichment && ip !== "unknown") {
      void enrichSessionFromIpinfo(input.sessionId, ip);
    }
    if (createdAt - lastCleanupAt > CLEANUP_INTERVAL_MS) {
      cleanupExpiredTracking(getRetentionDays());
      lastCleanupAt = createdAt;
    }
  } catch {
    // Analytics must never become a dependency of the visitor experience.
  }
}

/** Per-IP sliding window for browser-originated writes. Fails open when the IP is unknown. */
function createRateLimiter(windowMs: number, max: number) {
  const buckets = new Map<string, { count: number; resetAt: number }>();
  return (request: Request) => {
    let key: string | null = null;
    try {
      const ip = getTrustedClientIp(request);
      key = ip === "unknown" ? null : hashIp(ip);
    } catch {
      // If configuration is broken, fail closed for collection but never for the page.
    }
    if (!key) return false;
    const now = Date.now();
    const existing = buckets.get(key);
    if (!existing || existing.resetAt <= now) {
      if (buckets.size > 10_000) buckets.clear();
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      return false;
    }
    existing.count += 1;
    return existing.count > max;
  };
}

const isPageViewRateLimited = createRateLimiter(60_000, 120);
const isResumeDownloadRateLimited = createRateLimiter(60_000, 20);
const isInteractionRateLimited = createRateLimiter(60_000, 60);

export function recordPageView(request: Request, input: PageViewInput) {
  if (hasValidTrackingAdminRequest(request) || isPageViewRateLimited(request)) return;
  record({ request, eventType: "page_view", ...input });
}

export function recordChatPrompt(
  request: Request,
  input: { sessionId: string; pathname: string; prompt: string; chatOutcome?: string },
) {
  record({ request, eventType: "chat_prompt", ...input });
}

export function recordResumeDownload(
  request: Request,
  input: { sessionId: string; pathname: string },
) {
  if (hasValidTrackingAdminRequest(request) || isResumeDownloadRateLimited(request)) return;
  record({ request, eventType: "resume_download", ...input });
}

export function recordInteraction(
  request: Request,
  input: {
    sessionId: string;
    pathname: string;
    eventType: InteractionEventType;
    target: string;
    detail?: InteractionDetail | null;
  },
) {
  if (hasValidTrackingAdminRequest(request) || isInteractionRateLimited(request)) return;
  record({ request, ...input });
}
