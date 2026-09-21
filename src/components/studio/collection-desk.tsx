"use client";

import {
  AnimatePresence,
  motion,
  type MotionValue,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import {
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { SleeveImage } from "@/components/music/sleeve-image";
import { WAVE_EVENT } from "@/components/site/shortcuts";
import type { ProjectPresentation } from "@/content/project-presentation";
import { visibleSections } from "@/content/site-sections";
import { cn } from "@/lib/utils";
import styles from "./collection-desk.module.css";

export interface DeskNote {
  /** Short real fact for the sticky note, e.g. "Last push · 2 weeks ago". */
  text: string;
  href?: string;
}

/** One record out of the crate, picked server-side so SSR and the client agree. */
export interface DeskRecord {
  id: string;
  title: string;
  artist: string;
  artwork?: string;
  /** Dominant colour of the sleeve; paints the disc label. */
  glow?: string;
}

/** A featured project, reduced to what the desk actually draws. */
export interface DeskProject {
  slug: string;
  shortTitle: string;
  coverKind?: ProjectPresentation["coverKind"];
}

interface CollectionDeskProps {
  avatarSrc: string;
  /** What the speech bubble shows at rest. */
  askQuestion: string;
  /** Real lines (fun facts, beliefs) the avatar cycles through when tapped. */
  lines?: ReadonlyArray<string>;
  /** The question typed inside the terminal object; it becomes the Ask link. */
  terminalQuestion: string;
  /** Questions the terminal retypes on a timer; the first one is shown first. */
  terminalQuestions?: ReadonlyArray<string>;
  /** Optional sticky note with live data; omitted when there is none. */
  note?: DeskNote | null;
  /** The record on the desk today; falls back to procedural sleeve art. */
  record?: DeskRecord | null;
  /** Featured projects, drawn as a small fanned stack. */
  projects?: ReadonlyArray<DeskProject>;
}

type DeskObjectId = "projects" | "resume" | "ask" | "music" | "photos";

const OBJECT_ORDER: DeskObjectId[] = [
  "projects",
  "resume",
  "ask",
  "music",
  "photos",
];

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

/** Cover kind → the token the project card's colour bar is painted with. */
const COVER_BAR: Record<NonNullable<ProjectPresentation["coverKind"]>, string> =
  {
    conductor: "var(--accent)",
    engram: "color-mix(in srgb, var(--accent) 42%, var(--material-wood))",
    figbrain: "var(--material-wood)",
    generic: "var(--muted-foreground)",
  };

/** Rest + hover geometry per card in the project stack, back to front. */
const PROJECT_CARD_CLASS = [
  "top-0 z-[1] rotate-[-3deg] group-hover:-translate-x-[13%] group-hover:-translate-y-1.5 group-hover:rotate-[-10deg] group-focus-visible:-translate-x-[13%] group-focus-visible:-translate-y-1.5 group-focus-visible:rotate-[-10deg] motion-reduce:group-hover:translate-x-0 motion-reduce:group-hover:translate-y-0 motion-reduce:group-hover:rotate-[-3deg]",
  "top-[18px] z-[2] rotate-[1deg]",
  "top-[36px] z-[3] rotate-[4deg] group-hover:translate-x-[13%] group-hover:translate-y-1.5 group-hover:rotate-[11deg] group-focus-visible:translate-x-[13%] group-focus-visible:translate-y-1.5 group-focus-visible:rotate-[11deg] motion-reduce:group-hover:translate-x-0 motion-reduce:group-hover:translate-y-0 motion-reduce:group-hover:rotate-[4deg]",
];

const AVATAR_DEPTH = 0.4;
const WAVE_MS = 900;
const WAVE_LINE = "Hi! Ask me anything.";
/** Typewriter: per character, plus the head start that lets `.reveal` finish. */
const TYPE_MS = 35;
const TYPE_START_MS = 380;
const CYCLE_MS = 12000;

const linkClass =
  "group relative flex min-h-11 w-full flex-col items-start gap-1.5 rounded-[10px] p-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

/** Object labels share the hero eyebrow's type system. */
const labelClass =
  "font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground";

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

/** Parallax offset for one object. Called a fixed number of times, in order. */
function useParallax(
  springX: MotionValue<number>,
  springY: MotionValue<number>,
  depth: number,
) {
  const x = useTransform(springX, [-1, 1], [-6 * depth, 6 * depth]);
  const y = useTransform(springY, [-1, 1], [-6 * depth, 6 * depth]);
  return { x, y };
}

/**
 * The Ask terminal, typed out. Characters fade in on a CSS delay ramp, so the
 * server renders the whole question (no hydration gap, no blank flash) and the
 * animation runs before React is even on the page. Reduced motion drops both
 * the ramp and the cycling; hovering or focusing the object pauses the cycle.
 */
function TerminalVisual({ questions }: { questions: ReadonlyArray<string> }) {
  const reducedMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (reducedMotion || questions.length < 2) return;
    const timer = window.setInterval(() => {
      const link = rootRef.current?.closest("a");
      if (link?.matches(":hover, :focus-visible, :focus-within")) return;
      setIndex((current) => (current + 1) % questions.length);
    }, CYCLE_MS);
    return () => window.clearInterval(timer);
  }, [reducedMotion, questions.length]);

  const question = questions[index] ?? questions[0] ?? "";
  const chars = Array.from(question);

  return (
    <div
      ref={rootRef}
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
        <span className="ml-auto font-mono text-[9px] text-white/40">
          simon — ask
        </span>
      </div>
      <p className="px-2.5 py-2 font-mono">
        <span className="text-[#7ee787]">$</span> ask{" "}
        <span className="text-[#a5d6ff]">
          &quot;
          <span key={index}>
            {chars.map((char, position) => (
              <span
                key={`${index}-${position}`}
                className={styles.typedChar}
                style={{
                  animationDelay: `${TYPE_START_MS + position * TYPE_MS}ms`,
                }}
              >
                {char}
              </span>
            ))}
          </span>
          &quot;
        </span>
        <span
          key={`caret-${index}`}
          className={cn(styles.typedChar, styles.caret)}
          style={{
            animationDelay: `${TYPE_START_MS + chars.length * TYPE_MS}ms`,
          }}
        />
      </p>
    </div>
  );
}

