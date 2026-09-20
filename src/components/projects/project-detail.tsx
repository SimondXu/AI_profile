import Link from "next/link";
import type { Project } from "@/types/portfolio";
import { projectPresentationBySlug } from "@/content/project-presentation";
import { ProjectCover } from "./covers/project-cover";

interface ProjectDetailProps {
  project: Project;
  backHref: string;
}

/**
 * `/projects/[slug]` layout, in the order fixed by the design spec: back
 * link, title/summary, cover, description, achievements, metrics, a mono
 * meta row, then real external links only (no disabled placeholder CTAs).
 */
export function ProjectDetail({ project, backHref }: ProjectDetailProps) {
  const presentation = projectPresentationBySlug[project.slug];
  const displayTitle = presentation?.shortTitle ?? project.title;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-5 py-16 sm:px-8">
      <Link
        href={backHref}
        className="inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        ← Projects
      </Link>

      <div className="flex flex-col gap-3">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
          {project.title}
        </h1>
        <p className="text-base leading-7 text-muted-foreground">{project.summary}</p>
      </div>

      <figure className="flex flex-col gap-2">
        <div className="aspect-[3/2] w-full overflow-hidden rounded-[18px] border border-border">
          <ProjectCover
            slug={project.slug}
            title={displayTitle}
            className="h-full w-full"
          />
        </div>
        <figcaption className="text-xs text-muted-foreground">Concept artwork</figcaption>
      </figure>

      <p className="text-base leading-7 text-foreground">{project.description}</p>

      {project.achievements?.length ? (
        <div>
          <h2 className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
            Achievements
          </h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-foreground">
            {project.achievements.map((achievement) => (
              <li key={achievement}>{achievement}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {project.metrics?.length ? (
        <div>
          <h2 className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
            Metrics
          </h2>
          <ul className="mt-2 space-y-1 text-sm leading-6 text-foreground">
            {project.metrics.map((metric) => (
              <li key={metric}>{metric}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <dl className="flex flex-wrap gap-x-6 gap-y-2 border-t border-border pt-4 font-mono text-xs text-muted-foreground">
        <div className="flex gap-2">
          <dt className="font-medium text-foreground">Stack</dt>
          <dd>{project.techStack.join(", ")}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="font-medium text-foreground">Date</dt>
          <dd>{project.date}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="font-medium text-foreground">Status</dt>
          <dd>{project.status}</dd>
        </div>
      </dl>

      {project.links?.length ? (
        <div className="flex flex-wrap gap-4">
          {project.links.map((link) => (
            <a
              key={link.url}
              href={link.url}
              target="_blank"
              rel="noreferrer"
              className="text-sm font-medium text-accent underline-offset-4 hover:underline"
            >
              {link.name} ↗
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );
}
