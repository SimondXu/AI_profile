import { getConfig } from "@/lib/config-loader";

function formatHighlights(items: string[]) {
  return items.map((item) => `- ${item}`).join("\n");
}

function findFeaturedProject(prefix: string) {
  return getConfig().projects.find(
    (project) =>
      project.featured && project.title.toLowerCase().startsWith(prefix),
  );
}

function describeProject(prefix: string) {
  const project = findFeaturedProject(prefix);

  if (!project) {
    return "That project is not currently listed in the portfolio configuration.";
  }

  const highlights = project.achievements ?? project.metrics ?? [];
  const details = highlights.length
    ? `\n\nHighlights:\n${formatHighlights(highlights)}`
    : "";

  return `**${project.title}**\n\n${project.description}\n\nTech: ${project.techStack.join(", ")}.${details}`;
}

function describeFeaturedProjects() {
  const projects = getConfig().projects.filter((project) => project.featured);

  return projects
    .map((project) => {
      const name = project.title.split(":")[0];
      return `**${name}:** ${project.summary}`;
    })
    .join("\n\n");
}

function describeExperience() {
  const config = getConfig();

  return config.experience
    .map((experience) => {
      const highlights = experience.highlights ?? [];
      const details = highlights.length
        ? `\n${formatHighlights(highlights)}`
        : `\n${experience.description}`;

      return `**${experience.position} at ${experience.company}** (${experience.duration})${details}`;
    })
    .join("\n\n");
}

function describeSkills() {
  const { skills } = getConfig();

  return [
    `**Languages:** ${skills.languages.join(", ")}`,
    `**AI / LLM:** ${skills.ai_llm.join(", ")}`,
    `**Frameworks:** ${skills.frameworks.join(", ")}`,
    `**Data / Infra:** ${skills.data_infra.join(", ")}`,
  ].join("\n\n");
}

function describeContact(includeResume: boolean) {
  const config = getConfig();
  const lines = [
    `Email: [${config.personal.email}](mailto:${config.personal.email})`,
    `LinkedIn: [${config.personal.name}](${config.social.linkedin})`,
    `GitHub: [${config.personal.handle}](${config.social.github})`,
    `Location: ${config.personal.location.current}`,
  ];

  if (includeResume) {
    lines.unshift(
      `Resume: [View online](${config.resume.downloadUrl}) or [download the PDF](${config.resume.pdfUrl ?? config.resume.downloadUrl})`,
    );
  }

  return lines.join("\n\n");
}

function normalizeForMatch(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9@/]+/g, " ")
    .trim();
}

function getMatchScore(question: string, terms: string[]) {
  const matches = [
    ...new Set(
      terms
        .map(normalizeForMatch)
        .filter((term) => term && question.includes(term)),
    ),
  ];

  if (!matches.length) return 0;

  const mostSpecificTerm = Math.max(
    ...matches.map((term) => term.split(" ").length * 100 + term.length),
  );

  return mostSpecificTerm + matches.length;
}

function findGroundedAnswers(question: string) {
  const normalized = normalizeForMatch(question);
  const matches = getConfig()
    .aiProfile.frequentlyAskedQuestions.map((item) => ({
      answer: item.answer,
      score: getMatchScore(normalized, item.matchTerms),
    }))
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score);

  if (!matches.length) return null;

  const hasMultipleIntents =
    matches.length > 1 &&
    (/\b(and|also|plus|as well as)\b/i.test(question) ||
      /[;&]/.test(question) ||
      (question.match(/\?/g)?.length ?? 0) > 1);

  return matches
    .slice(0, hasMultipleIntents ? 2 : 1)
    .map((item) => item.answer)
    .join("\n\n");
}

export function getFallbackAnswer(question: string) {
  const normalized = question.toLowerCase();

  const groundedAnswers = findGroundedAnswers(question);
  if (groundedAnswers) {
    return groundedAnswers;
  }

  if (normalized.includes("conductor")) {
    return describeProject("conductor");
  }

  if (normalized.includes("engram") || normalized.includes("memory")) {
    return describeProject("engram");
  }

  if (
    normalized.includes("figbrain") ||
    normalized.includes("figma") ||
    normalized.includes("figjam")
  ) {
    return describeProject("figbrain");
  }

  if (
    normalized.includes("hobby") ||
    normalized.includes("weekend") ||
    normalized.includes("outside of work")
  ) {
    return "My public resume and LinkedIn profile do not include enough detail about hobbies or life outside work, so I would rather not invent an answer. You can ask about how I work, what motivates my engineering decisions, or the systems I have built.";
  }

  if (normalized.includes("project") || normalized.includes("proud of")) {
    return describeFeaturedProjects();
  }

  if (
    normalized.includes("highmark") ||
    normalized.includes("experience") ||
    normalized.includes("work") ||
    normalized.includes("career")
  ) {
    return describeExperience();
  }

  if (
    normalized.includes("skill") ||
    normalized.includes("stack") ||
    normalized.includes("technology") ||
    normalized.includes("technologies")
  ) {
    return describeSkills();
  }

  const asksForResume =
    normalized.includes("resume") || normalized.includes("cv");
  const asksForContact =
    normalized.includes("contact") ||
    normalized.includes("email") ||
    normalized.includes("reach") ||
    normalized.includes("linkedin") ||
    normalized.includes("github");

  if (asksForResume || asksForContact) {
    return describeContact(asksForResume);
  }

  const config = getConfig();

  if (/^\s*(hi|hello|hey|good (morning|afternoon|evening))\b/i.test(question)) {
    return `Hi - I'm ${config.personal.name}'s portfolio AI. ${config.aiProfile.positioning}\n\nYou can ask about his Highmark work, featured projects, technical decisions, role fit, or contact details.`;
  }

  const featuredProjects = config.projects
    .filter((project) => project.featured)
    .map((project) => project.title.split(":")[0])
    .join(", ");

  return `${config.aiProfile.unknownAnswerStyle}\n\nTry asking about my Highmark experience, ${featuredProjects}, AI reliability, technical skills, role fit, resume, or contact information.`;
}
