"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useRef } from "react";
import { visibleSections } from "@/content/site-sections";

/** Fired on `window` when the visitor types "hi"; the desk listens and waves. */
export const WAVE_EVENT = "studio:wave";

const SEQUENCE_WINDOW_MS = 900;

function isTextInput(element: Element | null): boolean {
  if (!element) return false;
  const tag = element.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    (element as HTMLElement).isContentEditable
  );
}

const goKeyBySection: Record<string, string> = {
  home: "h",
  projects: "p",
  resume: "r",
  ask: "a",
  music: "m",
  photos: "o",
};

/**
 * Site-wide keyboard shortcuts plus a `?` help sheet:
 *   ⌘K / Ctrl+K  ask (handled by AskPalette)   ·   /  ask
 *   g then h/p/r/a  go to Home / Projects / Resume / Ask
 *   t  toggle theme   ·   ?  this sheet   ·   type "hi" for a small surprise
 * Everything is ignored while typing in a field or while a dialog is open.
 */
export function Shortcuts() {
  const router = useRouter();
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const pendingRef = useRef<{ key: string; at: number } | null>(null);
  const sections = visibleSections();

  const closeHelp = useCallback(() => {
    dialogRef.current?.close();
  }, []);

  const openHelp = useCallback(() => {
    const dialog = dialogRef.current;
    if (!dialog || dialog.open) return;
    dialog.showModal();
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTextInput(document.activeElement)) return;
      // Any other open <dialog> (e.g. the Ask palette) owns the keyboard.
      const openDialog = document.querySelector("dialog[open]");
      if (openDialog && openDialog !== dialogRef.current) return;

      const key = event.key;

      if (key === "?") {
        event.preventDefault();
        if (dialogRef.current?.open) closeHelp();
        else openHelp();
        return;
      }
      if (dialogRef.current?.open) return;

      const now = Date.now();
      const pending = pendingRef.current;
      const lower = key.toLowerCase();

      if (pending && now - pending.at <= SEQUENCE_WINDOW_MS) {
        pendingRef.current = null;
        if (pending.key === "g") {
          const target = sections.find(
            (section) => goKeyBySection[section.id] === lower,
          );
          if (target) {
            event.preventDefault();
            router.push(target.href);
            return;
          }
        }
        if (pending.key === "h" && lower === "i") {
          event.preventDefault();
          window.dispatchEvent(new CustomEvent(WAVE_EVENT));
          return;
        }
      }

      if (lower === "g" || lower === "h") {
        pendingRef.current = { key: lower, at: now };
        return;
      }

      if (lower === "t") {
        event.preventDefault();
        setTheme(resolvedTheme === "light" ? "dark" : "light");
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closeHelp, openHelp, resolvedTheme, router, sections, setTheme]);

  const rows: Array<[string, string]> = [
    ["⌘ K  /  Ctrl K", "Ask the portfolio AI"],
    ["/", "Ask the portfolio AI"],
    ...sections.map(
      (section) =>
        [`g  ${goKeyBySection[section.id]}`, `Go to ${section.label}`] as [
          string,
          string,
        ],
    ),
    ["t", "Toggle light / dark"],
    ["?", "This sheet"],
    ["h  i", "Say hi"],
    // The deck owns these while /music is mounted.
    ...(pathname === "/music"
      ? ([
          ["space", "Drop / lift the needle"],
          ["n  ·  p", "Next / previous record"],
          ["s", "Shuffle the crate"],
        ] as Array<[string, string]>)
      : []),
  ];

  return (
    <dialog
      ref={dialogRef}
      aria-label="Keyboard shortcuts"
      onCancel={(event) => {
        event.preventDefault();
        closeHelp();
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current) closeHelp();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-[18px] border border-border bg-surface p-0 text-foreground shadow-xl backdrop:bg-black/50"
    >
      <div className="flex flex-col gap-4 p-5">
        <div className="flex items-baseline justify-between">
          <p className="font-display text-sm font-semibold">
            Keyboard shortcuts
          </p>
          <button
            type="button"
            onClick={closeHelp}
            className="rounded-[8px] px-2 py-1 font-mono text-xs text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            esc
          </button>
        </div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
          {rows.map(([keys, label]) => (
            <div key={keys + label} className="contents">
              <dt>
                <kbd className="rounded-[6px] border border-border bg-background px-1.5 py-0.5 font-mono text-[12px] text-foreground">
                  {keys}
                </kbd>
              </dt>
              <dd className="text-muted-foreground">{label}</dd>
            </div>
          ))}
        </dl>
      </div>
    </dialog>
  );
}
