import type { Experience } from "@/types/portfolio";
import { Reveal } from "./reveal";

interface ExperienceTimelineProps {
  entries: Experience[];
}

const MAX_HIGHLIGHTS = 3;

export function ExperienceTimeline({ entries }: ExperienceTimelineProps) {
  return (
    <div className="mt-8 flex flex-col">
      {entries.map((role, index) => (
        <Reveal key={`${role.company}-${role.position}`} delay={Math.min(index * 40, 200)}>
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

            <div className="flex flex-col gap-2 lg:border-l lg:border-border lg:pl-8">
              <h3 className="text-[18px] font-semibold text-foreground">
                {role.position} · {role.company}
              </h3>
              <p className="max-w-prose text-[16px] leading-[1.6] text-foreground">
                {role.description}
              </p>
              {role.highlights?.length ? (
                <ul className="mt-1 list-inside list-disc space-y-1 max-w-prose text-[16px] leading-[1.6] text-muted-foreground">
                  {role.highlights.slice(0, MAX_HIGHLIGHTS).map((highlight) => (
                    <li key={highlight}>{highlight}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          </article>
        </Reveal>
      ))}
    </div>
  );
}
