import Link from "next/link";
import { ProjectCover } from "@/components/projects/covers/project-cover";
import { CollectionDesk } from "@/components/studio/collection-desk";
import { projectPresentationBySlug } from "@/content/project-presentation";
import { getConfig } from "@/lib/config-loader";
import { HeroAskForm } from "./hero-ask-form";
import { NowStrip } from "./now-strip";
import { Reveal } from "./reveal";

/** First sentence of a paragraph, used to keep the hero to one honest line. */
function firstSentence(text: string): string {
  const match = text.match(/^[^.!?]*[.!?]/);
  return (match ? match[0] : text).trim();
}

export default function LandingPage() {
  const config = getConfig();

  const positioningSource = config.aiProfile.positioning || config.personal.bio;
  const positioning = firstSentence(positioningSource);

  const heroAskPlaceholder =
    config.aiProfile.featuredQuestions[0] ??
    config.presetQuestions.me[0] ??
    "Ask about my work";

  const deskAskQuestion =
    config.presetQuestions.me[0] ??
    config.aiProfile.featuredQuestions[0] ??
    "Ask me anything";

  const featuredProjects = config.projects.filter((project) => project.featured);
  const bioParagraphs = config.personal.bio
    .split("\n\n")
    .filter((paragraph) => paragraph.trim().length > 0);
  const heroBioParagraph = bioParagraphs[0];
  const educationLine = `${config.education.current.degree}, ${config.education.current.institution} · ${config.education.current.graduationDate}`;

  return (
    <>
      <section
        className="mx-auto grid w-full max-w-6xl gap-10 px-5 py-12 sm:px-8 sm:py-16 lg:grid-cols-2 lg:items-center lg:gap-16 lg:py-24"
        aria-labelledby="hero-title"
      >
        <div className="flex flex-col gap-6">
          <Reveal>
            <p className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
              {config.personal.title}
            </p>
          </Reveal>
          <Reveal delay={40}>
            <h1
              id="hero-title"
              className="font-display text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-[64px] lg:leading-[1.05]"
            >
              {config.personal.name}
            </h1>
          </Reveal>
          <Reveal delay={80}>
            <p className="max-w-prose text-lg text-muted-foreground">
              {positioning}
            </p>
          </Reveal>
          {heroBioParagraph ? (
            <Reveal delay={100}>
              <p className="max-w-prose text-muted-foreground">
                {heroBioParagraph}
              </p>
            </Reveal>
          ) : null}
          <Reveal delay={120}>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/projects"
                className="inline-flex min-h-11 items-center rounded-[10px] bg-accent px-5 text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                See projects
              </Link>
              <Link
                href="/resume"
                className="inline-flex min-h-11 items-center rounded-[10px] border border-border px-5 text-sm font-medium text-foreground transition-colors hover:bg-surface-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                Resume
              </Link>
            </div>
          </Reveal>
          <Reveal delay={160}>
            <HeroAskForm
              placeholder={heroAskPlaceholder}
              label="Ask my portfolio AI"
            />
          </Reveal>
        </div>

        <div>
          <CollectionDesk
            avatarSrc={config.personal.avatar}
            askQuestion={deskAskQuestion}
          />
        </div>
      </section>

      <div className="mx-auto w-full max-w-6xl px-5 sm:px-8">
        <NowStrip />
      </div>

      <section
        id="projects"
        className="mx-auto w-full max-w-6xl scroll-mt-20 px-5 py-16 sm:px-8"
        aria-labelledby="projects-title"
      >
        <Reveal>
          <h2
            id="projects-title"
            className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl"
          >
            Featured work
          </h2>
        </Reveal>

        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {featuredProjects.map((project, index) => {
            const shortTitle =
              projectPresentationBySlug[project.slug]?.shortTitle ?? project.title;

            return (
              <Reveal key={project.slug} delay={Math.min(index * 40, 200)}>
                <Link
                  href={`/projects/${project.slug}`}
                  className="group flex h-full flex-col gap-4 rounded-[18px] border border-border bg-surface p-5 transition-colors hover:border-input focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <div className="relative aspect-[3/2] w-full overflow-hidden rounded-[18px] border border-border bg-surface">
                    <ProjectCover
                      slug={project.slug}
                      title={shortTitle}
                      className="h-full w-full"
                    />
                    <span className="absolute bottom-2 right-3 rounded-full bg-surface/80 px-2 py-0.5 text-[12px] text-muted-foreground">
                      Concept artwork
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col gap-2">
                    <h3 className="font-display text-lg font-semibold text-foreground">
                      {shortTitle}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {project.summary}
                    </p>
                  </div>
                  <ul className="flex flex-wrap gap-2">
                    {project.techStack.slice(0, 4).map((tech) => (
                      <li
                        key={tech}
                        className="rounded-[10px] border border-border px-2 py-1 font-mono text-xs text-muted-foreground"
                      >
                        {tech}
                      </li>
                    ))}
                  </ul>
                </Link>
              </Reveal>
            );
          })}
        </div>
      </section>

      <section
        id="experience"
        className="mx-auto w-full max-w-6xl scroll-mt-20 px-5 py-16 sm:px-8"
        aria-labelledby="experience-title"
      >
        <Reveal>
          <h2
            id="experience-title"
            className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl"
          >
            Experience
          </h2>
        </Reveal>

        <div className="mt-8 flex flex-col divide-y divide-border">
          {config.experience.map((role) => (
            <article
              key={`${role.company}-${role.position}`}
              className="flex flex-col gap-2 py-6 first:pt-0"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-base font-semibold text-foreground">
                  {role.position} · {role.company}
                </h3>
                <p className="font-mono text-xs text-muted-foreground">
                  {role.duration}
                  {role.location ? ` · ${role.location}` : ""}
                </p>
              </div>
              <p className="text-sm text-muted-foreground">{role.description}</p>
              {role.highlights?.length ? (
                <ul className="mt-1 list-inside list-disc space-y-1 text-sm text-muted-foreground">
                  {role.highlights.slice(0, 3).map((highlight) => (
                    <li key={highlight}>{highlight}</li>
                  ))}
                </ul>
              ) : null}
            </article>
          ))}
        </div>
      </section>

      <section
        id="about"
        className="mx-auto w-full max-w-6xl scroll-mt-20 px-5 py-16 sm:px-8"
        aria-labelledby="about-title"
      >
        <Reveal>
          <h2
            id="about-title"
            className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl"
          >
            About
          </h2>
        </Reveal>

        <div className="mt-6 max-w-prose space-y-4 text-base leading-relaxed text-muted-foreground">
          {bioParagraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
          <p className="font-mono text-sm text-muted-foreground">{educationLine}</p>
        </div>
      </section>
    </>
  );
}
