"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { type ReactNode, useRef } from "react";
import { cn } from "@/lib/utils";

interface CardRailProps {
  /** Announced on the scroll container, which is focusable for keyboard scrolling. */
  label: string;
  /** Fixed-width, snap-aligned cards. */
  children: ReactNode;
  className?: string;
}

/** Gap between cards (Tailwind `gap-6`), in px — the step the arrows scroll by. */
const GAP = 24;

const arrowClass =
  "pointer-events-auto hidden h-9 w-9 items-center justify-center rounded-full border border-border bg-surface/90 text-muted-foreground shadow-[0_8px_24px_-16px_rgba(0,0,0,0.6)] backdrop-blur transition-colors hover:border-input hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring lg:flex";

/**
 * A horizontally scrolling, snapping rail of cards. The cards themselves come
 * from the caller, so the rail stays presentation-only. The container is a
 * focusable group so the arrow keys scroll it without a mouse; the two arrow
 * buttons are a pointer convenience at `lg`, and carry their own labels.
 */
export function CardRail({ label, children, className }: CardRailProps) {
  const scroller = useRef<HTMLDivElement>(null);

  const scrollByCard = (direction: 1 | -1) => {
    const element = scroller.current;
    if (!element) return;
    const card = element.firstElementChild;
    const step = (card ? card.getBoundingClientRect().width : 320) + GAP;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    element.scrollBy({
      left: direction * step,
      behavior: reduced ? "auto" : "smooth",
    });
  };

  return (
    <div className={cn("relative -mx-5 sm:-mx-8", className)}>
      <div
        ref={scroller}
        tabIndex={0}
        role="group"
        aria-label={label}
        className="flex snap-x snap-mandatory scroll-px-5 gap-6 overflow-x-auto scroll-smooth px-5 pb-2 [-ms-overflow-style:none] [scrollbar-width:none] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:scroll-auto sm:scroll-px-8 sm:px-8 [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>

      {/* Edge fades + arrows: decoration over the rail, never in its way. */}
      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center">
        <span
          aria-hidden="true"
          className="absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-background to-transparent sm:w-10"
        />
        <button
          type="button"
          aria-label="Scroll left"
          onClick={() => scrollByCard(-1)}
          className={cn(arrowClass, "relative ml-1")}
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center">
        <span
          aria-hidden="true"
          className="absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-background to-transparent sm:w-10"
        />
        <button
          type="button"
          aria-label="Scroll right"
          onClick={() => scrollByCard(1)}
          className={cn(arrowClass, "relative mr-1")}
        >
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
