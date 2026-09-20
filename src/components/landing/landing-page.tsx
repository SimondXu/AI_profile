"use client";

import { FormEvent, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getConfig } from "@/lib/config-loader";

const prompts = [
  "What did you build at Highmark?",
  "How does Conductor recover failed workflows?",
  "How does Engram evaluate memory retrieval?",
];

export default function LandingPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const config = getConfig();
  const highmarkExperience = config.experience.filter((experience) =>
    experience.company.startsWith("Highmark"),
  );
  const featuredProjects = config.projects.filter(
    (project) => project.featured,
  );
  const [conductor, engram, figBrain] = featuredProjects;
  const recruitmentMeta = [
    config.personal.location.relocation
      ? "Open to relocation nationwide"
      : null,
    config.personal.workAuthorization?.status
      ?.replace(/^US\s+Citizen$/i, "U.S. citizen")
      .trim(),
    config.personal.workAuthorization?.requiresSponsorship === false
      ? "No sponsorship required"
      : null,
  ]
    .filter((item): item is string => Boolean(item))
    .join(" · ");

  const submitQuery = (value: string) => {
    const trimmedQuery = value.trim();
    if (!trimmedQuery) return;
    router.push(`/chat?q=${encodeURIComponent(trimmedQuery)}`);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submitQuery(query);
  };

  return (
    <div className="quiet-page">
      <div className="quiet-shell">
        <section className="quiet-hero" aria-labelledby="hero-title">
          <aside className="quiet-profile-rail" aria-label="Simon Xu profile">
            <Image
              className="quiet-hero-avatar"
              src={config.personal.avatar}
              alt="Simon Xu"
              width={224}
              height={224}
              priority
            />
            <h1 id="hero-title">Simon Xu</h1>
            <div className="quiet-profile-credentials">
              <p>Software Engineer, AI/ML</p>
              <p>M.S. CSE, Georgia Tech</p>
            </div>
            {recruitmentMeta ? (
              <p className="quiet-profile-recruiting">{recruitmentMeta}</p>
            ) : null}
            <div className="quiet-profile-links">
              <a
                href={config.social.github}
                target="_blank"
                rel="noopener noreferrer"
              >
                GitHub
              </a>
              <a
                href={config.social.linkedin}
                target="_blank"
                rel="noopener noreferrer"
              >
                LinkedIn
              </a>
              <Link href="/resume">Resume</Link>
            </div>
          </aside>

          <section
            id="about"
            className="quiet-biography"
            aria-labelledby="biography-title"
          >
            <h2 id="biography-title">About</h2>
            {config.personal.bio.split("\n\n").map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}

            <section className="quiet-ask-panel" aria-labelledby="ask-title">
              <h3 id="ask-title">Ask about my work</h3>
              <p id="profile-question-help" className="quiet-ask-help">
                Ask a specific question about my experience or projects.
              </p>
              <form onSubmit={handleSubmit} className="quiet-ask-form">
                <label htmlFor="profile-question">Question</label>
                <input
                  id="profile-question"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Ask about Highmark, Conductor, or Engram"
                  aria-describedby="profile-question-help"
                />
                <button type="submit">Ask</button>
              </form>
              <div
                className="quiet-prompt-list"
                aria-label="Suggested questions"
              >
                {prompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => submitQuery(prompt)}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </section>
          </section>
        </section>

        <section
          id="experience"
          className="quiet-experience-section"
          aria-labelledby="experience-title"
        >
          <div className="quiet-experience-side">
            <h2 id="experience-title">Experience</h2>
            <p>Highmark Inc.</p>
            <span>AI/ML team, 2024-present</span>
          </div>
          <div className="quiet-role-list">
            {highmarkExperience.map((experience) => (
              <article
                key={`${experience.company}-${experience.position}`}
                className="quiet-role"
              >
                <div>
                  <h3>
                    {experience.position.replace(" (", ", ").replace(")", "")}
                  </h3>
                  <p className="quiet-meta">
                    {experience.duration} /{" "}
                    {experience.location ?? experience.type}
                  </p>
                </div>
                <p>{experience.description}</p>
                {experience.highlights?.length ? (
                  <ul className="quiet-role-highlights">
                    {experience.highlights.map((highlight) => (
                      <li key={highlight}>{highlight}</li>
                    ))}
                  </ul>
                ) : null}
                <span>{experience.technologies.slice(0, 5).join(", ")}</span>
              </article>
            ))}
          </div>
        </section>

        <section
          id="projects"
          className="quiet-work-section"
          aria-labelledby="projects-title"
        >
          <header className="quiet-section-intro">
            <h2 id="projects-title">Selected projects</h2>
            <p>
              Durable agent infrastructure, memory systems, and AI-native design
              tools.
            </p>
          </header>

          {conductor ? (
            <article className="quiet-feature-work">
              <div className="quiet-feature-lead">
                <p className="quiet-meta">{conductor.date}</p>
                <h3>{conductor.title.split(":")[0]}</h3>
                <p className="quiet-tech">
                  {conductor.techStack.slice(0, 5).join(", ")}
                </p>
              </div>
              <div className="quiet-feature-details">
                {(conductor.achievements ?? [conductor.description]).map(
                  (detail) => (
                    <p key={detail}>{detail}</p>
                  ),
                )}
              </div>
            </article>
          ) : null}

          <div className="quiet-secondary-work">
            {engram ? (
              <article>
                <p className="quiet-meta">{engram.date}</p>
                <h3>{engram.title.split(":")[0]}</h3>
                <p>{engram.description}</p>
                {engram.metrics?.[0] ? (
                  <p className="quiet-project-result">{engram.metrics[0]}</p>
                ) : null}
                <span>{engram.techStack.slice(0, 5).join(", ")}</span>
              </article>
            ) : null}
            {figBrain ? (
              <article>
                <p className="quiet-meta">{figBrain.date}</p>
                <h3>{figBrain.title.split(":")[0]}</h3>
                <p>{figBrain.description}</p>
                {figBrain.metrics?.length ? (
                  <p className="quiet-project-result">
                    {figBrain.metrics.join(" / ")}
                  </p>
                ) : null}
                <span>{figBrain.techStack.slice(0, 5).join(", ")}</span>
              </article>
            ) : null}
          </div>
          <Link className="quiet-projects-cta" href="/projects">
            View all projects
          </Link>
        </section>

        <footer id="contact" className="quiet-footer">
          <a href={`mailto:${config.personal.email}`}>
            {config.personal.email}
          </a>
          <div>
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
            <Link href="/resume">Resume</Link>
          </div>
        </footer>
      </div>
    </div>
  );
}
