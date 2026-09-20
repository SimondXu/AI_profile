import type { PortfolioConfig, Skills } from "@/types/portfolio";
import { Reveal } from "./reveal";

interface AboutSectionProps {
  config: PortfolioConfig;
}

/** Human-readable labels for the fixed top-level skill categories. */
const SKILL_CATEGORY_LABELS: Record<keyof Skills, string> = {
  programming: "Programming",
  ml_ai: "AI / ML",
  web_development: "Web Development",
  databases: "Databases",
  devops_cloud: "DevOps",
  big_data: "Big Data",
  soft_skills: "Soft Skills",
};

const FOCUS_CATEGORY_LIMIT = 4;

function focusAreas(skills: Skills): string[] {
  return (Object.keys(skills) as Array<keyof Skills>)
    .slice(0, FOCUS_CATEGORY_LIMIT)
    .map((key) => SKILL_CATEGORY_LABELS[key])
    .filter((label): label is string => Boolean(label));
}

export function AboutSection({ config }: AboutSectionProps) {
  const bioParagraphs = config.personal.bio
    .split("\n\n")
    .filter((paragraph) => paragraph.trim().length > 0);

  const educationLine = config.education?.current
    ? `${config.education.current.degree}, ${config.education.current.institution} · ${config.education.current.graduationDate}`
    : null;
  const location = config.personal.location?.current || null;
  const openTo = config.entryLevel?.availability
    ? config.entryLevel.availability +
      (config.personal.location?.relocation ? " · Open to relocation" : "")
    : null;
  const focus = focusAreas(config.skills);

  const facts: Array<{ label: string; value: string }> = [
    ...(educationLine ? [{ label: "Education", value: educationLine }] : []),
    ...(location ? [{ label: "Location", value: location }] : []),
    ...(openTo ? [{ label: "Open to", value: openTo }] : []),
    ...(focus.length ? [{ label: "Focus", value: focus.join(", ") }] : []),
  ];

  return (
    <section
      id="about"
      className="scroll-mt-20 border-y border-border bg-surface"
      aria-labelledby="about-title"
    >
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-5 py-16 sm:px-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-16 lg:py-24">
        <div className="flex flex-col gap-4">
          <Reveal>
            <h2
              id="about-title"
              className="font-display text-[32px] font-semibold leading-[1.15] tracking-tight text-foreground"
            >
              About
            </h2>
          </Reveal>
          <div className="flex max-w-prose flex-col gap-4">
            {bioParagraphs.map((paragraph, index) => (
              <Reveal key={paragraph} delay={Math.min(index * 40, 80)}>
                <p className="text-[17px] leading-[1.7] text-foreground">
                  {paragraph}
                </p>
              </Reveal>
            ))}
          </div>
        </div>

        {facts.length ? (
          <Reveal delay={80}>
            <dl className="flex flex-col gap-4">
              {facts.map((fact) => (
                <div key={fact.label} className="flex flex-col gap-1">
                  <dt className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    {fact.label}
                  </dt>
                  <dd className="text-sm text-foreground">{fact.value}</dd>
                </div>
              ))}
            </dl>
          </Reveal>
        ) : null}
      </div>
    </section>
  );
}
