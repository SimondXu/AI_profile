export type SiteSectionId =
  "home" | "projects" | "resume" | "ask" | "music" | "photos";

export interface SiteSection {
  id: SiteSectionId;
  label: string;
  href: string;
  visible: boolean;
}

/**
 * Single source of truth for site navigation. Flip `visible` to expose a
 * section once it has real content; hidden sections keep their routes.
 */
export const siteSections: ReadonlyArray<SiteSection> = [
  { id: "home", label: "Home", href: "/", visible: true },
  { id: "projects", label: "Projects", href: "/projects", visible: true },
  { id: "resume", label: "Resume", href: "/resume", visible: true },
  { id: "ask", label: "Ask", href: "/chat", visible: true },
  { id: "music", label: "Music", href: "/music", visible: false },
  { id: "photos", label: "Photos", href: "/photos", visible: false },
];

export function visibleSections(): ReadonlyArray<SiteSection> {
  return siteSections.filter((section) => section.visible);
}
