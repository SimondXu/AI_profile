import { PortfolioConfig } from '../types/portfolio';
import ConfigParser from './config-parser';
import { portfolioConfigSchema } from './config-schema';

// Import the configuration file - using JSON import for better compatibility
import portfolioConfigData from '../../portfolio-config.json';

/**
 * Portfolio Configuration Loader
 * 
 * Provides centralized access to portfolio configuration with error handling
 * Implements singleton pattern for consistent data access across the application
 */

// Initialize configuration with fallback error handling
let portfolioConfig: PortfolioConfig;

try {
  const parsedConfig = portfolioConfigSchema.safeParse(portfolioConfigData);

  if (!parsedConfig.success) {
    console.error(
      'Invalid portfolio configuration:',
      parsedConfig.error.flatten()
    );
    throw new Error('Invalid portfolio configuration');
  }

  portfolioConfig = parsedConfig.data as PortfolioConfig;
} catch (error) {
  console.error('Failed to load portfolio configuration:', error);
  // Provide a fallback minimal config to prevent the app from crashing
  portfolioConfig = {
    personal: {
      name: 'Configuration Error',
      age: 0,
      location: {
        current: 'Unknown',
        remote: false,
        relocation: false,
        preferredLocations: [],
        timezone: 'Unknown'
      },
      title: 'Error Loading Config',
      email: 'error@example.com',
      handle: '@error',
      bio: 'Configuration file could not be loaded',
      avatar: '/avatar.png',
      fallbackAvatar: '/avatar.png'
    },
    education: {
      current: {
        degree: 'Error',
        institution: 'Error',
        duration: 'Error',
        cgpa: 'Error',
        graduationDate: 'Error'
      },
      achievements: []
    },
    experience: [],
    skills: {
      languages: [],
      ai_llm: [],
      frameworks: [],
      data_infra: [],
      soft_skills: []
    },
    projects: [],
    social: {
      linkedin: '',
      github: '',
    },
    entryLevel: {
      seeking: false,
      currentStatus: '',
      focusAreas: [],
      availability: '',
      workStyle: '',
      goals: ''
    },
    personality: {
      traits: [],
      interests: [],
      funFacts: [],
      workingStyle: '',
      motivation: ''
    },
    aiProfile: {
      positioning: '',
      voice: {
        traits: [],
        defaultLength: '',
        technicalDepth: '',
        conversationStyle: '',
        avoid: []
      },
      responseModes: [],
      naturalLanguageHabits: [],
      signatureBeliefs: [],
      unknownAnswerStyle: '',
      answerPrinciples: [],
      evidenceBoundaries: [],
      featuredQuestions: [],
      followUpQuestions: [],
      frequentlyAskedQuestions: []
    },
    resume: {
      title: '',
      description: '',
      fileType: '',
      lastUpdated: '',
      fileSize: '',
      downloadUrl: '',
      pdfUrl: ''
    },
    chatbot: {
      name: '',
      personality: '',
      tone: '',
      language: '',
      responseStyle: '',
      useEmojis: false,
      topics: []
    },
    presetQuestions: {
      me: [],
      professional: [],
      projects: [],
      contact: [],
      fun: []
    },
    meta: {
      configVersion: '',
      lastUpdated: '',
      generatedBy: '',
      description: ''
    }
  } as PortfolioConfig;
}

// Create a parser instance
const configParser = new ConfigParser(portfolioConfig);

/**
 * Configuration access functions
 * 
 * Provides safe access to portfolio configuration with fallback handling
 * All exports use the singleton pattern for consistent data access
 */

export const getConfig = (): PortfolioConfig => portfolioConfig;
export const getConfigParser = (): ConfigParser => configParser;

// Export pre-parsed common data for easy access
export const systemPrompt = configParser.generateSystemPrompt();
export const contactInfo = configParser.generateContactInfo();
export const profileInfo = configParser.generateProfileInfo();
export const skillsData = configParser.generateSkillsData();
export const projectData = configParser.generateProjectData();
export const presetReplies = configParser.generatePresetReplies();
export const resumeDetails = configParser.generateResumeDetails();
export const entryLevelInfo = configParser.generateEntryLevelInfo();
