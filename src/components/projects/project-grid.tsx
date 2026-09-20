import type { Project } from "@/types/portfolio";
import { ProjectCard } from "./project-card";

interface ProjectGridProps {
  projects: Project[];
}

/**
 * Bento grid: 1 column on mobile, 2 from sm, 3 from lg. Featured cards get
 * `lg:col-span-2` (set inside ProjectCard) so they read as the highlighted
 * work once there is room for it. `grid-auto-flow: dense` lets later 1-col
 * cards back-fill the cell beside each featured card instead of leaving a
 * blank third column; DOM (and tab) order is unchanged.
 */
export function ProjectGrid({ projects }: ProjectGridProps) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:[grid-auto-flow:dense]">
      {projects.map((project) => (
        <ProjectCard key={project.slug} project={project} />
      ))}
    </div>
  );
}
