/**
 * Display-only overrides keyed by project slug. Facts (title, summary,
 * metrics, links) stay in portfolio-config.json and are never copied here.
 */
export type ProjectPresentation = {
  shortTitle?: string;
  coverKind?: "conductor" | "engram" | "figbrain" | "generic";
};

export const projectPresentationBySlug: Readonly<
  Record<string, ProjectPresentation>
> = {
  "proxy-loop": { shortTitle: "Proxy Loop" },
  conductor: { shortTitle: "Conductor", coverKind: "conductor" },
  engram: { shortTitle: "Engram", coverKind: "engram" },
  figbrain: { shortTitle: "FigBrain", coverKind: "figbrain" },
};
