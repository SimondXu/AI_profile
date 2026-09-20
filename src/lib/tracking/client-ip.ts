import "server-only";

import { isIP } from "node:net";

const BOT_PATTERN = /bot|crawler|spider|curl|wget|headless|lighthouse/i;

function normalizeIp(value: string | null | undefined) {
  if (!value) return null;
  const candidate = value.trim().replace(/^\[|\]$/g, "").replace(/^::ffff:/, "");
  return isIP(candidate) ? candidate : null;
}

/**
 * Forwarded headers are only meaningful when the reverse proxy overwrites them.
 * Keep this opt-in because the public Docker port can otherwise be spoofed.
 *
 * Cloudflare always overwrites `cf-connecting-ip` but only *appends* to an
 * existing `x-forwarded-for`, so a client-supplied first hop would survive;
 * prefer the Cloudflare header when present.
 */
export function getTrustedClientIp(request: Request) {
  if (process.env.TRACKING_TRUST_PROXY !== "true") return "unknown";

  const forwarded = request.headers.get("x-forwarded-for");
  const forwardedIp = normalizeIp(forwarded?.split(",")[0]);
  return (
    normalizeIp(request.headers.get("cf-connecting-ip")) ??
    normalizeIp(request.headers.get("x-real-ip")) ??
    forwardedIp ??
    "unknown"
  );
}

export function isBotRequest(request: Request) {
  return BOT_PATTERN.test(request.headers.get("user-agent") ?? "");
}

export function getDeviceDetails(request: Request) {
  const userAgent = request.headers.get("user-agent") ?? "";
  const deviceType = /ipad|tablet/i.test(userAgent)
    ? "tablet"
    : /mobi|iphone|android/i.test(userAgent)
      ? "mobile"
      : "desktop";
  const browserFamily = /edg\//i.test(userAgent)
    ? "Edge"
    : /firefox\//i.test(userAgent)
      ? "Firefox"
      : /chrome\//i.test(userAgent)
        ? "Chrome"
        : /safari\//i.test(userAgent)
          ? "Safari"
          : "Other";

  return { deviceType, browserFamily };
}
