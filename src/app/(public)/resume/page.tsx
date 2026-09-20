import type { Metadata } from "next";
import { Download } from "lucide-react";
import { getConfig } from "@/lib/config-loader";
import { ResumeDownloadLink } from "@/components/tracking/resume-download-link";

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
    <div className="quiet-page quiet-resume-page">
      <div className="quiet-resume-shell">
        <header className="quiet-resume-header">
          <div>
            <h1>{config.personal.name}</h1>
            <p>{config.personal.title}</p>
          </div>
          <ResumeDownloadLink
            className="quiet-primary-link"
            href={resumePdfUrl}
            download="Edison-resume-2026.pdf"
          >
            <Download aria-hidden="true" />
            Download PDF
          </ResumeDownloadLink>
        </header>

        <div className="quiet-resume-contact">
          <a href={`mailto:${config.personal.email}`}>
            {config.personal.email}
          </a>
          {config.personal.phone ? (
            <a href={`tel:${config.personal.phone}`}>{config.personal.phone}</a>
          ) : null}
          <span>{config.personal.location.current}</span>
          <a
            href={config.social.linkedin}
            target="_blank"
            rel="noopener noreferrer"
          >
            LinkedIn
          </a>
          <a
            href={config.social.github}
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
        </div>

        <section
          className="quiet-resume-section"
          aria-labelledby="resume-experience"
        >
          <h2 id="resume-experience">Experience</h2>
          {config.experience.map((experience) => (
            <article
              key={`${experience.company}-${experience.position}`}
              className="quiet-resume-entry"
            >
              <div>
                <h3>{experience.position}</h3>
                <p>{experience.company}</p>
              </div>
              <p className="quiet-resume-date">{experience.duration}</p>
              <p className="quiet-resume-description">
                {experience.description}
              </p>
              {experience.highlights?.length ? (
                <ul className="quiet-resume-highlights">
                  {experience.highlights.map((highlight) => (
                    <li key={highlight}>{highlight}</li>
                  ))}
                </ul>
              ) : null}
              <p className="quiet-resume-tech">
                {experience.technologies.join(", ")}
              </p>
            </article>
          ))}
        </section>

        <section className="quiet-resume-grid">
          <div className="quiet-resume-section">
            <h2>Education</h2>
            <article className="quiet-resume-entry">
              <h3>{config.education.current.degree}</h3>
              <p>{config.education.current.institution}</p>
              <p className="quiet-resume-date">
                {config.education.current.duration},{" "}
                {config.education.current.graduationDate}
              </p>
            </article>
            {previousEducation ? (
              <article className="quiet-resume-entry">
                <h3>{previousEducation.degree}</h3>
                <p>{previousEducation.institution}</p>
                <p className="quiet-resume-date">
                  {previousEducation.duration}
                  {previousEducation.graduationDate
                    ? `, ${previousEducation.graduationDate}`
                    : ""}
                </p>
              </article>
            ) : null}
          </div>
          <div className="quiet-resume-section">
            <h2>Skills</h2>
            <div className="quiet-resume-skills">
              <p>
                <strong>Applied AI</strong>
                {config.skills.ml_ai.slice(0, 6).join(", ")}
              </p>
              <p>
                <strong>Languages</strong>
                {config.skills.programming.join(", ")}
              </p>
              <p>
                <strong>Web</strong>
                {config.skills.web_development.slice(0, 6).join(", ")}
              </p>
              <p>
                <strong>Cloud and data</strong>
                {[
                  ...config.skills.databases,
                  ...config.skills.devops_cloud.slice(0, 6),
                ].join(", ")}
              </p>
            </div>
          </div>
        </section>

        <section
          className="quiet-resume-section"
          aria-labelledby="resume-projects"
        >
          <h2 id="resume-projects">Selected projects</h2>
          <div className="quiet-resume-projects">
            {featuredProjects.map((project) => (
              <article key={project.title} className="quiet-resume-entry">
                <h3>{project.title}</h3>
                <p className="quiet-resume-description">
                  {project.description}
                </p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
