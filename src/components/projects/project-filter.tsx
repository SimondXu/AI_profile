import Link from "next/link";
import type { Project } from "@/types/portfolio";
import { cn } from "@/lib/utils";

export type ProjectTrackFilter = Project["track"] | "all";

interface ProjectFilterProps {
  active: ProjectTrackFilter;
  counts: Record<ProjectTrackFilter, number>;
}

const FILTERS: ReadonlyArray<{
  value: ProjectTrackFilter;
  label: string;
  href: string;
}> = [
  { value: "all", label: "All", href: "/projects" },
  { value: "ai-ml", label: "AI & ML", href: "/projects?track=ai-ml" },
  { value: "full-stack", label: "Full-stack", href: "/projects?track=full-stack" },
];

/**
 * Server component: the URL (`?track=`) is the only source of truth for the
 * active filter, so switching tabs is a normal navigation — no client state,
 * and back/forward and refresh all stay consistent.
 */
export function ProjectFilter({ active, counts }: ProjectFilterProps) {
  return (
    <nav
      aria-label="Filter projects"
      className="inline-flex rounded-[10px] border border-border bg-surface p-1"
    >
      {FILTERS.map((filter) => {
        const isActive = filter.value === active;

        return (
          <Link
            key={filter.value}
            href={filter.href}
            scroll={false}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "inline-flex min-h-9 items-center gap-2 rounded-[8px] px-3 py-1.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              isActive
                ? "bg-accent-soft font-medium text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {filter.label}
            <span className="text-xs text-muted-foreground">{counts[filter.value]}</span>
          </Link>
        );
      })}
    </nav>
  );
}
