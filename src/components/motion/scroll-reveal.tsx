"use client";

import { type CSSProperties, type ReactNode, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
  /** Stagger in ms, applied as a transition delay once the element intersects. */
  delay?: number;
  /** Render as this tag; defaults to div. */
  as?: "div" | "section" | "article" | "li";
}

/**
 * Reveals its children as they scroll into view. The server HTML is fully
 * visible; on mount the element is hidden only if it is still below the
 * fold, so above-the-fold content never flashes and JS-less clients see
 * everything. Reduced motion is handled by the stylesheet (`.scroll-reveal`).
 */
export function ScrollReveal({
  children,
  className,
  delay = 0,
  as: Tag = "div",
}: ScrollRevealProps) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element || typeof IntersectionObserver === "undefined") return;

    const rect = element.getBoundingClientRect();
    const alreadyVisible = rect.top < window.innerHeight * 0.92;
    if (alreadyVisible) return;

    element.setAttribute("data-pending", "");

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          element.removeAttribute("data-pending");
          element.setAttribute("data-shown", "");
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  const style: CSSProperties | undefined =
    delay > 0 ? ({ "--reveal-delay": `${delay}ms` } as CSSProperties) : undefined;

  return (
    <Tag
      ref={ref as never}
      className={cn("scroll-reveal", className)}
      style={style}
    >
      {children}
    </Tag>
  );
}
