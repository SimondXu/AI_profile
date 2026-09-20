"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type Status = "checking" | "online" | "local";

/**
 * "Portfolio AI · online" pill. Asks /api/status once after mount so the
 * label reflects the running server, not the build. Renders a neutral
 * state on the server so there is nothing to mismatch on hydration.
 */
export function AiStatusPill({ className }: { className?: string }) {
  const [status, setStatus] = useState<Status>("checking");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/status", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { ai?: boolean } | null) => {
        if (cancelled) return;
        setStatus(data?.ai ? "online" : "local");
      })
      .catch(() => {
        if (!cancelled) setStatus("local");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const label =
    status === "online"
      ? "Portfolio AI online"
      : status === "local"
        ? "Portfolio AI · local answers"
        : "Portfolio AI";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-border bg-surface/70 px-3 py-1 font-mono text-[12px] text-muted-foreground backdrop-blur",
        className,
      )}
      aria-live="polite"
    >
      <span
        className={cn(
          "pulse-dot",
          status === "online" ? "text-emerald-500" : "text-muted-foreground",
        )}
        aria-hidden="true"
      />
      {label}
    </span>
  );
}
