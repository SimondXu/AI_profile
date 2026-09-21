import { ScrollReveal } from "@/components/motion/scroll-reveal";
import type { PortfolioConfig } from "@/types/portfolio";
import { IdCard } from "./id-card";
import { SectionHeader } from "./section-header";

interface AboutSectionProps {
  config: PortfolioConfig;
}

/**
 * About: the bio set as a pull-quote plus a physical "ID card" made of the
 * same paper material as the desk, and a slow strip of real interests.
 * Every value comes from portfolio-config.json; missing fields are skipped.
 */
/** Everything after the first sentence — the hero already said that one. */
function afterFirstSentence(text: string): string {
  const match = text.match(/^[^.!?]*[.!?]\s*/);
  return match ? text.slice(match[0].length).trim() : "";
}

export function AboutSection({ config }: AboutSectionProps) {
  const paragraphs = config.personal.bio
    .split("\n\n")
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  // Pull-quote: the belief half of the positioning statement; fall back to the
  // first bio paragraph only if the positioning is a single sentence.
  const belief = afterFirstSentence(config.aiProfile.positioning || "");
  const lead = belief || paragraphs.shift() || "";
  const rest = paragraphs;

  const education = config.education?.current ?? null;
  const location = config.personal.location?.current || null;
  const availability = config.entryLevel?.availability || null;
  const relocation = Boolean(config.personal.location?.relocation);
  const focus = config.entryLevel?.focusAreas ?? [];
  const interests = config.personality?.interests ?? [];
  const funFacts = config.personality?.funFacts ?? [];

  return (
    <section
      id="about"
      className="mx-auto w-full max-w-6xl scroll-mt-20 px-5 py-16 sm:px-8 lg:py-24"
      aria-labelledby="about-title"
    >
      <ScrollReveal>
        <SectionHeader eyebrow="01 — About" title="About" titleId="about-title" />
      </ScrollReveal>

      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-16">
        <ScrollReveal delay={60} className="flex flex-col gap-6">
          {lead ? (
            <p className="max-w-[38ch] font-display text-[22px] font-medium leading-[1.4] tracking-tight text-foreground sm:text-[25px]">
              {lead}
            </p>
          ) : null}
          {rest.map((paragraph) => (
            <p
              key={paragraph}
              className="max-w-prose text-[17px] leading-[1.7] text-muted-foreground"
            >
              {paragraph}
            </p>
          ))}
        </ScrollReveal>

        <ScrollReveal delay={140}>
          <IdCard
            name={config.personal.name}
            title={config.personal.title}
            handle={config.personal.handle}
            avatarSrc={config.personal.avatar}
            availability={
              availability ? `${availability}${relocation ? " · relocation OK" : ""}` : null
            }
            facts={[
              ...(location ? [{ label: "Location", value: location }] : []),
              ...(education
                ? [
                    {
                      label: "Education",
                      value: `${education.degree}\n${education.institution} · ${education.graduationDate}`,
                    },
                  ]
                : []),
            ]}
            focus={focus}
            backLines={funFacts}
          />
        </ScrollReveal>
      </div>

      {interests.length ? (
        <ScrollReveal delay={80} className="mt-12">
          <p className="mb-3 font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Currently into
          </p>
          <div className="marquee" aria-label="Interests">
            {[0, 1].map((copy) => (
              <ul
                key={copy}
                className="marquee-track"
                aria-hidden={copy === 1 ? "true" : undefined}
              >
                {interests.map((interest) => (
                  <li
                    key={interest}
                    className="whitespace-nowrap rounded-full border border-border bg-surface/70 px-3.5 py-1.5 text-sm text-foreground"
                  >
                    {interest}
                  </li>
                ))}
              </ul>
            ))}
          </div>
        </ScrollReveal>
      ) : null}
    </section>
  );
}
