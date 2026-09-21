import { z } from "zod";

export const portfolioConfigSchema = z
  .object({
    personal: z
      .object({
        name: z.string(),
        workAuthorization: z
          .object({
            status: z.string(),
            requiresSponsorship: z.boolean(),
            notes: z.string().optional(),
          })
          .optional(),
        location: z
          .object({
            current: z.string(),
            remote: z.boolean(),
            relocation: z.boolean(),
            preferredLocations: z.array(z.string()),
            timezone: z.string(),
          })
          .passthrough(),
        title: z.string(),
        email: z.string(),
        phone: z.string().optional(),
        handle: z.string(),
        bio: z.string(),
        avatar: z.string(),
        fallbackAvatar: z.string(),
      })
      .passthrough(),
    education: z
      .object({
        current: z
          .object({
            degree: z.string(),
            institution: z.string(),
            duration: z.string(),
            graduationDate: z.string(),
          })
          .passthrough(),
        achievements: z.array(z.string()),
      })
      .passthrough(),
    experience: z.array(
      z
        .object({
          company: z.string(),
          position: z.string(),
          type: z.string(),
          duration: z.string(),
          location: z.string().optional(),
          description: z.string(),
          highlights: z.array(z.string()).optional(),
          technologies: z.array(z.string()),
        })
        .passthrough(),
    ),
    skills: z
      .object({
        languages: z.array(z.string()),
        ai_llm: z.array(z.string()),
        frameworks: z.array(z.string()),
        data_infra: z.array(z.string()),
        soft_skills: z.array(z.string()),
      })
      .passthrough(),
    projects: z
      .array(
        z
          .object({
            slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
            title: z.string(),
            category: z.string(),
            track: z.enum(["ai-ml", "full-stack"]),
            summary: z.string(),
            description: z.string(),
            techStack: z.array(z.string()),
            date: z.string(),
            status: z.string(),
            featured: z.boolean(),
            achievements: z.array(z.string()).optional(),
            metrics: z.array(z.string()).optional(),
            links: z
              .array(
                z
                  .object({
                    name: z.string(),
                    url: z.string(),
                  })
                  .passthrough(),
              )
              .optional(),
            images: z
              .array(
                z
                  .object({
                    src: z.string(),
                    alt: z.string(),
                  })
                  .passthrough(),
              )
              .optional(),
          })
          .passthrough(),
      )
      .superRefine((projects, ctx) => {
        const seen = new Set<string>();
        projects.forEach((project, index) => {
          if (seen.has(project.slug)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `Duplicate project slug "${project.slug}"`,
              path: [index, "slug"],
            });
          }
          seen.add(project.slug);
        });
      }),
    social: z
      .object({
        linkedin: z.string(),
        github: z.string(),
      })
      .passthrough(),
    entryLevel: z
      .object({
        seeking: z.boolean(),
        currentStatus: z.string(),
        focusAreas: z.array(z.string()),
        availability: z.string(),
        workStyle: z.string(),
        goals: z.string(),
      })
      .passthrough(),
    personality: z
      .object({
        traits: z.array(z.string()),
        interests: z.array(z.string()),
        funFacts: z.array(z.string()),
        workingStyle: z.string(),
        motivation: z.string(),
      })
      .passthrough(),
    aiProfile: z
      .object({
        positioning: z.string(),
        voice: z.object({
          traits: z.array(z.string()),
          defaultLength: z.string(),
          technicalDepth: z.string(),
          conversationStyle: z.string(),
          avoid: z.array(z.string()),
        }),
        responseModes: z.array(
          z.object({
            audience: z.string(),
            guidance: z.string(),
          }),
        ),
        naturalLanguageHabits: z.array(z.string()),
        signatureBeliefs: z.array(z.string()),
        unknownAnswerStyle: z.string(),
        answerPrinciples: z.array(z.string()),
        evidenceBoundaries: z.array(z.string()),
        featuredQuestions: z.array(z.string()),
        followUpQuestions: z.array(z.string()),
        frequentlyAskedQuestions: z.array(
          z.object({
            question: z.string(),
            matchTerms: z.array(z.string()),
            answer: z.string(),
          }),
        ),
      })
      .passthrough(),
    resume: z
      .object({
        title: z.string(),
        description: z.string(),
        fileType: z.string(),
        lastUpdated: z.string(),
        fileSize: z.string(),
        downloadUrl: z.string(),
        pdfUrl: z.string().optional(),
      })
      .passthrough(),
    chatbot: z
      .object({
        name: z.string(),
        personality: z.string(),
        tone: z.string(),
        language: z.string(),
        responseStyle: z.string(),
        useEmojis: z.boolean(),
        topics: z.array(z.string()),
      })
      .passthrough(),
    presetQuestions: z
      .object({
        me: z.array(z.string()),
        professional: z.array(z.string()),
        projects: z.array(z.string()),
        contact: z.array(z.string()),
        fun: z.array(z.string()),
      })
      .passthrough(),
    meta: z
      .object({
        configVersion: z.string(),
        lastUpdated: z.string(),
        generatedBy: z.string(),
        description: z.string(),
      })
      .passthrough(),
  })
  .passthrough();
