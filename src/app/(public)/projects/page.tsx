import type { Metadata } from "next";
import { ProjectFilter, type ProjectTrackFilter } from "@/components/projects/project-filter";
import { ProjectGrid } from "@/components/projects/project-grid";
import { getConfig } from "@/lib/config-loader";

export const metadata: Metadata = {
  title: "Projects",
  description:
    "Software projects spanning AI and ML systems, full-stack products, distributed runtimes, data systems, and mobile applications.",
  alternates: {
    canonical: "/projects",
  },
};

interface ProjectsPageProps {
  searchParams: Promise<{ track?: string | string[] }>;
}

export default async function ProjectsPage({ searchParams }: ProjectsPageProps) {
  const { track: requestedTrack } = await searchParams;
  const activeTrack: ProjectTrackFilter =
    requestedTrack === "ai-ml" || requestedTrack === "full-stack"
      ? requestedTrack
      : "all";

  const projects = getConfig().projects;
  const aiCount = projects.filter((project) => project.track === "ai-ml").length;
  const fullStackCount = projects.filter(
    (project) => project.track === "full-stack",
  ).length;
  const visibleProjects =
    activeTrack === "all"
      ? projects
      : projects.filter((project) => project.track === activeTrack);

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8">
      <header className="flex flex-col gap-4">
        <h1 className="font-display text-4xl font-semibold tracking-tight text-foreground">
          Projects
        </h1>
        <p className="max-w-2xl text-base leading-7 text-muted-foreground">
          A complete project archive spanning distributed AI systems, developer
          tools, data-intensive applications, and full-stack products.
        </p>
      </header>

      <div className="mt-8">
        <ProjectFilter
          active={activeTrack}
          counts={{
            all: projects.length,
            "ai-ml": aiCount,
            "full-stack": fullStackCount,
          }}
        />
      </div>

      <div className="mt-8">
        <ProjectGrid projects={visibleProjects} />
      </div>
    </div>
  );
}