/** The record: sleeve art with the disc peeking out, spinning on hover. */
function RecordVisual({ record }: { record?: DeskRecord | null }) {
  return (
    <div className="relative aspect-square w-full" aria-hidden="true">
      <div
        className={cn(
          styles.discHolder,
          "absolute inset-[5%] -translate-y-[12%] transition-transform duration-300 ease-out group-hover:-translate-y-[22%] group-focus-visible:-translate-y-[22%] motion-reduce:group-hover:-translate-y-[12%] motion-reduce:group-focus-visible:-translate-y-[12%] md:-translate-y-[36%] md:group-hover:-translate-y-[54%] md:group-focus-visible:-translate-y-[54%] md:motion-reduce:group-hover:-translate-y-[36%] md:motion-reduce:group-focus-visible:-translate-y-[36%]",
        )}
      >
        <span
          className={styles.disc}
          style={
            record?.glow
              ? ({ "--disc-glow": record.glow } as CSSProperties)
              : undefined
          }
        />
      </div>
      <div
        className={cn(
          "absolute inset-0 overflow-hidden rounded-[6px] border border-black/10",
          SHADOW_REST,
          SHADOW_HOVER,
        )}
      >
        <SleeveImage
          id={record?.id ?? "desk-record"}
          artwork={record?.artwork}
          sizes="96px"
        />
        <span className="absolute inset-y-0 left-0 w-[8%] bg-black/20" />
      </div>
    </div>
  );
}

