import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface RevealProps {
  /** Stagger delay in ms, capped by callers at ~200ms per item. */
  delay?: number;
  children: ReactNode;
  className?: string;
}

/**
 * Entrance wrapper: fades in and rises 8px once. Implemented as a CSS
 * animation (`.reveal` in globals.css) rather than a JS-driven one so the
 * server-rendered HTML is never stuck invisible waiting for hydration, and
 * `prefers-reduced-motion` is handled by the stylesheet.
 */
export function Reveal({ delay = 0, children, className }: RevealProps) {
  const style: CSSProperties | undefined =
    delay > 0 ? { animationDelay: `${delay}ms` } : undefined;

  return (
    <div className={cn("reveal", className)} style={style}>
      {children}
    </div>
  );
}
