import { tool } from 'ai';
import { z } from 'zod';
import { getConfig } from '@/lib/config-loader';

export const getSkills = tool({
  description:
    'This tool provides a comprehensive overview of technical skills, expertise, and professional qualifications.',
  inputSchema: z.object({}),
  execute: async () => {
    const config = getConfig();
    
    return {
      technicalSkills: {
        languages: config.skills.languages,
        aiLlm: config.skills.ai_llm,
        frameworks: config.skills.frameworks,
        dataInfra: config.skills.data_infra,
      },
      education: {
        degree: config.education.current.degree,
        institution: config.education.current.institution,
        duration: config.education.current.duration
      },
      achievements: config.education.achievements || [],
      experience: config.experience.map(exp => ({
        position: exp.position,
        company: exp.company,
        duration: exp.duration,
        type: exp.type,
        technologies: exp.technologies,
        description: exp.description
      })),
    };
  },
});