/** A fanned stack of the featured projects, each card naming its project. */
function ProjectsVisual({ projects }: { projects: ReadonlyArray<DeskProject> }) {
  return (
    <div className="relative h-20 w-full" aria-hidden="true">
      {projects.slice(0, 3).map((project, position) => (
        <div
          key={project.slug}
          className={cn(
            "absolute inset-x-0 h-11 rounded-[8px] border border-border bg-material-paper transition-transform duration-200",
            PROJECT_CARD_CLASS[position],
            SHADOW_REST,
            SHADOW_HOVER,
          )}
        >
          <span className="flex items-center gap-1.5 px-2 pt-[5px]">
            <span
              className="h-2.5 w-[3px] shrink-0 rounded-full"
              style={{
                background:
                  COVER_BAR[project.coverKind ?? "generic"] ?? COVER_BAR.generic,
              }}
            />
            <span
              className={cn(
                styles.paperInk,
                "truncate font-mono text-[9px] uppercase tracking-[0.14em]",
              )}
            >
              {project.shortTitle}
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}

/** Object visuals — decorative markup only; the real link + label carry semantics. */
function ObjectVisual({
  id,
  terminalQuestions,
  record,
  projects,
}: {
  id: DeskObjectId;
  terminalQuestions: ReadonlyArray<string>;
  record?: DeskRecord | null;
  projects: ReadonlyArray<DeskProject>;
}) {
  switch (id) {
    case "projects":
      return <ProjectsVisual projects={projects} />;
    case "resume":
      return (
        <div
          className={cn(
            "relative h-24 w-full rotate-[3deg] rounded-[10px] border border-border bg-material-paper p-2.5 transition-transform duration-200 group-hover:-translate-y-1.5 group-hover:rotate-[1deg] group-focus-visible:-translate-y-1.5 group-focus-visible:rotate-[1deg] motion-reduce:group-hover:translate-y-0 motion-reduce:group-hover:rotate-[3deg]",
            SHADOW_REST,
            SHADOW_HOVER,
          )}
          aria-hidden="true"
        >
          <div className="h-1.5 w-1/2 rounded bg-accent/70" />
          <div className="mt-2.5 h-1.5 w-4/5 rounded bg-black/15" />
          <div className="mt-2 h-1.5 w-3/5 rounded bg-black/15" />
          <div className="mt-2 h-1.5 w-full rounded bg-black/15" />
          <div className="mt-2 h-1.5 w-2/3 rounded bg-black/15" />
        </div>
      );
    case "ask":
      return <TerminalVisual questions={terminalQuestions} />;
    case "music":
      return <RecordVisual record={record} />;
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
 * objects. Only sections marked `visible` in site-sections.ts render, so an
 * empty Photos route stays off the desk until it has content.
 * The avatar "talks" (tap it for real fun facts; type "hi" anywhere — or squeeze
 * the rubber duck — and the desk waves back), the terminal is the Ask entry, the
 * record is one sleeve out of the music crate, and the sticky note carries
 * live data when there is some.
 */
export function CollectionDesk({
  avatarSrc,
  askQuestion,
  lines = [],
  terminalQuestion,
  terminalQuestions,
  note = null,
  record = null,
  projects = [],
}: CollectionDeskProps) {
  const reducedMotion = useReducedMotion();
  const visibleIds = new Set(visibleSections().map((section) => section.id));
  const objects = OBJECT_ORDER.filter((id) => visibleIds.has(id));

  const questions = [
    terminalQuestion,
    ...(terminalQuestions ?? []).filter((item) => item !== terminalQuestion),
  ].filter(Boolean);

  const [bubble, setBubble] = useState(askQuestion);
  const [waving, setWaving] = useState(false);
  const [squashing, setSquashing] = useState(false);
  const [squeaking, setSqueaking] = useState(false);
  const lineIndex = useRef(-1);
  const waveTimer = useRef<number | null>(null);

  const sayNextLine = useCallback(() => {
    setSquashing(true);
    if (lines.length === 0) return;
    lineIndex.current = (lineIndex.current + 1) % lines.length;
    setBubble(lines[lineIndex.current]);
  }, [lines]);

  const sayHi = useCallback(() => {
    setSqueaking(true);
    window.dispatchEvent(new CustomEvent(WAVE_EVENT));
  }, []);

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

  // Fixed call order — one per object, then the avatar and the decor layer.
  const projectsOffset = useParallax(springX, springY, OBJECT_DEPTH.projects);
  const resumeOffset = useParallax(springX, springY, OBJECT_DEPTH.resume);
  const askOffset = useParallax(springX, springY, OBJECT_DEPTH.ask);
  const musicOffset = useParallax(springX, springY, OBJECT_DEPTH.music);
  const photosOffset = useParallax(springX, springY, OBJECT_DEPTH.photos);
  const avatarOffset = useParallax(springX, springY, AVATAR_DEPTH);
  const decorOffset = useParallax(springX, springY, 0.5);

  const objectTranslate: Record<DeskObjectId, typeof projectsOffset> = {
    projects: projectsOffset,
    resume: resumeOffset,
    ask: askOffset,
    music: musicOffset,
    photos: photosOffset,
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!canTilt()) return;
    const desk = event.currentTarget;
    const rect = desk.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width;
    const py = (event.clientY - rect.top) / rect.height;
    mx.set(px * 2 - 1);
    my.set(py * 2 - 1);
    desk.style.setProperty("--desk-lx", `${(px * 100).toFixed(2)}%`);
    desk.style.setProperty("--desk-ly", `${(py * 100).toFixed(2)}%`);
    desk.style.setProperty("--desk-light", "1");
  };

  const handlePointerLeave = (event: ReactPointerEvent<HTMLDivElement>) => {
    mx.set(0);
    my.set(0);
    event.currentTarget.style.setProperty("--desk-light", "0");
  };

  const decorStyle = reducedMotion ? undefined : decorOffset;

  return (
    <div className={styles.scene}>
      <motion.div
        className={cn(
          styles.desk,
          "rounded-[26px] border border-border bg-surface",
        )}
        style={
          reducedMotion
            ? undefined
            : { rotateX: deskRotateX, rotateY: deskRotateY }
        }
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
      >
        {/* Avatar (talks) */}
        <div className={cn(styles.decor, styles.avatarSlot, "reveal")}>
          <motion.div style={reducedMotion ? undefined : avatarOffset}>
            <button
              type="button"
              onClick={sayNextLine}
              aria-label={
                lines.length ? "Tap for a fun fact about Simon" : "Simon's avatar"
              }
              title={lines.length ? "Tap for a fun fact" : undefined}
              className={cn(
                styles.avatarCard,
                "block rounded-[10px] bg-material-paper p-1.5 transition-transform duration-200 hover:-translate-y-1 hover:rotate-[-2deg] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:hover:translate-y-0 motion-reduce:hover:rotate-0",
                waving && "wave",
              )}
            >
              <span
                className={cn("block", squashing && styles.squash)}
                onAnimationEnd={() => setSquashing(false)}
              >
                <Image
                  src={avatarSrc}
                  alt=""
                  width={128}
                  height={128}
                  priority
                  className="h-28 w-28 rounded-[6px] object-cover"
                />
              </span>
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
              <AnimatePresence mode="wait" initial={false}>
                <motion.p
                  key={bubble}
                  className="line-clamp-5"
                  initial={reducedMotion ? false : { opacity: 0, scale: 0.94 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={
                    reducedMotion ? { opacity: 1 } : { opacity: 0, scale: 0.98 }
                  }
                  transition={{
                    duration: reducedMotion ? 0 : 0.18,
                    ease: "easeOut",
                  }}
                >
                  {bubble}
                </motion.p>
              </AnimatePresence>
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
                <p
                  className={cn(
                    styles.note,
                    "whitespace-pre-line rounded-[6px] px-3 py-2.5 font-mono text-[10px] leading-snug",
                  )}
                >
                  {note.text}
                </p>
              )}
            </motion.div>
          </div>
        ) : null}

        {/* Rubber duck — the visible way into the "hi" wave. */}
        <div
          className={cn(styles.decor, styles.duckSlot, "reveal")}
          style={{ animationDelay: "240ms" }}
        >
          <motion.div style={decorStyle}>
            <button
              type="button"
              onClick={sayHi}
              aria-label="Say hi"
              title="Say hi"
              className={cn(
                styles.duckButton,
                "flex min-h-11 min-w-11 items-center justify-center rounded-[12px] p-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              )}
            >
              {/* Colours come from --duck-* on .duckButton, so no hex lives here. */}
              <span className={styles.duck} aria-hidden="true">
                <svg
                  viewBox="0 0 66 56"
                  className={cn(styles.duckArt, squeaking && styles.squeak)}
                  onAnimationEnd={() => setSqueaking(false)}
                  aria-hidden="true"
                  focusable="false"
                >
                  <path d="M11 33 L1 19 L16 26 Z" fill="var(--duck-body)" />
                  <ellipse cx="26" cy="38" rx="20" ry="13" fill="var(--duck-body)" />
                  <ellipse cx="38" cy="30" rx="10" ry="9" fill="var(--duck-body)" />
                  <circle cx="45" cy="18" r="11" fill="var(--duck-body)" />
                  <path
                    d="M19 34 C27 30.5 36 32.5 38.5 38 C34 44 24 44.5 19 40 Z"
                    fill="var(--duck-wing)"
                  />
                  <path
                    d="M52 14 C60 14 65 16.4 65 19.5 C65 22.6 60 25 52 25 Z"
                    fill="var(--duck-bill)"
                  />
                  <circle cx="46" cy="14.5" r="2.2" fill="var(--duck-eye)" />
                </svg>
              </span>
            </button>
          </motion.div>
        </div>

        {objects.map((id, index) => {
          const meta = OBJECT_META[id];
          const translate = objectTranslate[id];
          const recordLine =
            id === "music" && record
              ? `${record.title} · ${record.artist}`
              : undefined;

          return (
            <div
              key={id}
              className={cn(styles.slot, OBJECT_SLOT_CLASS[id], "reveal")}
              style={{ animationDelay: `${(index + 1) * 40}ms` }}
            >
              <motion.div style={reducedMotion ? undefined : translate}>
                <Link
                  href={meta.href}
                  title={recordLine}
                  className={cn(linkClass, waving && "wave")}
                  style={
                    waving
                      ? { ["--wave-delay" as string]: `${index * 90}ms` }
                      : undefined
                  }
                >
                  <ObjectVisual
                    id={id}
                    terminalQuestions={questions}
                    record={record}
                    projects={projects}
                  />
                  <span className={labelClass}>{meta.label}</span>
                  {recordLine ? (
                    <span className="sr-only">
                      A record from the crate: {recordLine}
                    </span>
                  ) : null}
                </Link>
              </motion.div>
            </div>
          );
        })}
      </motion.div>
    </div>
  );
}
