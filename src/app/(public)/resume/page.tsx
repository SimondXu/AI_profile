import type { Metadata } from "next";
import { Download, ExternalLink, Mail, MapPin, Phone } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { ExperienceTimeline } from "@/components/landing/experience-timeline";
import { SectionHeader } from "@/components/landing/section-header";
import { ScrollReveal } from "@/components/motion/scroll-reveal";
import { PdfPreview } from "@/components/resume/pdf-preview";
import { ResumeDownloadLink } from "@/components/tracking/resume-download-link";
import { projectPresentationBySlug } from "@/content/project-presentation";
import { getConfig } from "@/lib/config-loader";
import type { Skills } from "@/types/portfolio";

export const metadata: Metadata = {
  title: "Resume",
  description:
    "Experience, education, skills, and selected projects of Simon Xu, with a downloadable PDF resume.",
  alternates: {
    canonical: "/resume",
  },
};

type EducationWithPrevious = {
  previous?: {
    degree: string;
    institution: string;
    duration: string;
    graduationDate?: string;
  };
};

const SKILL_GROUPS: Array<{ label: string; key: keyof Skills }> = [
  { label: "Languages", key: "languages" },
  { label: "AI / LLM", key: "ai_llm" },
  { label: "Frameworks", key: "frameworks" },
  { label: "Data / Infra", key: "data_infra" },
];

/** Pipe-separated headline: the first clause leads, the rest become pills. */
function headlineParts(description: string): { lead: string; pills: string[] } {
  const [lead, ...pills] = description
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean);
  return { lead: lead ?? description, pills };
}

const sectionLinks = [
  { id: "experience", label: "Experience" },
  { id: "education", label: "Education" },
  { id: "skills", label: "Skills" },
  { id: "projects", label: "Projects" },
];

