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
import type { PointerEvent as ReactPointerEvent } from "react";
import { visibleSections } from "@/content/site-sections";
import { cn } from "@/lib/utils";
import styles from "./collection-desk.module.css";

interface CollectionDeskProps {
  avatarSrc: string;
  askQuestion: string;
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

const AVATAR_DEPTH = 0.4;

const linkClass =
  "group relative flex min-h-11 w-full flex-col items-start gap-2 rounded-[10px] p-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

function canTilt(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  return fine && !reduced;
}

/** Object visuals — decorative markup only; the real link + label carry semantics. */
function ObjectVisual({ id, askQuestion }: { id: DeskObjectId; askQuestion: string }) {
  switch (id) {
    case "projects":
      return (
        <div className="relative h-20 w-full" aria-hidden="true">
          <div className="absolute inset-x-2 top-3 h-14 rounded-[10px] border border-border bg-material-paper transition-transform duration-200 group-hover:-translate-x-2 group-hover:-translate-y-1 group-hover:rotate-[-4deg] group-focus-visible:-translate-x-2 group-focus-visible:-translate-y-1 group-focus-visible:rotate-[-4deg]" />
          <div className="absolute inset-x-1 top-1.5 h-14 rounded-[10px] border border-border bg-material-paper transition-transform duration-200 group-hover:translate-y-0 group-focus-visible:translate-y-0" />
          <div className="absolute inset-x-0 top-0 h-14 rounded-[10px] border border-border bg-material-paper transition-transform duration-200 group-hover:translate-x-2 group-hover:-translate-y-1 group-hover:rotate-[4deg] group-focus-visible:translate-x-2 group-focus-visible:-translate-y-1 group-focus-visible:rotate-[4deg]" />
        </div>
      );
    case "resume":
      return (
        <div
          className="relative h-32 w-full rounded-[10px] border border-border bg-material-paper p-3 shadow-sm transition-all duration-200 group-hover:-translate-y-1.5 group-hover:shadow-md group-focus-visible:-translate-y-1.5 group-focus-visible:shadow-md"
          aria-hidden="true"
        >
          <div className="h-1.5 w-4/5 rounded bg-border" />
          <div className="mt-2.5 h-1.5 w-3/5 rounded bg-border" />
          <div className="mt-2.5 h-1.5 w-full rounded bg-border" />
          <div className="mt-2.5 h-1.5 w-2/3 rounded bg-border" />
        </div>
      );
    case "ask":
      return (
        <div
          className="relative rounded-[18px] bg-accent-soft px-3 py-2.5 text-xs text-foreground shadow-sm transition-transform duration-200 group-hover:-translate-y-1.5 group-focus-visible:-translate-y-1.5"
          aria-hidden="true"
        >
          <p className="line-clamp-2">{askQuestion}</p>
        </div>
      );
    case "music":
      return (
        <div
          className="relative h-20 w-full overflow-hidden rounded-[10px] bg-material-wood"
          aria-hidden="true"
        >
          <div className="absolute left-1/2 top-1/2 h-16 w-16 -ml-8 -mt-8 rounded-full bg-material-vinyl transition-transform duration-200 group-hover:translate-x-3 group-focus-visible:translate-x-3" />
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

const OBJECT_META: Record<DeskObjectId, { label: string; href: string }> = {
  projects: { label: "Projects", href: "/projects" },
  resume: { label: "Resume", href: "/resume" },
  ask: { label: "Ask", href: "/chat" },
  music: { label: "Music", href: "/music" },
  photos: { label: "Photos", href: "/photos" },
};

/**
 * Right-column desk: avatar plus real navigation links styled as tactile
 * objects. Only sections marked `visible` in site-sections.ts render, so
 * empty Music/Photos routes stay off the desk until they have content.
 */
export function CollectionDesk({ avatarSrc, askQuestion }: CollectionDeskProps) {
  const reducedMotion = useReducedMotion();
  const visibleIds = new Set(visibleSections().map((section) => section.id));
  const objects = OBJECT_ORDER.filter((id) => visibleIds.has(id));

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
    const nx = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const ny = ((event.clientY - rect.top) / rect.height) * 2 - 1;
    mx.set(nx);
    my.set(ny);
  };

  const handlePointerLeave = () => {
    mx.set(0);
    my.set(0);
  };

  return (
    <div className={styles.scene}>
      <motion.div
        className={cn(styles.desk, "rounded-[26px] border border-border bg-surface")}
        style={
          reducedMotion
            ? undefined
            : { rotateX: deskRotateX, rotateY: deskRotateY }
        }
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
      >
        <motion.div
          className={styles.avatarSlot}
          initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reducedMotion ? 0.2 : 0.32, ease: "easeOut" }}
        >
          <motion.div style={reducedMotion ? undefined : { x: avatarX, y: avatarY }}>
            <Image
              src={avatarSrc}
              alt=""
              width={112}
              height={112}
              className="h-28 w-28 rounded-full border border-border object-cover"
            />
          </motion.div>
        </motion.div>

        {objects.map((id, index) => {
          const meta = OBJECT_META[id];
          const translate = objectTranslate[id];
          const delayMs = (index + 1) * 40;

          return (
            <motion.div
              key={id}
              className={cn(styles.slot, OBJECT_SLOT_CLASS[id])}
              initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: reducedMotion ? 0.2 : 0.34,
                delay: delayMs / 1000,
                ease: "easeOut",
              }}
            >
              <motion.div style={reducedMotion ? undefined : { x: translate.x, y: translate.y }}>
                <Link href={meta.href} className={linkClass}>
                  <ObjectVisual id={id} askQuestion={askQuestion} />
                  <span className="text-sm font-medium text-foreground">
                    {meta.label}
                  </span>
                </Link>
              </motion.div>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
