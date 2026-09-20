import type { Metadata } from "next";
import { Download } from "lucide-react";
import { getConfig } from "@/lib/config-loader";
import { ResumeDownloadLink } from "@/components/tracking/resume-download-link";
import { Resume } from "@/components/resume";

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

export default function ResumePage() {
  const config = getConfig();
  const resumePdfUrl = config.resume.pdfUrl || "/Edison-resume-2026.pdf";
  const featuredProjects = config.projects.filter(
    (project) => project.featured,
  );
  const previousEducation = (
    config.education as typeof config.education & EducationWithPrevious
  ).previous;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-4 border-b border-border pb-8">
        <div>
          <h1 className="font-display text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Resume
          </h1>
          <p className="mt-2 max-w-prose text-base text-muted-foreground">
            {config.resume.description}
          </p>
        </div>

        <dl className="flex flex-wrap gap-x-5 gap-y-1 font-mono text-xs text-muted-foreground print:hidden">
          <div>
            <dt className="inline">Updated</dt>{" "}
            <dd className="inline text-foreground">{config.resume.lastUpdated}</dd>
          </div>
          <div>
            <dt className="inline">Size</dt>{" "}
            <dd className="inline text-foreground">{config.resume.fileSize}</dd>
          </div>
          <div>
            <dt className="inline">Format</dt>{" "}
            <dd className="inline text-foreground">{config.resume.fileType}</dd>
          </div>
        </dl>

        <div className="flex flex-wrap items-center gap-4 print:hidden">
          <ResumeDownloadLink
            href={resumePdfUrl}
            download="Edison-resume-2026.pdf"
            className="inline-flex h-11 items-center gap-2 rounded-[10px] bg-accent px-5 text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <Download aria-hidden="true" className="h-4 w-4" />
            Download PDF
          </ResumeDownloadLink>
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground print:text-foreground">
          <a href={`mailto:${config.personal.email}`} className="hover:text-foreground">
            {config.personal.email}
          </a>
          {config.personal.phone ? (
            <a href={`tel:${config.personal.phone}`} className="hover:text-foreground">
              {config.personal.phone}
            </a>
          ) : null}
          <span>{config.personal.location.current}</span>
          <a
            href={config.social.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground print:hidden"
          >
            LinkedIn
          </a>
          <a
            href={config.social.github}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground print:hidden"
          >
            GitHub
          </a>
        </div>
      </header>

      <div className="mt-8">
        <Resume embedded />
      </div>

      <section className="mt-10" aria-labelledby="resume-experience">
        <h2 id="resume-experience" className="font-display text-xl font-semibold text-foreground">
          Experience
        </h2>
        <div className="mt-4 flex flex-col gap-6">
          {config.experience.map((experience) => (
            <article key={`${experience.company}-${experience.position}`} className="flex flex-col gap-1">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <h3 className="text-base font-semibold text-foreground">{experience.position}</h3>
                  <p className="text-sm text-muted-foreground">{experience.company}</p>
                </div>
                <p className="font-mono text-xs text-muted-foreground">{experience.duration}</p>
              </div>
              <p className="max-w-prose text-sm text-foreground">{experience.description}</p>
              {experience.highlights?.length ? (
                <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-foreground">
                  {experience.highlights.map((highlight) => (
                    <li key={highlight}>{highlight}</li>
                  ))}
                </ul>
              ) : null}
              <p className="mt-1 text-xs text-muted-foreground">{experience.technologies.join(", ")}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-10 grid gap-8 sm:grid-cols-2">
        <div>
          <h2 className="font-display text-xl font-semibold text-foreground">Education</h2>
          <div className="mt-4 flex flex-col gap-4">
            <article>
              <h3 className="text-base font-semibold text-foreground">{config.education.current.degree}</h3>
              <p className="text-sm text-muted-foreground">{config.education.current.institution}</p>
              <p className="font-mono text-xs text-muted-foreground">
                {config.education.current.duration}, {config.education.current.graduationDate}
              </p>
            </article>
            {previousEducation ? (
              <article>
                <h3 className="text-base font-semibold text-foreground">{previousEducation.degree}</h3>
                <p className="text-sm text-muted-foreground">{previousEducation.institution}</p>
                <p className="font-mono text-xs text-muted-foreground">
                  {previousEducation.duration}
                  {previousEducation.graduationDate ? `, ${previousEducation.graduationDate}` : ""}
                </p>
              </article>
            ) : null}
          </div>
        </div>
        <div>
          <h2 className="font-display text-xl font-semibold text-foreground">Skills</h2>
          <div className="mt-4 flex flex-col gap-2 text-sm text-foreground">
            <p>
              <strong className="font-semibold">Applied AI </strong>
              {config.skills.ml_ai.slice(0, 6).join(", ")}
            </p>
            <p>
              <strong className="font-semibold">Languages </strong>
              {config.skills.programming.join(", ")}
            </p>
            <p>
              <strong className="font-semibold">Web </strong>
              {config.skills.web_development.slice(0, 6).join(", ")}
            </p>
            <p>
              <strong className="font-semibold">Cloud and data </strong>
              {[...config.skills.databases, ...config.skills.devops_cloud.slice(0, 6)].join(", ")}
            </p>
          </div>
        </div>
      </section>

      <section className="mt-10" aria-labelledby="resume-projects">
        <h2 id="resume-projects" className="font-display text-xl font-semibold text-foreground">
          Selected projects
        </h2>
        <div className="mt-4 flex flex-col gap-4">
          {featuredProjects.map((project) => (
            <article key={project.title}>
              <h3 className="text-base font-semibold text-foreground">{project.title}</h3>
              <p className="max-w-prose text-sm text-foreground">{project.description}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