export default function ResumePage() {
  const config = getConfig();
  const pdfUrl = config.resume.pdfUrl || config.resume.downloadUrl;
  const downloadName = pdfUrl.split("/").pop() || "resume.pdf";
  const featuredProjects = config.projects.filter((project) => project.featured);
  const previousEducation = (
    config.education as typeof config.education & EducationWithPrevious
  ).previous;
  const certifications = config.education.achievements ?? [];
  const headline = headlineParts(config.resume.description);

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-12 sm:px-8 lg:py-16">
      <div className="grid gap-10 lg:grid-cols-[19rem_minmax(0,1fr)] lg:gap-16">
        {/* Document rail */}
        <aside className="flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-[18px] bg-material-paper p-5 text-material-vinyl shadow-[0_1px_2px_rgba(0,0,0,0.12),0_18px_40px_-20px_rgba(0,0,0,0.45)]">
            <div className="flex items-center gap-4">
              <Image
                src={config.personal.avatar}
                alt=""
                width={56}
                height={56}
                priority
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

            <ul className="mt-5 flex flex-col gap-2 border-t border-black/10 pt-4 text-sm">
              <li>
                <a
                  href={`mailto:${config.personal.email}`}
                  className="inline-flex items-center gap-2 underline-offset-4 hover:underline"
                >
                  <Mail className="h-3.5 w-3.5 text-material-vinyl/60" aria-hidden="true" />
                  {config.personal.email}
                </a>
              </li>
              {config.personal.phone ? (
                <li>
                  <a
                    href={`tel:${config.personal.phone}`}
                    className="inline-flex items-center gap-2 underline-offset-4 hover:underline"
                  >
                    <Phone className="h-3.5 w-3.5 text-material-vinyl/60" aria-hidden="true" />
                    {config.personal.phone}
                  </a>
                </li>
              ) : null}
              {config.personal.location?.current ? (
                <li className="inline-flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5 text-material-vinyl/60" aria-hidden="true" />
                  {config.personal.location.current}
                </li>
              ) : null}
            </ul>

            <div className="mt-5 flex flex-col gap-2 print:hidden">
              <ResumeDownloadLink
                href={pdfUrl}
                download={downloadName}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[10px] bg-accent px-4 text-sm font-medium text-accent-foreground transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:hover:translate-y-0"
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                Download PDF
              </ResumeDownloadLink>
              <a
                href={pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[10px] border border-black/15 bg-white/40 px-4 text-sm font-medium transition-colors hover:bg-white/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                Open PDF
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            </div>

            <p className="mt-4 border-t border-black/10 pt-3 font-mono text-[10px] uppercase tracking-[0.2em] text-material-vinyl/50">
              {config.resume.fileType} · {config.resume.fileSize} · updated {config.resume.lastUpdated}
            </p>
          </div>

          <PdfPreview pdfUrl={pdfUrl} title={`${config.personal.name} resume PDF`} />

          <nav aria-label="Resume sections" className="hidden lg:block">
            <ul className="flex flex-col gap-1 border-l border-border pl-4 font-mono text-[12px] text-muted-foreground">
              {sectionLinks.map((section) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className="inline-flex min-h-8 items-center hover:text-foreground"
                  >
                    {section.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        {/* Document body */}
        <div className="min-w-0">
          <header className="flex flex-col gap-3">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Resume
            </p>
            <h1 className="font-display text-[40px] font-semibold leading-[1.1] tracking-tight text-foreground sm:text-[48px]">
              {config.personal.name}
            </h1>
            <p className="max-w-prose text-[17px] leading-[1.6] text-muted-foreground">
              {headline.lead}
            </p>
            {headline.pills.length ? (
              <ul className="flex flex-wrap gap-2">
                {headline.pills.map((pill) => (
                  <li
                    key={pill}
                    className="inline-flex items-center rounded-full border border-border bg-surface/70 px-3 py-1 font-mono text-[12px] text-muted-foreground backdrop-blur"
                  >
                    {pill}
                  </li>
                ))}
              </ul>
            ) : null}
          </header>

          <section
            id="experience"
            className="mt-14 scroll-mt-24 border-t border-border pt-10"
            aria-labelledby="resume-experience"
          >
            <ScrollReveal>
              <SectionHeader eyebrow="01" title="Experience" titleId="resume-experience" />
            </ScrollReveal>
            <ExperienceTimeline
              entries={config.experience}
              maxHighlights={Number.POSITIVE_INFINITY}
              showTechnologies
            />
          </section>

          <section
            id="education"
            className="mt-14 scroll-mt-24 border-t border-border pt-10"
            aria-labelledby="resume-education"
          >
            <ScrollReveal>
              <SectionHeader eyebrow="02" title="Education" titleId="resume-education" />
            </ScrollReveal>
            <div className="mt-8 grid gap-6 sm:grid-cols-2">
              {[config.education.current, previousEducation].filter(Boolean).map((entry, index) => (
                <ScrollReveal key={entry!.degree} delay={index * 80}>
                  <article className="flex h-full flex-col gap-1 rounded-[14px] border border-border bg-surface/70 p-5">
                    <h3 className="font-display text-[18px] font-semibold text-foreground">
                      {entry!.degree}
                    </h3>
                    <p className="text-sm text-foreground">{entry!.institution}</p>
                    <p className="font-mono text-[12px] text-muted-foreground">
                      {entry!.duration}
                      {entry!.graduationDate ? ` · ${entry!.graduationDate}` : ""}
                    </p>
                  </article>
                </ScrollReveal>
              ))}
            </div>
            {certifications.length ? (
              <ScrollReveal delay={120}>
                <ul className="mt-6 flex flex-col gap-1 text-sm text-muted-foreground">
                  {certifications.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-accent" aria-hidden="true" />
                      {item}
                    </li>
                  ))}
                </ul>
              </ScrollReveal>
            ) : null}
          </section>

          <section
            id="skills"
            className="mt-14 scroll-mt-24 border-t border-border pt-10"
            aria-labelledby="resume-skills"
          >
            <ScrollReveal>
              <SectionHeader eyebrow="03" title="Skills" titleId="resume-skills" />
            </ScrollReveal>
            <dl className="mt-8 flex flex-col gap-5">
              {SKILL_GROUPS.map((group, index) => {
                const items = config.skills[group.key];
                if (!items?.length) return null;
                return (
                  <ScrollReveal key={group.key} delay={index * 60}>
                    <div className="grid gap-2 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-6">
                      <dt className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground sm:pt-1.5">
                        {group.label}
                      </dt>
                      <dd className="flex flex-wrap gap-2">
                        {items.map((item) => (
                          <span
                            key={item}
                            className="rounded-[8px] border border-border bg-surface/70 px-2.5 py-1 text-[13px] text-foreground"
                          >
                            {item}
                          </span>
                        ))}
                      </dd>
                    </div>
                  </ScrollReveal>
                );
              })}
            </dl>
          </section>

          <section
            id="projects"
            className="mt-14 scroll-mt-24 border-t border-border pt-10"
            aria-labelledby="resume-projects"
          >
            <ScrollReveal>
              <SectionHeader
                eyebrow="04"
                title="Selected projects"
                titleId="resume-projects"
                action={
                  <Link
                    href="/projects"
                    className="text-sm font-medium text-accent underline-offset-4 hover:underline"
                  >
                    All projects →
                  </Link>
                }
              />
            </ScrollReveal>
            <div className="mt-8 flex flex-col gap-4">
              {featuredProjects.map((project, index) => (
                <ScrollReveal key={project.slug} delay={index * 80}>
                  <article className="grid gap-2 rounded-[14px] border border-border bg-surface/70 p-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-6">
                    <div className="flex flex-col gap-2">
                      <h3 className="font-display text-[18px] font-semibold text-foreground">
                        <Link
                          href={`/projects/${project.slug}`}
                          className="underline-offset-4 hover:underline"
                        >
                          {projectPresentationBySlug[project.slug]?.shortTitle ?? project.title}
                        </Link>
                        <span className="ml-2 font-sans text-sm font-normal text-muted-foreground">
                          {project.date}
                        </span>
                      </h3>
                      {project.achievements?.length ? (
                        <ul className="list-inside list-disc space-y-1 max-w-prose text-[15px] leading-6 text-foreground">
                          {project.achievements.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="max-w-prose text-[15px] leading-6 text-foreground">
                          {project.description}
                        </p>
                      )}
                      <p className="font-mono text-[12px] text-muted-foreground">
                        {project.techStack.join(" · ")}
                      </p>
                    </div>
                  </article>
                </ScrollReveal>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
