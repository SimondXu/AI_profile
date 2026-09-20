import type { Metadata } from "next";
import Link from "next/link";
import { ProjectIndex } from "@/components/projects/project-index";
import { getConfig } from "@/lib/config-loader";
import type { Project } from "@/types/portfolio";

export const metadata: Metadata = {
  title: "Projects",
  description:
    "Software projects spanning AI and ML systems, full-stack products, distributed runtimes, data systems, and mobile applications.",
  alternates: {
    canonical: "/projects",
  },
};

const trackMetadata: Record<
  Project["track"],
  {
    label: string;
    href: string;
  }
> = {
  "ai-ml": {
    label: "AI / ML Systems",
    href: "/projects?track=ai-ml",
  },
  "full-stack": {
    label: "Full-stack Products",
    href: "/projects?track=full-stack",
  },
};

interface ProjectFilter {
  label: string;
  value: Project["track"] | "all";
  href: string;
  count: number;
}

interface ProjectsPageProps {
  searchParams: Promise<{ track?: string | string[] }>;
}

export default async function ProjectsPage({
  searchParams,
}: ProjectsPageProps) {
  const { track: requestedTrack } = await searchParams;
  const activeTrack: Project["track"] | "all" =
    requestedTrack === "ai-ml" || requestedTrack === "full-stack"
      ? requestedTrack
      : "all";
  const projects = getConfig().projects;
  const aiProjects = projects.filter((project) => project.track === "ai-ml");
  const fullStackProjects = projects.filter(
    (project) => project.track === "full-stack",
  );
  const filters: ProjectFilter[] = [
    { label: "All", value: "all", href: "/projects", count: projects.length },
    {
      label: "AI / ML",
      href: trackMetadata["ai-ml"].href,
      value: "ai-ml",
      count: aiProjects.length,
    },
    {
      label: "Full-stack",
      href: trackMetadata["full-stack"].href,
      value: "full-stack",
      count: fullStackProjects.length,
    },
  ];

  return (
    <div className="quiet-page quiet-projects-page">
      <div className="quiet-projects-shell">
        <header className="quiet-projects-header">
          <h1>Projects</h1>
          <p>
            A complete project archive spanning distributed AI systems,
            developer tools, data-intensive applications, and full-stack
            products.
          </p>
        </header>

        <nav className="quiet-project-filters" aria-label="Filter projects">
          {filters.map((filter) => (
            <Link
              key={filter.value}
              href={filter.href}
              scroll={false}
              aria-current={filter.value === activeTrack ? "page" : undefined}
            >
              {filter.label} {filter.count}
            </Link>
          ))}
        </nav>

        <div className="quiet-project-groups">
          {activeTrack === "all" || activeTrack === "ai-ml" ? (
            <ProjectIndex
              label={trackMetadata["ai-ml"].label}
              projects={aiProjects}
              startIndex={0}
              track="ai-ml"
            />
          ) : null}
          {activeTrack === "all" || activeTrack === "full-stack" ? (
            <ProjectIndex
              label={trackMetadata["full-stack"].label}
              projects={fullStackProjects}
              startIndex={activeTrack === "all" ? aiProjects.length : 0}
              track="full-stack"
            />
          ) : null}
        </div>

        <footer className="quiet-projects-footer">
          <Link href="/#projects">Back to selected projects</Link>
        </footer>
      </div>
    </div>
  );
}
