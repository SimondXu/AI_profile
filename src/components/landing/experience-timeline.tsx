import { ScrollReveal } from "@/components/motion/scroll-reveal";
import type { Experience } from "@/types/portfolio";

interface ExperienceTimelineProps {
  entries: Experience[];
  /** Highlights shown per role; the resume passes Infinity to show all. */
  maxHighlights?: number;
  /** Show the technologies line under each role (resume view). */
  showTechnologies?: boolean;
}

const MAX_HIGHLIGHTS = 3;

export function ExperienceTimeline({
  entries,
  maxHighlights = MAX_HIGHLIGHTS,
  showTechnologies = false,
}: ExperienceTimelineProps) {
  return (
    <div className="mt-8 flex flex-col">
      {entries.map((role, index) => (
        <ScrollReveal key={`${role.company}-${role.position}`} delay={Math.min(index * 80, 240)}>
          <article className="grid gap-2 border-t border-border py-6 first:border-t-0 first:pt-0 lg:grid-cols-[11rem_minmax(0,1fr)] lg:gap-8">
            <p className="font-mono text-xs text-muted-foreground lg:pt-1">
              {role.duration}
              {role.location ? (
                <>
                  <br />
                  {role.location}
                </>
              ) : null}
            </p>

            <div className="relative flex flex-col gap-2 lg:border-l lg:border-border lg:pl-8 lg:before:absolute lg:before:-left-[5px] lg:before:top-2 lg:before:h-2.5 lg:before:w-2.5 lg:before:rounded-full lg:before:border-2 lg:before:border-accent lg:before:bg-background">
              <h3 className="font-display text-[19px] font-semibold text-foreground">
                {role.position} · {role.company}
              </h3>
              <p className="max-w-prose text-[16px] leading-[1.6] text-foreground">
                {role.description}
              </p>
              {role.highlights?.length ? (
                <ul className="mt-1 list-inside list-disc space-y-1 max-w-prose text-[16px] leading-[1.6] text-muted-foreground">
                  {role.highlights.slice(0, maxHighlights).map((highlight) => (
                    <li key={highlight}>{highlight}</li>
                  ))}
                </ul>
              ) : null}
              {showTechnologies && role.technologies?.length ? (
                <p className="mt-2 font-mono text-[12px] text-muted-foreground">
                  {role.technologies.join(" · ")}
                </p>
              ) : null}
            </div>
          </article>
        </ScrollReveal>
      ))}
    </div>
  );
}
