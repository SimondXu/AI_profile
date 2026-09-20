import { MapPin } from "lucide-react";
import Link from "next/link";
import { ScrollReveal } from "@/components/motion/scroll-reveal";
import { ProjectCover } from "@/components/projects/covers/project-cover";
import { CollectionDesk, type DeskNote } from "@/components/studio/collection-desk";
import { projectPresentationBySlug } from "@/content/project-presentation";
import { getConfig } from "@/lib/config-loader";
import { AboutSection } from "./about-section";
import { AiStatusPill } from "./ai-status-pill";
import { ExperienceTimeline } from "./experience-timeline";
import { HeroAskForm } from "./hero-ask-form";
import { getLastPush } from "./now-strip";
import { Reveal } from "./reveal";
import { SectionHeader } from "./section-header";

const pillClass =
  "inline-flex items-center gap-2 rounded-full border border-border bg-surface/70 px-3 py-1 font-mono text-[12px] text-muted-foreground backdrop-blur";

/** First sentence of a paragraph — the hero says one thing, About says the rest. */
export function firstSentence(text: string): string {
  const match = text.match(/^[^.!?]*[.!?]/);
  return (match ? match[0] : text).trim();
}

export default async function LandingPage() {
  const config = getConfig();

  const positioning = firstSentence(config.aiProfile.positioning || config.personal.bio);
  const lastPush = await getLastPush();
  const note: DeskNote | null = lastPush
    ? { text: `last push\n${lastPush.relative}`, href: lastPush.href }
    : null;
  const terminalQuestion =
    config.aiProfile.followUpQuestions[0] ?? config.aiProfile.featuredQuestions[0] ?? "Who are you?";

  const askSuggestions = [
    ...config.aiProfile.featuredQuestions,
    ...config.presetQuestions.fun.slice(0, 1),
  ].filter(Boolean);

  const deskAskQuestion =
    config.presetQuestions.me[0] ??
    config.aiProfile.featuredQuestions[0] ??
    "Ask me anything";

  const avatarLines = [
    ...(config.personality?.funFacts ?? []),
    ...(config.entryLevel?.workStyle ? [config.entryLevel.workStyle] : []),
  ];

  const featuredProjects = config.projects.filter((project) => project.featured);
  const location = config.personal.location?.current;
  const availability = config.entryLevel?.availability;

  return (
    <>
      <section
        className="mx-auto grid w-full max-w-6xl gap-12 px-5 pb-10 pt-12 sm:px-8 sm:pt-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-center lg:gap-16 lg:pb-12 lg:pt-20"
        aria-labelledby="hero-title"
      >
        <div className="flex flex-col gap-7">
          <Reveal>
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
              {config.personal.title}
            </p>
          </Reveal>
          <Reveal delay={40}>
            <h1
              id="hero-title"
              className="font-display text-[44px] font-semibold leading-[1.02] tracking-[-0.02em] text-foreground sm:text-[60px] lg:text-[72px]"
            >
              {config.personal.name}
            </h1>
          </Reveal>
          <Reveal delay={80}>
            <p className="max-w-[40ch] font-display text-[22px] font-medium leading-[1.3] tracking-tight text-foreground sm:text-[26px]">
              {positioning}
            </p>
          </Reveal>
          <Reveal delay={110}>
            <div className="flex flex-wrap items-center gap-2">
              <AiStatusPill />
              {location ? (
                <span className={pillClass}>
                  <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                  {location}
                </span>
              ) : null}
              {availability ? <span className={pillClass}>{availability}</span> : null}
            </div>
          </Reveal>
          <Reveal delay={140}>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/projects"
                className="inline-flex min-h-11 items-center rounded-[10px] bg-accent px-5 text-sm font-medium text-accent-foreground shadow-[0_8px_24px_-12px_var(--accent)] transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:hover:translate-y-0"
              >
                See projects
              </Link>
              <Link
                href="/resume"
                className="inline-flex min-h-11 items-center rounded-[10px] border border-border bg-surface/70 px-5 text-sm font-medium text-foreground backdrop-blur transition-colors hover:border-input hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                Resume
              </Link>
            </div>
          </Reveal>
          <Reveal delay={180}>
            <HeroAskForm suggestions={askSuggestions} label="Ask my portfolio AI" />
          </Reveal>
        </div>

        <div>
          <CollectionDesk
            avatarSrc={config.personal.avatar}
            askQuestion={deskAskQuestion}
            lines={avatarLines}
            terminalQuestion={terminalQuestion}
            note={note}
          />
        </div>
      </section>

      <AboutSection config={config} />

      <section
        id="experience"
        className="mx-auto w-full max-w-6xl scroll-mt-20 border-t border-border px-5 py-16 sm:px-8 lg:py-24"
        aria-labelledby="experience-title"
      >
        <ScrollReveal>
          <SectionHeader
            eyebrow="02 — Experience"
            title="Experience"
            titleId="experience-title"
          />
        </ScrollReveal>

        <ExperienceTimeline entries={config.experience} />
      </section>
      <section
        id="projects"
        className="mx-auto w-full max-w-6xl scroll-mt-20 border-t border-border px-5 py-16 sm:px-8 lg:py-24"
        aria-labelledby="projects-title"
      >
        <ScrollReveal>
          <SectionHeader
            eyebrow="03 — Selected work"
            title="Selected work"
            titleId="projects-title"
            action={
              <Link
                href="/projects"
                className="text-sm font-medium text-accent underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                All projects →
              </Link>
            }
          />
        </ScrollReveal>

        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {featuredProjects.map((project, index) => {
            const shortTitle =
              projectPresentationBySlug[project.slug]?.shortTitle ?? project.title;

            return (
              <ScrollReveal key={project.slug} delay={index * 90}>
                <Link
                  href={`/projects/${project.slug}`}
                  className="group flex h-full flex-col gap-4 rounded-[18px] border border-border bg-surface/80 p-5 backdrop-blur transition-[transform,border-color,box-shadow] duration-300 hover:-translate-y-1 hover:border-input hover:shadow-[0_24px_48px_-32px_rgba(0,0,0,0.5)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:hover:translate-y-0"
                >
                  <div className="relative aspect-[3/2] w-full overflow-hidden rounded-[14px] border border-border bg-surface">
                    <ProjectCover
                      slug={project.slug}
                      title={shortTitle}
                      className="h-full w-full"
                    />
                    <span className="absolute bottom-2 right-3 rounded-full bg-surface/80 px-2 py-0.5 text-[11px] text-muted-foreground">
                      Concept artwork
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col gap-2">
                    <h3 className="font-display text-[22px] font-semibold leading-tight text-foreground">
                      {shortTitle}
                    </h3>
                    <p className="text-[15px] leading-6 text-muted-foreground">
                      {project.summary}
                    </p>
                  </div>
                  <ul className="flex flex-wrap gap-2">
                    {project.techStack.slice(0, 4).map((tech) => (
                      <li
                        key={tech}
                        className="rounded-[8px] border border-border px-2 py-1 font-mono text-[11px] text-muted-foreground"
                      >
                        {tech}
                      </li>
                    ))}
                  </ul>
                </Link>
              </ScrollReveal>
            );
          })}
        </div>
      </section>

    </>
  );
}
