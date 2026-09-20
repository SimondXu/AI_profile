"use client";

import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import {
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { WAVE_EVENT } from "@/components/site/shortcuts";
import { visibleSections } from "@/content/site-sections";
import { cn } from "@/lib/utils";
import styles from "./collection-desk.module.css";

export interface DeskNote {
  /** Short real fact for the sticky note, e.g. "Last push · 2 weeks ago". */
  text: string;
  href?: string;
}

interface CollectionDeskProps {
  avatarSrc: string;
  /** What the speech bubble shows at rest. */
  askQuestion: string;
  /** Real lines (fun facts, beliefs) the avatar cycles through when tapped. */
  lines?: ReadonlyArray<string>;
  /** The question typed inside the terminal object; it becomes the Ask link. */
  terminalQuestion: string;
  /** Optional sticky note with live data; omitted when there is none. */
  note?: DeskNote | null;
}

type DeskObjectId = "projects" | "resume" | "ask" | "music" | "photos";

const OBJECT_ORDER: DeskObjectId[] = ["projects", "resume", "ask", "music", "photos"];

const OBJECT_DEPTH: Record<DeskObjectId, number> = {
  projects: 0.6,
  resume: 0.7,
  ask: 0.85,
  music: 0.5,
  photos: 0.55,
};

const OBJECT_SLOT_CLASS: Record<DeskObjectId, string> = {
  projects: styles.slotProjects,
  resume: styles.slotResume,
  ask: styles.slotAsk,
  music: styles.slotMusic,
  photos: styles.slotPhotos,
};

const OBJECT_META: Record<DeskObjectId, { label: string; href: string }> = {
  projects: { label: "Projects", href: "/projects" },
  resume: { label: "Resume", href: "/resume" },
  ask: { label: "Ask", href: "/chat" },
  music: { label: "Music", href: "/music" },
  photos: { label: "Photos", href: "/photos" },
};

const AVATAR_DEPTH = 0.4;
const WAVE_MS = 900;
const WAVE_LINE = "Hi! Ask me anything.";

const linkClass =
  "group relative flex min-h-11 w-full flex-col items-start gap-2 rounded-[10px] p-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

const SHADOW_REST =
  "shadow-[0_1px_2px_rgba(0,0,0,0.12),0_10px_24px_-14px_rgba(0,0,0,0.28)]";
const SHADOW_HOVER =
  "group-hover:shadow-[0_2px_4px_rgba(0,0,0,0.16),0_18px_36px_-14px_rgba(0,0,0,0.38)] group-focus-visible:shadow-[0_2px_4px_rgba(0,0,0,0.16),0_18px_36px_-14px_rgba(0,0,0,0.38)]";

function canTilt(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  return fine && !reduced;
}

/** Object visuals — decorative markup only; the real link + label carry semantics. */
function ObjectVisual({ id, terminalQuestion }: { id: DeskObjectId; terminalQuestion: string }) {
  switch (id) {
    case "projects":
      return (
        <div className="relative h-20 w-full" aria-hidden="true">
          <div
            className={cn(
              "absolute inset-x-2 top-3 h-14 rotate-[-6deg] rounded-[10px] border border-border bg-material-paper transition-transform duration-200 group-hover:-translate-x-3 group-hover:-translate-y-1.5 group-hover:rotate-[-12deg] group-focus-visible:-translate-x-3 group-focus-visible:-translate-y-1.5 group-focus-visible:rotate-[-12deg] motion-reduce:group-hover:translate-x-0 motion-reduce:group-hover:translate-y-0 motion-reduce:group-hover:rotate-[-6deg]",
              SHADOW_REST,
              SHADOW_HOVER,
            )}
          />
          <div
            className={cn(
              "absolute inset-x-1 top-1.5 h-14 rounded-[10px] border border-border bg-material-paper transition-transform duration-200 group-hover:-translate-y-1 group-focus-visible:-translate-y-1 motion-reduce:group-hover:translate-y-0",
              SHADOW_REST,
              SHADOW_HOVER,
            )}
          />
          <div
            className={cn(
              "absolute inset-x-0 top-0 h-14 rotate-[6deg] rounded-[10px] border border-border bg-material-paper transition-transform duration-200 group-hover:translate-x-3 group-hover:-translate-y-1.5 group-hover:rotate-[12deg] group-focus-visible:translate-x-3 group-focus-visible:-translate-y-1.5 group-focus-visible:rotate-[12deg] motion-reduce:group-hover:translate-x-0 motion-reduce:group-hover:translate-y-0 motion-reduce:group-hover:rotate-[6deg]",
              SHADOW_REST,
              SHADOW_HOVER,
            )}
          />
        </div>
      );
    case "resume":
      return (
        <div
          className={cn(
            "relative h-36 w-full rotate-[3deg] rounded-[10px] border border-border bg-material-paper p-3 transition-transform duration-200 group-hover:-translate-y-1.5 group-hover:rotate-[1deg] group-focus-visible:-translate-y-1.5 group-focus-visible:rotate-[1deg] motion-reduce:group-hover:translate-y-0 motion-reduce:group-hover:rotate-[3deg]",
            SHADOW_REST,
            SHADOW_HOVER,
          )}
          aria-hidden="true"
        >
          <div className="h-1.5 w-1/2 rounded bg-accent/70" />
          <div className="mt-3 h-1.5 w-4/5 rounded bg-black/15" />
          <div className="mt-2 h-1.5 w-3/5 rounded bg-black/15" />
          <div className="mt-2 h-1.5 w-full rounded bg-black/15" />
          <div className="mt-2 h-1.5 w-2/3 rounded bg-black/15" />
          <div className="mt-2 h-1.5 w-3/4 rounded bg-black/15" />
        </div>
      );
    case "ask":
      return (
        <div
          className={cn(
            "relative w-full overflow-hidden rounded-[10px] border border-black/40 bg-material-vinyl text-[11px] leading-relaxed text-[#e8e6df] transition-transform duration-200 group-hover:-translate-y-1.5 group-focus-visible:-translate-y-1.5 motion-reduce:group-hover:translate-y-0",
            SHADOW_REST,
            SHADOW_HOVER,
          )}
          aria-hidden="true"
        >
          <div className="flex items-center gap-1.5 border-b border-white/10 px-2.5 py-1.5">
            <span className="h-2 w-2 rounded-full bg-[#ff5f57]" />
            <span className="h-2 w-2 rounded-full bg-[#febc2e]" />
            <span className="h-2 w-2 rounded-full bg-[#28c840]" />
            <span className="ml-auto font-mono text-[9px] text-white/40">simon — ask</span>
          </div>
          <p className="px-2.5 py-2 font-mono">
            <span className="text-[#7ee787]">$</span> ask{" "}
            <span className="text-[#a5d6ff]">&quot;{terminalQuestion}&quot;</span>
            <span className={styles.caret} />
          </p>
        </div>
      );
    case "music":
      return (
        <div className="relative h-20 w-full overflow-hidden rounded-[10px] bg-material-wood" aria-hidden="true">
          <div className="absolute left-1/2 top-1/2 -ml-8 -mt-8 h-16 w-16 rounded-full bg-material-vinyl transition-transform duration-200 group-hover:translate-x-3 group-focus-visible:translate-x-3" />
        </div>
      );
    case "photos":
      return (
        <div
          className="relative aspect-[4/3] w-full rounded-[10px] bg-material-wood p-[6px] transition-transform duration-200 group-hover:rotate-2 group-focus-visible:rotate-2"
          aria-hidden="true"
        >
          <div className="h-full w-full rounded-[6px] bg-background" />
        </div>
      );
    default:
      return null;
  }
}

/**
 * Right-column desk: avatar plus real navigation links styled as tactile
 * objects. Only sections marked `visible` in site-sections.ts render, so
 * empty Music/Photos routes stay off the desk until they have content.
 * The avatar "talks" (tap it for real fun facts; type "hi" anywhere and the
 * desk waves back), the terminal is the Ask entry, and the sticky note
 * carries live data when there is some.
 */
export function CollectionDesk({
  avatarSrc,
  askQuestion,
  lines = [],
  terminalQuestion,
  note = null,
}: CollectionDeskProps) {
  const reducedMotion = useReducedMotion();
  const visibleIds = new Set(visibleSections().map((section) => section.id));
  const objects = OBJECT_ORDER.filter((id) => visibleIds.has(id));

  const [bubble, setBubble] = useState(askQuestion);
  const [waving, setWaving] = useState(false);
  const lineIndex = useRef(-1);
  const waveTimer = useRef<number | null>(null);

  const sayNextLine = useCallback(() => {
    if (lines.length === 0) return;
    lineIndex.current = (lineIndex.current + 1) % lines.length;
    setBubble(lines[lineIndex.current]);
  }, [lines]);

  useEffect(() => {
    const handleWave = () => {
      setBubble(WAVE_LINE);
      setWaving(true);
      if (waveTimer.current) window.clearTimeout(waveTimer.current);
      waveTimer.current = window.setTimeout(() => setWaving(false), WAVE_MS);
    };
    window.addEventListener(WAVE_EVENT, handleWave);
    return () => {
      window.removeEventListener(WAVE_EVENT, handleWave);
      if (waveTimer.current) window.clearTimeout(waveTimer.current);
    };
  }, []);

  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const springX = useSpring(mx, { stiffness: 260, damping: 26, mass: 0.8 });
  const springY = useSpring(my, { stiffness: 260, damping: 26, mass: 0.8 });

  const deskRotateX = useTransform(springY, [-1, 1], [3, -3]);
  const deskRotateY = useTransform(springX, [-1, 1], [-3, 3]);

  const projectsX = useTransform(springX, [-1, 1], [-6 * OBJECT_DEPTH.projects, 6 * OBJECT_DEPTH.projects]);
  const projectsY = useTransform(springY, [-1, 1], [-6 * OBJECT_DEPTH.projects, 6 * OBJECT_DEPTH.projects]);
  const resumeX = useTransform(springX, [-1, 1], [-6 * OBJECT_DEPTH.resume, 6 * OBJECT_DEPTH.resume]);
  const resumeY = useTransform(springY, [-1, 1], [-6 * OBJECT_DEPTH.resume, 6 * OBJECT_DEPTH.resume]);
  const askX = useTransform(springX, [-1, 1], [-6 * OBJECT_DEPTH.ask, 6 * OBJECT_DEPTH.ask]);
  const askY = useTransform(springY, [-1, 1], [-6 * OBJECT_DEPTH.ask, 6 * OBJECT_DEPTH.ask]);
  const musicX = useTransform(springX, [-1, 1], [-6 * OBJECT_DEPTH.music, 6 * OBJECT_DEPTH.music]);
  const musicY = useTransform(springY, [-1, 1], [-6 * OBJECT_DEPTH.music, 6 * OBJECT_DEPTH.music]);
  const photosX = useTransform(springX, [-1, 1], [-6 * OBJECT_DEPTH.photos, 6 * OBJECT_DEPTH.photos]);
  const photosY = useTransform(springY, [-1, 1], [-6 * OBJECT_DEPTH.photos, 6 * OBJECT_DEPTH.photos]);
  const avatarX = useTransform(springX, [-1, 1], [-6 * AVATAR_DEPTH, 6 * AVATAR_DEPTH]);
  const avatarY = useTransform(springY, [-1, 1], [-6 * AVATAR_DEPTH, 6 * AVATAR_DEPTH]);
  const decorX = useTransform(springX, [-1, 1], [-3, 3]);
  const decorY = useTransform(springY, [-1, 1], [-3, 3]);

  const objectTranslate: Record<DeskObjectId, { x: typeof projectsX; y: typeof projectsY }> = {
    projects: { x: projectsX, y: projectsY },
    resume: { x: resumeX, y: resumeY },
    ask: { x: askX, y: askY },
    music: { x: musicX, y: musicY },
    photos: { x: photosX, y: photosY },
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!canTilt()) return;
    const rect = event.currentTarget.getBoundingClientRect();
    mx.set(((event.clientX - rect.left) / rect.width) * 2 - 1);
    my.set(((event.clientY - rect.top) / rect.height) * 2 - 1);
  };

  const handlePointerLeave = () => {
    mx.set(0);
    my.set(0);
  };

  const decorStyle = reducedMotion ? undefined : { x: decorX, y: decorY };

  return (
    <div className={styles.scene}>
      <motion.div
        className={cn(styles.desk, "rounded-[26px] border border-border bg-surface")}
        style={reducedMotion ? undefined : { rotateX: deskRotateX, rotateY: deskRotateY }}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
      >
        {/* Avatar (talks) */}
        <div className={cn(styles.decor, styles.avatarSlot, "reveal")}>
          <motion.div style={reducedMotion ? undefined : { x: avatarX, y: avatarY }}>
            <button
              type="button"
              onClick={sayNextLine}
              aria-label={lines.length ? "Tap for a fun fact about Simon" : "Simon's avatar"}
              title={lines.length ? "Tap for a fun fact" : undefined}
              className={cn(
                styles.avatarCard,
                "block rounded-[10px] bg-material-paper p-1.5 transition-transform duration-200 hover:-translate-y-1 hover:rotate-[-2deg] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:hover:translate-y-0 motion-reduce:hover:rotate-0",
                waving && "wave",
              )}
            >
              <Image
                src={avatarSrc}
                alt=""
                width={128}
                height={128}
                priority
                className="h-32 w-32 rounded-[6px] object-cover"
              />
            </button>
          </motion.div>
        </div>
        <p className="sr-only" aria-live="polite">
          {bubble}
        </p>

        {/* Speech bubble (decorative mirror of the live region) */}
        <div
          className={cn(styles.decor, styles.bubbleSlot, "reveal")}
          style={{ animationDelay: "60ms" }}
          aria-hidden="true"
        >
          <motion.div style={decorStyle}>
            <div
              className={cn(
                styles.bubble,
                "relative rounded-[18px] bg-accent-soft px-3.5 py-3 text-xs leading-snug text-foreground",
                SHADOW_REST,
              )}
            >
              <p className="line-clamp-3">{bubble}</p>
            </div>
          </motion.div>
        </div>

        {/* Sticky note with live data */}
        {note ? (
          <div
            className={cn(styles.decor, styles.noteSlot, "reveal")}
            style={{ animationDelay: "200ms" }}
          >
            <motion.div style={decorStyle}>
              {note.href ? (
                <a
                  href={note.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    styles.note,
                    "block whitespace-pre-line rounded-[6px] px-3 py-2.5 font-mono text-[10px] leading-snug transition-transform duration-200 hover:-translate-y-1 hover:rotate-[1deg] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:hover:translate-y-0",
                  )}
                >
                  {note.text}
                </a>
              ) : (
                <p className={cn(styles.note, "whitespace-pre-line rounded-[6px] px-3 py-2.5 font-mono text-[10px] leading-snug")}>
                  {note.text}
                </p>
              )}
            </motion.div>
          </div>
        ) : null}

        {/* Mug (pure decoration) */}
        <div
          className={cn(styles.decor, styles.mugSlot, "reveal")}
          style={{ animationDelay: "240ms" }}
          aria-hidden="true"
        >
          <motion.div style={decorStyle}>
            <div className={styles.mug} />
          </motion.div>
        </div>

        {objects.map((id, index) => {
          const meta = OBJECT_META[id];
          const translate = objectTranslate[id];

          return (
            <div
              key={id}
              className={cn(styles.slot, OBJECT_SLOT_CLASS[id], "reveal")}
              style={{ animationDelay: `${(index + 1) * 40}ms` }}
            >
              <motion.div style={reducedMotion ? undefined : { x: translate.x, y: translate.y }}>
                <Link
                  href={meta.href}
                  className={cn(linkClass, waving && "wave")}
                  style={waving ? { ["--wave-delay" as string]: `${index * 90}ms` } : undefined}
                >
                  <ObjectVisual id={id} terminalQuestion={terminalQuestion} />
                  <span className="text-sm font-medium text-foreground">{meta.label}</span>
                </Link>
              </motion.div>
            </div>
          );
        })}
      </motion.div>
    </div>
  );
}
