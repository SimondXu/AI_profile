import type { ComponentType } from "react";
import { projectPresentationBySlug } from "@/content/project-presentation";
import { ConductorCover } from "./conductor-cover";
import { EngramCover } from "./engram-cover";
import { FigBrainCover } from "./figbrain-cover";
import { GenericCover } from "./generic-cover";

export type CoverKind = "conductor" | "engram" | "figbrain" | "generic";

export interface ProjectCoverProps {
  slug: string;
  kind?: CoverKind;
  title: string;
  className?: string;
}

const coverBySlugKind: Record<CoverKind, ComponentType<{ slug: string }>> = {
  conductor: ConductorCover,
  engram: EngramCover,
  figbrain: FigBrainCover,
  generic: GenericCover,
};

/**
 * Renders a project's concept-artwork cover as an inline, theme-aware SVG.
 * Server-safe (no hooks) so it can render directly in the projects list and
 * detail server components. Colors are CSS variables only, so light/dark and
 * any future palette change apply automatically without a rebuild.
 */
export function ProjectCover({ slug, kind, title, className }: ProjectCoverProps) {
  const resolvedKind = kind ?? projectPresentationBySlug[slug]?.coverKind ?? "generic";
  const Cover = coverBySlugKind[resolvedKind];

  return (
    <svg
      role="img"
      aria-label={`Concept artwork for ${title}`}
      viewBox="0 0 600 400"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width={600} height={400} fill="var(--surface)" />
      <Cover slug={slug} />
    </svg>
  );
}
