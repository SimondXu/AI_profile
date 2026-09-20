import { tool } from 'ai';
import { z } from 'zod';
import { getConfig } from '@/lib/config-loader';

export const getPresentation = tool({
  description:
    'Provides Simon\'s professional introduction, positioning, work style, and documented background.',
  inputSchema: z.object({}),
  execute: async () => {
    const config = getConfig();
    
    return {
      presentation: config.personal.bio,
      name: config.personal.name,
      title: config.personal.title,
      location: config.personal.location.current,
      education: config.education.current,
      traits: config.personality?.traits || [],
      interests: config.personality?.interests || [],
      motivation: config.personality?.motivation || '',
      positioning: config.aiProfile.positioning,
      workingStyle: config.personality.workingStyle,
      signatureBeliefs: config.aiProfile.signatureBeliefs,
      responseModes: config.aiProfile.responseModes
    };
  },
});
