import { tool } from 'ai';
import { z } from 'zod';
import { getConfig } from '@/lib/config-loader';

export const getEntryLevel = tool({
  description: 'Provides documented information about Simon\'s current role, target work, availability, location, and work authorization.',
  inputSchema: z.object({}),
  execute: async () => {
    const config = getConfig();
    
    // Get current professional experience
    const currentExperience = config.experience.find(exp => exp.type === "Full-time");
    
    return {
      currentStatus: config.entryLevel.currentStatus,
      availability: config.entryLevel.availability,
      preferences: {
        roleTypes: config.entryLevel.focusAreas,
        remote: config.personal.location.remote,
        relocation: config.personal.location.relocation,
        preferredLocations: config.personal.location.preferredLocations,
        currentLocation: config.personal.location.current
      },
      workAuthorization: config.personal.workAuthorization,
      experience: {
        currentPosition: currentExperience 
          ? `${currentExperience.position} at ${currentExperience.company} (${currentExperience.duration})`
          : "Currently employed in software engineering role",
        currentResponsibilities: currentExperience?.description || '',
        documentedHighlights: currentExperience?.highlights || []
      },
      skills: {
        technical: [
          ...config.skills.languages,
          ...config.skills.ai_llm,
          ...config.skills.frameworks,
          ...config.skills.data_infra
        ],
        soft: config.skills.soft_skills
      },
      achievements: config.education.achievements || [],
      lookingFor: {
        focusAreas: config.entryLevel.focusAreas,
        goals: config.entryLevel.goals,
        motivation: config.personality.motivation
      },
      contact: {
        email: config.personal.email,
        linkedin: config.social.linkedin,
        github: config.social.github,
        portfolio: "This AI-powered portfolio showcases my projects and skills"
      },
      personality: {
        traits: config.personality.traits,
        funFacts: config.personality.funFacts,
        workingStyle: config.personality.workingStyle
      }
    };
  },
});
