"use client";

import { useId, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { Project } from "@/types/portfolio";

interface ProjectDisclosureProps {
  project: Project;
}

/**
 * Inline expand/collapse for non-featured project cards (they have no
 * dedicated detail page). Content is only mounted while `open`, so the
 * collapsed state can never leave a focusable link or button behind.
 */
export function ProjectDisclosure({ project }: ProjectDisclosureProps) {
  const [open, setOpen] = useState(false);
  const contentId = useId();
  const prefersReducedMotion = useReducedMotion();

  const body = (
    <div className="space-y-4 pt-3 text-sm leading-6 text-muted-foreground">
      <p>{project.description}</p>

      {project.achievements?.length ? (
        <div>
          <h3 className="font-mono text-xs uppercase tracking-wide text-foreground">
            Achievements
          </h3>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {project.achievements.map((achievement) => (
              <li key={achievement}>{achievement}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {project.metrics?.length ? (
        <div>
          <h3 className="font-mono text-xs uppercase tracking-wide text-foreground">
            Metrics
          </h3>
          <ul className="mt-2 space-y-1">
            {project.metrics.map((metric) => (
              <li key={metric}>{metric}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {project.links?.length ? (
        <div className="flex flex-wrap gap-3">
          {project.links.map((link) => (
            <a
              key={link.url}
              href={link.url}
              target="_blank"
              rel="noreferrer"
              className="text-accent underline-offset-4 hover:underline"
            >
              {link.name} ↗
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );

  return (
    <div className="border-t border-border pt-3">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={contentId}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex min-h-11 items-center text-sm font-medium text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        {open ? "Show less ↑" : "Show more ↓"}
      </button>

      <AnimatePresence initial={false}>
        {open ? (
          prefersReducedMotion ? (
            <div id={contentId}>{body}</div>
          ) : (
            <motion.div
              id={contentId}
              key="content"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              {body}
            </motion.div>
          )
        ) : null}
      </AnimatePresence>
    </div>
  );
}
