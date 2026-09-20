"use client";

import { getConfig } from "@/lib/config-loader";

interface PresentationProps {
  embedded?: boolean;
}

export function Presentation({ embedded = false }: PresentationProps) {
  const config = getConfig();

  return (
    <section className="quiet-tool-surface" aria-labelledby="presentation-title">
      <h2 id="presentation-title" className={embedded ? "sr-only" : undefined}>
        About Simon
      </h2>
      <p>
        Software engineer on the Generative AI team at Highmark Health. His work
        includes real-time training, research, and document-search tools.
      </p>
      <dl>
        <div>
          <dt>Based in</dt>
          <dd>{config.personal.location.current}</dd>
        </div>
        <div>
          <dt>Education</dt>
          <dd>{config.education.current.institution}</dd>
        </div>
        <div>
          <dt>Work authorization</dt>
          <dd>{config.personal.workAuthorization?.notes ?? config.personal.workAuthorization?.status}</dd>
        </div>
      </dl>
    </section>
  );
}

export default Presentation;
