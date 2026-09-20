"use client";

import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useId, useRef, useState } from "react";

interface HeroAskFormProps {
  /** Real questions the AI can answer; cycled as a typed placeholder. */
  suggestions: ReadonlyArray<string>;
  label: string;
}

const TYPE_MS = 34;
const DELETE_MS = 16;
const HOLD_MS = 2200;
const GAP_MS = 500;

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * Hero shortcut into the Ask experience. Never calls the chat API — it only
 * routes to /chat with the question pre-filled. The placeholder "types"
 * through the configured questions while the field is idle; it stops as soon
 * as the visitor focuses or types, and is static under reduced motion.
 */
export function HeroAskForm({ suggestions, label }: HeroAskFormProps) {
  const router = useRouter();
  const inputId = useId();
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [typed, setTyped] = useState(suggestions[0] ?? "");
  const [animating, setAnimating] = useState(false);
  const timer = useRef<number | null>(null);

  const idle = !focused && query.length === 0;

  useEffect(() => {
    if (!idle || suggestions.length === 0 || prefersReducedMotion()) {
      setAnimating(false);
      return;
    }
    setAnimating(true);

    let index = 0;
    let position = suggestions[0].length;
    let phase: "hold" | "delete" | "type" = "hold";
    let alive = true;

    const step = () => {
      if (!alive) return;
      const current = suggestions[index];
      if (phase === "hold") {
        phase = "delete";
        timer.current = window.setTimeout(step, HOLD_MS);
        return;
      }
      if (phase === "delete") {
        if (position > 0) {
          position -= 1;
          setTyped(current.slice(0, position));
          timer.current = window.setTimeout(step, DELETE_MS);
          return;
        }
        index = (index + 1) % suggestions.length;
        phase = "type";
        timer.current = window.setTimeout(step, GAP_MS);
        return;
      }
      const next = suggestions[index];
      if (position < next.length) {
        position += 1;
        setTyped(next.slice(0, position));
        timer.current = window.setTimeout(step, TYPE_MS);
        return;
      }
      phase = "hold";
      timer.current = window.setTimeout(step, HOLD_MS);
    };

    timer.current = window.setTimeout(step, HOLD_MS);
    return () => {
      alive = false;
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [idle, suggestions]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = (query || typed).trim();
    if (!trimmed) return;
    router.push(`/chat?q=${encodeURIComponent(trimmed)}`);
  };

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-md flex-col gap-2">
      <label htmlFor={inputId} className="text-sm font-medium text-foreground">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <input
            id={inputId}
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={animating ? "" : suggestions[0] ?? "Ask about my work"}
            autoComplete="off"
            className="min-h-11 w-full rounded-[10px] border border-input bg-surface/80 px-4 text-sm text-foreground backdrop-blur placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          />
          {animating && idle ? (
            <span
              aria-hidden="true"
              className="caret pointer-events-none absolute inset-y-0 left-4 flex items-center text-sm text-muted-foreground"
            >
              {typed}
            </span>
          ) : null}
        </div>
        <button
          type="submit"
          aria-label="Ask"
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] bg-accent text-accent-foreground transition-transform hover:-translate-y-0.5 hover:opacity-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:translate-y-0"
        >
          <ArrowRight className="h-[18px] w-[18px]" aria-hidden="true" />
        </button>
      </div>
      <p className="font-mono text-[11px] text-muted-foreground">
        Enter sends the suggestion as-is · ⌘K anywhere
      </p>
    </form>
  );
}
