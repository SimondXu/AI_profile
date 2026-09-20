import Link from "next/link";
import type { Project } from "@/types/portfolio";
import { projectPresentationBySlug } from "@/content/project-presentation";
import { cn } from "@/lib/utils";
import { ProjectCover } from "./covers/project-cover";
import { ProjectDisclosure } from "./project-disclosure";

const MAX_TECH_CHIPS = 4;

/**
 * Deterministic 32-bit FNV-1a hash, used to pick a colour bar for
 * non-featured cards. Kept local: `generic-cover.tsx` doesn't export its
 * copy, and covers are off-limits for this change.
 */
function hashSlug(input: string): number {
  let hash = 0x811c9dc5;

  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }

  return hash >>> 0;
}

const ACCENT_BAR_CLASSES = ["bg-accent", "bg-material-wood", "bg-material-vinyl"] as const;

function accentBarClass(slug: string): string {
  return ACCENT_BAR_CLASSES[hashSlug(slug) % ACCENT_BAR_CLASSES.length];
}

interface ProjectCardProps {
  project: Project;
}

export function ProjectCard({ project }: ProjectCardProps) {
  const presentation = projectPresentationBySlug[project.slug];
  const displayTitle = presentation?.shortTitle ?? project.title;
  const isShortened = displayTitle !== project.title;
  const visibleTech = project.techStack.slice(0, MAX_TECH_CHIPS);
  const remainingTech = project.techStack.length - visibleTech.length;
  const askHref = `/chat?q=${encodeURIComponent(`Tell me about ${project.title}`)}`;

  return (
    <article
      className={cn(
        "group flex flex-col overflow-hidden rounded-[18px] border border-border bg-surface transition-[transform,border-color] duration-200 hover:-translate-y-1 hover:border-input",
        project.featured && "h-full",
      )}
    >
      {project.featured ? (
        <div className="relative aspect-[3/2] w-full border-b border-border">
          <ProjectCover
            slug={project.slug}
            title={displayTitle}
            className="h-full w-full"
          />
          <span className="absolute bottom-2 right-3 rounded-full bg-surface/80 px-2 py-0.5 text-[12px] text-muted-foreground">
            Concept artwork
          </span>
        </div>
      ) : null}

      <div className="flex flex-1 flex-col gap-3 p-5 md:p-6">
        {!project.featured ? (
          <span
            aria-hidden="true"
            className={cn("h-1.5 w-12 rounded-full", accentBarClass(project.slug))}
          />
        ) : null}

        <p className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
          {project.category}
        </p>

        <h2
          className={cn(
            "font-display font-semibold text-foreground",
            project.featured ? "text-[22px]" : "text-lg",
          )}
          title={isShortened ? project.title : undefined}
        >
          {displayTitle}
        </h2>

        <p className="text-[15px] leading-6 text-muted-foreground">{project.summary}</p>

        <div className="flex flex-wrap gap-2">
          {visibleTech.map((tech) => (
            <span
              key={tech}
              className="rounded-full border border-border px-2.5 py-1 font-mono text-[11px] text-muted-foreground"
            >
              {tech}
            </span>
          ))}
          {remainingTech > 0 ? (
            <span className="rounded-full border border-border px-2.5 py-1 font-mono text-[11px] text-muted-foreground">
              +{remainingTech}
            </span>
          ) : null}
        </div>

        <p className="font-mono text-xs text-muted-foreground">{project.date}</p>

        <div
          className={cn(
            "mt-auto flex flex-wrap gap-6 pt-4",
            // Featured cards end here, so the rule marks the card's true
            // bottom edge. Non-featured cards continue into
            // `ProjectDisclosure`, which already opens with its own
            // `border-t` — skipping it here avoids two rules back to back.
            project.featured && "border-t border-border",
          )}
        >
          {project.featured ? (
            <Link
              href={`/projects/${project.slug}`}
              className="text-sm font-medium text-accent underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              Read more →
            </Link>
          ) : null}
          <Link
            href={askHref}
            className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            Ask about this →
          </Link>
        </div>

        {!project.featured ? <ProjectDisclosure project={project} /> : null}
      </div>
    </article>
  );
}
