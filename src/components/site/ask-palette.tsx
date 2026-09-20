"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * A global launcher, not a second chat surface: it collects a question and
 * navigates to `/chat?q=<encoded>`, where the existing chat state machine
 * sends it once. Opens with ⌘K / Ctrl+K anywhere, or `/` when focus isn't
 * inside a text field. Built on the native <dialog> element so focus
 * trapping and inertness come for free.
 */

function isTextInput(element: Element | null): boolean {
  if (!element) return false;
  const tag = element.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    (element as HTMLElement).isContentEditable
  );
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

interface AskPaletteProps {
  /** Preset questions supplied by the server layout so the config JSON stays out of the client bundle. */
  questions: ReadonlyArray<string>;
}

export function AskPalette({ questions }: AskPaletteProps) {
  const router = useRouter();
  const presetQuestions = questions;

  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const presetRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const closeTimeoutRef = useRef<number | null>(null);

  const [query, setQuery] = useState("");
  const [entered, setEntered] = useState(false);

  const openDialog = useCallback(() => {
    const dialog = dialogRef.current;
    if (!dialog || dialog.open) return;

    previousFocusRef.current = document.activeElement as HTMLElement | null;
    setQuery("");
    dialog.showModal();

    if (prefersReducedMotion()) {
      setEntered(true);
    } else {
      setEntered(false);
      requestAnimationFrame(() => requestAnimationFrame(() => setEntered(true)));
    }

    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  const closeDialog = useCallback(() => {
    const dialog = dialogRef.current;
    if (!dialog || !dialog.open) return;

    setEntered(false);
    if (prefersReducedMotion()) {
      dialog.close();
      return;
    }
    closeTimeoutRef.current = window.setTimeout(() => dialog.close(), 160);
  }, []);

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) window.clearTimeout(closeTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const isModK = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";
      if (isModK) {
        event.preventDefault();
        openDialog();
        return;
      }

      if (
        event.key === "/" &&
        !dialogRef.current?.open &&
        !isTextInput(document.activeElement)
      ) {
        event.preventDefault();
        openDialog();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [openDialog]);

  const submit = useCallback(
    (value: string) => {
      const trimmed = value.trim();
      if (!trimmed) return;
      closeDialog();
      router.push(`/chat?q=${encodeURIComponent(trimmed)}`);
    },
    [closeDialog, router],
  );

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submit(query);
  };

  const handleDialogKeyDown = (event: React.KeyboardEvent<HTMLDialogElement>) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    const buttons = presetRefs.current.filter(
      (button): button is HTMLButtonElement => Boolean(button),
    );
    if (!buttons.length) return;

    event.preventDefault();
    const currentIndex = buttons.indexOf(document.activeElement as HTMLButtonElement);

    if (event.key === "ArrowDown") {
      const next = currentIndex === -1 ? 0 : Math.min(currentIndex + 1, buttons.length - 1);
      buttons[next]?.focus();
    } else if (currentIndex <= 0) {
      inputRef.current?.focus();
    } else {
      buttons[currentIndex - 1]?.focus();
    }
  };

  return (
    <dialog
      ref={dialogRef}
      aria-label="Ask my portfolio AI"
      onKeyDown={handleDialogKeyDown}
      onCancel={(event) => {
        event.preventDefault();
        closeDialog();
      }}
      onClose={() => previousFocusRef.current?.focus?.()}
      onClick={(event) => {
        if (event.target === dialogRef.current) closeDialog();
      }}
      className={cn(
        "m-auto w-[calc(100%-2rem)] max-w-xl rounded-[18px] border border-border bg-surface p-0 shadow-xl",
        "backdrop:bg-black/50",
        "transition-[opacity,transform] duration-150 ease-out motion-reduce:transition-none motion-reduce:opacity-100 motion-reduce:scale-100",
        entered ? "opacity-100 scale-100" : "opacity-0 scale-[0.98]",
      )}
    >
      <div className="flex flex-col gap-4 p-5">
        <label
          htmlFor="ask-palette-input"
          className="font-display text-sm font-medium text-foreground"
        >
          Ask my portfolio AI
        </label>

        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <input
            ref={inputRef}
            id="ask-palette-input"
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              // Explicit submit: implicit form submission is not reliable inside <dialog>.
              if (event.key === "Enter" && !event.nativeEvent.isComposing) {
                event.preventDefault();
                submit(query);
              }
            }}
            aria-label="Ask my portfolio AI"
            placeholder="Ask about experience, projects, or skills"
            autoComplete="off"
            className="min-w-0 flex-1 rounded-[10px] border border-input bg-background px-4 py-3 text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          />
          <button
            type="submit"
            className="inline-flex h-11 shrink-0 items-center rounded-[10px] bg-accent px-4 text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            Ask
          </button>
        </form>

        {presetQuestions.length ? (
          <div className="flex flex-col gap-1" aria-label="Suggested questions">
            {presetQuestions.map((question, index) => (
              <button
                key={question}
                type="button"
                ref={(element) => {
                  presetRefs.current[index] = element;
                }}
                onClick={() => submit(question)}
                className="rounded-[10px] px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-surface-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                {question}
              </button>
            ))}
          </div>
        ) : null}

        <p className="font-mono text-xs text-muted-foreground">
          &#8629; ask &middot; esc close
        </p>
      </div>
    </dialog>
  );
}

export default AskPalette;
