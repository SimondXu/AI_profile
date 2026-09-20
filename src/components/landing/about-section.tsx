import Image from "next/image";
import { ScrollReveal } from "@/components/motion/scroll-reveal";
import type { PortfolioConfig } from "@/types/portfolio";
import { SectionHeader } from "./section-header";

interface AboutSectionProps {
  config: PortfolioConfig;
}

/**
 * About: the bio set as a pull-quote plus a physical "ID card" made of the
 * same paper material as the desk, and a slow strip of real interests.
 * Every value comes from portfolio-config.json; missing fields are skipped.
 */
export function AboutSection({ config }: AboutSectionProps) {
  const [lead, ...rest] = config.personal.bio
    .split("\n\n")
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  const education = config.education?.current ?? null;
  const location = config.personal.location?.current || null;
  const availability = config.entryLevel?.availability || null;
  const relocation = Boolean(config.personal.location?.relocation);
  const focus = config.entryLevel?.focusAreas ?? [];
  const traits = config.personality?.traits ?? [];
  const interests = config.personality?.interests ?? [];

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
          {traits.length ? (
            <ul className="flex flex-wrap gap-2" aria-label="Traits">
              {traits.map((trait) => (
                <li
                  key={trait}
                  className="rounded-full border border-border bg-surface/70 px-3 py-1 font-mono text-[12px] text-muted-foreground"
                >
                  {trait}
                </li>
              ))}
            </ul>
          ) : null}
        </ScrollReveal>

        <ScrollReveal delay={140}>
          <div className="group relative mx-auto w-full max-w-sm rotate-[-1.5deg] rounded-[18px] bg-material-paper p-5 text-material-vinyl shadow-[0_1px_2px_rgba(0,0,0,0.12),0_18px_40px_-20px_rgba(0,0,0,0.45)] transition-transform duration-300 hover:rotate-0 motion-reduce:rotate-0 lg:mx-0">
            <div className="flex items-center gap-4">
              <Image
                src={config.personal.avatar}
                alt=""
                width={56}
                height={56}
                className="h-14 w-14 rounded-[10px] border border-black/10 object-cover"
              />
              <div className="min-w-0">
                <p className="truncate font-display text-lg font-semibold leading-tight">
                  {config.personal.name}
                </p>
                <p className="truncate text-sm text-material-vinyl/70">
                  {config.personal.title}
                </p>
              </div>
            </div>

            <dl className="mt-5 flex flex-col gap-3 border-t border-black/10 pt-4 text-sm">
              {availability ? (
                <div>
                  <dt className="font-mono text-[11px] uppercase tracking-[0.18em] text-material-vinyl/60">
                    Status
                  </dt>
                  <dd className="mt-1 flex items-center gap-2">
                    <span className="pulse-dot text-emerald-600" aria-hidden="true" />
                    <span>
                      {availability}
                      {relocation ? " · relocation OK" : ""}
                    </span>
                  </dd>
                </div>
              ) : null}
              {location ? (
                <div>
                  <dt className="font-mono text-[11px] uppercase tracking-[0.18em] text-material-vinyl/60">
                    Location
                  </dt>
                  <dd className="mt-1">{location}</dd>
                </div>
              ) : null}
              {education ? (
                <div>
                  <dt className="font-mono text-[11px] uppercase tracking-[0.18em] text-material-vinyl/60">
                    Education
                  </dt>
                  <dd className="mt-1">
                    {education.degree}
                    <span className="block text-material-vinyl/70">
                      {education.institution} · {education.graduationDate}
                    </span>
                  </dd>
                </div>
              ) : null}
              {focus.length ? (
                <div>
                  <dt className="font-mono text-[11px] uppercase tracking-[0.18em] text-material-vinyl/60">
                    Focus
                  </dt>
                  <dd className="mt-1.5 flex flex-wrap gap-1.5">
                    {focus.map((area) => (
                      <span
                        key={area}
                        className="rounded-[6px] border border-black/10 bg-white/50 px-2 py-0.5 text-[12px]"
                      >
                        {area}
                      </span>
                    ))}
                  </dd>
                </div>
              ) : null}
            </dl>

            <p className="mt-4 border-t border-black/10 pt-3 font-mono text-[10px] uppercase tracking-[0.2em] text-material-vinyl/50">
              studio pass · {config.personal.handle}
            </p>
          </div>
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
