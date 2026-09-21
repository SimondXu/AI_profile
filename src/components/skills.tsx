"use client";

import { getConfig } from "@/lib/config-loader";

export default function Skills() {
  const config = getConfig();
  const groups = [
    { title: "Languages", values: config.skills.languages },
    { title: "AI / LLM", values: config.skills.ai_llm },
    { title: "Frameworks", values: config.skills.frameworks },
    { title: "Data / Infra", values: config.skills.data_infra },
  ];

  return (
    <section className="quiet-tool-surface" aria-label="Skills">
      <div className="quiet-tool-list">
        {groups.map((group) => (
          <div key={group.title}>
            <h3>{group.title}</h3>
            <p>{group.values.join(", ")}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
