import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getConfig } from "@/lib/config-loader";
import { projectPresentationBySlug } from "@/content/project-presentation";
import { ProjectDetail } from "@/components/projects/project-detail";
import type { Project } from "@/types/portfolio";

// Detail pages only exist for featured projects; everything else expands
// inline on /projects. Any other slug — known but non-featured, or unknown —
// 404s because dynamicParams is false.
export const dynamicParams = false;

function getFeaturedProjects(): Project[] {
  return getConfig().projects.filter((project) => project.featured);
}

function getFeaturedProjectBySlug(slug: string): Project | undefined {
  return getFeaturedProjects().find((project) => project.slug === slug);
}

export function generateStaticParams() {
  return getFeaturedProjects().map((project) => ({ slug: project.slug }));
}

interface ProjectDetailPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ track?: string | string[] }>;
}

export async function generateMetadata({
  params,
}: ProjectDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const project = getFeaturedProjectBySlug(slug);

  if (!project) {
    return {};
  }

  const displayTitle = projectPresentationBySlug[project.slug]?.shortTitle ?? project.title;

  return {
    title: displayTitle,
    description: project.summary,
    alternates: {
      canonical: `/projects/${project.slug}`,
    },
  };
}

export default async function ProjectDetailPage({
  params,
  searchParams,
}: ProjectDetailPageProps) {
  const { slug } = await params;
  const project = getFeaturedProjectBySlug(slug);

  if (!project) {
    notFound();
  }

  const { track } = await searchParams;
  const backHref =
    track === "ai-ml" || track === "full-stack" ? `/projects?track=${track}` : "/projects";

  return <ProjectDetail project={project} backHref={backHref} />;
}
