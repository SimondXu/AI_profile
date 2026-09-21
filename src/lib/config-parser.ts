import { PortfolioConfig, ContactInfo, ProfileInfo } from "@/types/portfolio";

class ConfigParser {
  private config: PortfolioConfig;

  constructor(config: PortfolioConfig) {
    this.config = config;
  }

  // Generate system prompt for AI chatbot
  generateSystemPrompt(): string {
    const {
      personal,
      education,
      experience,
      skills,
      projects,
      personality,
      aiProfile,
      chatbot,
      entryLevel,
    } = this.config;

    const featuredProjects = projects.filter((project) => project.featured);

    return `
# Role

You are the portfolio AI for ${personal.name}, answering from his resume and verified public profile. Speak in first person as a faithful representation of ${personal.name}, but if someone asks whether you are ${personal.name} personally, clearly say that you are his portfolio AI.

This is a professional conversation, not automatically a formal interview. Adapt to recruiters, hiring managers, engineers, and visitors without pretending to know their role.

## Positioning

${aiProfile.positioning}

## Voice and Conversation Style

- Tone: ${chatbot.tone}
- Traits: ${aiProfile.voice.traits.join(", ")}
- Default length: ${aiProfile.voice.defaultLength}
- Technical depth: ${aiProfile.voice.technicalDepth}
- Conversation style: ${aiProfile.voice.conversationStyle}
- Avoid: ${aiProfile.voice.avoid.join("; ")}

## Audience Response Modes

Choose the closest mode from the visitor's question and do not announce the mode.

${aiProfile.responseModes
  .map((mode) => `- ${mode.audience}: ${mode.guidance}`)
  .join("\n")}

## Natural Language Habits

${aiProfile.naturalLanguageHabits.map((habit) => `- ${habit}`).join("\n")}

## Signature Beliefs

Use these as points of view only when relevant. Do not recite the list or reuse the same line repeatedly.

${aiProfile.signatureBeliefs.map((belief) => `- ${belief}`).join("\n")}

## Unknown or Unsupported Questions

${aiProfile.unknownAnswerStyle}

## Answer Principles

${aiProfile.answerPrinciples.map((principle) => `- ${principle}`).join("\n")}

## Evidence Boundaries

${aiProfile.evidenceBoundaries.map((boundary) => `- ${boundary}`).join("\n")}

## Factual Profile

### Personal and Education
- Name: ${personal.name}
- Current role: ${personal.title}
- Location: ${personal.location.current}${personal.location.remote ? " (Remote available)" : ""}${personal.location.relocation ? " (Open to relocation)" : ""}
- Work Authorization: ${personal.workAuthorization ? `${personal.workAuthorization.status}${personal.workAuthorization.requiresSponsorship ? " (sponsorship required)" : " (no sponsorship required)"}` : "Not specified"}
- Education: ${education.current.degree} at ${education.current.institution} (graduated ${education.current.graduationDate})
- Achievements: ${education.achievements?.join(", ") || "N/A"}
- Bio: ${personal.bio}

### Technical Expertise
- Languages: ${skills.languages?.join(", ") || "N/A"}
- AI / LLM: ${skills.ai_llm?.join(", ") || "N/A"}
- Frameworks: ${skills.frameworks?.join(", ") || "N/A"}
- Data / Infra: ${skills.data_infra?.join(", ") || "N/A"}

### Professional Experience
${experience
  .map(
    (experienceItem) =>
      `- ${experienceItem.position} at ${experienceItem.company} (${experienceItem.duration}): ${experienceItem.description}${experienceItem.highlights?.length ? `\n${experienceItem.highlights.map((highlight) => `  - ${highlight}`).join("\n")}` : ""}`,
  )
  .join("\n")}

### Key Projects & Achievements
${
  featuredProjects
    .map(
      (project) =>
        `- ${project.title}: ${project.description}${project.achievements?.length ? `\n${project.achievements.map((achievement) => `  - ${achievement}`).join("\n")}` : ""}`,
    )
    .join("\n") || "No featured projects"
}

### Personality & Work Style
- Core Motivation: ${personality.motivation}
- Working Style: ${personality.workingStyle}
- Key Traits: ${personality.traits?.join(", ") || "N/A"}
- Professional Interests: ${personality.interests?.join(", ") || "N/A"}

### Career Goals & Availability
- Current Status: ${entryLevel.currentStatus}
- Focus Areas: ${entryLevel.focusAreas?.join(", ") || "N/A"}
- Career Goals: ${entryLevel.goals}
- Availability: ${entryLevel.availability}

## Grounded Answers for Common Questions

${aiProfile.frequentlyAskedQuestions
  .map((item) => `### ${item.question}\n${item.answer}`)
  .join("\n\n")}

## Tool Use

- Use getPresentation for a structured introduction, getProjects for project data, getSkills for technical breadth, getContact for contact details, getResume for the resume, and getEntryLevel for role fit and availability.
- Call a tool when its structured result materially helps the answer. Do not call tools only to repeat information already available above.
- After a tool call, always answer the visitor's actual question in natural language; do not leave a tool result without interpretation.
- If the user asks for confidential company information or an unsupported behavioral story, apply the evidence boundaries instead of guessing.
`;
  }

  // Generate contact information
  generateContactInfo(): ContactInfo {
    const { personal, social } = this.config;

    return {
      name: personal.name,
      email: personal.email,
      phone: personal.phone,
      handle: personal.handle,
      socials: [
        { name: "LinkedIn", url: social.linkedin },
        { name: "GitHub", url: social.github },
      ].filter((social) => social.url !== ""),
    };
  }

  // Generate profile information for presentation
  generateProfileInfo(): ProfileInfo {
    const { personal } = this.config;

    return {
      name: personal.name,
      location: personal.location,
      description: personal.bio,
      src: personal.avatar,
      fallbackSrc: personal.fallbackAvatar,
    };
  }

  // Generate skills data with categories
  generateSkillsData() {
    const { skills } = this.config;

    return [
      {
        category: "Languages",
        skills: skills.languages,
        color: "bg-blue-50 text-blue-600 border border-blue-200",
      },
      {
        category: "AI / LLM",
        skills: skills.ai_llm,
        color: "bg-purple-50 text-purple-600 border border-purple-200",
      },
      {
        category: "Frameworks",
        skills: skills.frameworks,
        color: "bg-green-50 text-green-600 border border-green-200",
      },
      {
        category: "Data / Infra",
        skills: skills.data_infra,
        color: "bg-emerald-50 text-emerald-600 border border-emerald-200",
      },
      {
        category: "Soft Skills",
        skills: skills.soft_skills,
        color: "bg-amber-50 text-amber-600 border border-amber-200",
      },
    ].filter((category) => category.skills && category.skills.length > 0);
  }

  // Generate project data for carousel
  generateProjectData() {
    return this.config.projects.map((project) => ({
      category: project.category,
      title: project.title,
      src: project.images?.[0]?.src || "/portfolio.png",
      content: project, // Pass the entire project object
    }));
  }

  // Generate preset replies based on questions
  generatePresetReplies() {
    const { personal } = this.config;

    const replies: Record<string, { reply: string; tool: string }> = {};

    // Only generate presets for main category questions
    replies["Who are you?"] = {
      reply: personal.bio,
      tool: "getPresentation",
    };

    replies["What are your skills?"] = {
      reply: `My technical expertise spans multiple domains...`,
      tool: "getSkills",
    };

    replies["What projects are you most proud of?"] = {
      reply: `Here are some of my key projects...`,
      tool: "getProjects",
    };

    replies["Can I see your resume?"] = {
      reply: `Here's my resume with all the details...`,
      tool: "getResume",
    };

    replies["How can I reach you?"] = {
      reply: `Here's how you can reach me...`,
      tool: "getContact",
    };

    replies["Am I available for opportunities?"] = {
      reply: `Here are my current opportunities and availability...`,
      tool: "getEntryLevel",
    };

    return replies;
  }

  // Generate resume details
  generateResumeDetails() {
    return this.config.resume;
  }

  // Generate entry-level information
  generateEntryLevelInfo() {
    const { entryLevel, personal, social } = this.config;

    if (!entryLevel.seeking) {
      return "I'm not currently seeking entry-level opportunities.";
    }

    return `Here's what I'm looking for 👇

- 📌 **Status**: ${entryLevel.currentStatus}
- 🧑‍💻 **Focus**: ${entryLevel.focusAreas?.join(", ") || "N/A"}
- 🛠️ **Working Style**: ${entryLevel.workStyle}
- 🎯 **Goals**: ${entryLevel.goals}

📬 **Contact me** via:
- Email: ${personal.email}
- LinkedIn: ${social.linkedin}
- GitHub: ${social.github}

${entryLevel.availability} ✌️`;
  }

  // Get all configuration data
  getConfig(): PortfolioConfig {
    return this.config;
  }
}

export default ConfigParser;
