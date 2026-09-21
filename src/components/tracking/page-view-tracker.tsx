"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { getTrackingSessionId } from "./session-id";
import { trackEvent } from "./track-event";

function valueOrNull(value: string | null, maxLength: number) {
  const normalized = value?.trim();
  return normalized && normalized.length <= maxLength ? normalized : null;
}

export function PageViewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!pathname || pathname.startsWith("/tracking")) return;
    let referrerHost: string | null = null;
    try {
      referrerHost = document.referrer ? new URL(document.referrer).host : null;
    } catch {
      referrerHost = null;
    }
    const body = JSON.stringify({
      sessionId: getTrackingSessionId(),
      pathname,
      referrerHost: valueOrNull(referrerHost, 255),
      utmSource: valueOrNull(searchParams.get("utm_source"), 100),
      utmMedium: valueOrNull(searchParams.get("utm_medium"), 100),
      utmCampaign: valueOrNull(searchParams.get("utm_campaign"), 160),
    });
    void fetch("/api/tracking/page-view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
      credentials: "same-origin",
    }).catch(() => undefined);
  }, [pathname, searchParams]);

  // One delegated listener catches every off-site link (GitHub, LinkedIn,
  // project repos, mailto) without each component having to opt in.
  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0) return;
      const anchor = (event.target as Element | null)?.closest?.("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      const href = anchor.href;
      if (!href) return;
      let outbound = false;
      try {
        const url = new URL(href, window.location.href);
        outbound =
          url.protocol === "mailto:" ||
          url.protocol === "tel:" ||
          (/^https?:$/.test(url.protocol) && url.host !== window.location.host);
      } catch {
        return;
      }
      if (!outbound) return;
      trackEvent({
        type: "outbound_click",
        target: href.slice(0, 512),
        detail: { text: anchor.textContent?.trim().slice(0, 80) || anchor.getAttribute("aria-label")?.slice(0, 80) || null },
      });
    }
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  return null;
}
