# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Essential Commands
- `pnpm dev` - Start development server (localhost:3000)
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint

### Environment Setup
- Copy `.env.example` to `.env.local`
- Add `OPENROUTER_API_KEY` for AI chatbot functionality
- Optional: set `OPENROUTER_MODEL` (defaults to `deepseek/deepseek-v4.1-flash`; reasoning effort is fixed at `low`) and `OPENROUTER_PROVIDER_ORDER` (defaults to `fireworks`)
- Optional: `NEXT_PUBLIC_SITE_URL` for custom domain

## Architecture Overview

This is an AI-powered portfolio website built with Next.js 15 that operates through a **single JSON configuration file** (`portfolio-config.json`). The entire website content, including personal info, projects, skills, and AI chatbot personality, is driven by this configuration file.

### Core Architecture Concept
- **Configuration-Driven**: Everything is defined in `portfolio-config.json` - no code changes needed for content updates
- **AI Integration**: OpenRouter powers an intelligent chatbot that responds as the portfolio owner
- **Type-Safe**: Full TypeScript implementation with comprehensive type definitions

### Key Directories
- `src/lib/` - Configuration loading and parsing logic (`config-loader.ts`, `config-parser.ts`)
- `src/types/portfolio.ts` - Complete TypeScript definitions for portfolio configuration
- `src/app/api/chat/` - AI chatbot API with tool-based responses
- `src/components/` - Reusable UI components for portfolio sections
- `portfolio-config.json` - **Single source of truth** for all content

### Configuration System
The `portfolio-config.json` file contains structured data for:
- Personal information and bio
- Education and achievements  
- Professional experience
- Technical skills (categorized)
- Project portfolio with images and links
- Social media links
- Internship/job seeking status
- AI chatbot personality and preset questions

### AI Chatbot Architecture
- **System Prompt Generation**: `config-parser.ts` creates AI personality from JSON config
- **Tool-Based Responses**: 6 specialized tools (`getPresentation`, `getProjects`, `getSkills`, `getContact`, `getResume`, `getEntryLevel`)
- **Interview Simulation**: AI responds as the portfolio owner in professional contexts
- **Error Handling**: Graceful degradation when API unavailable

### Component Architecture
- **Config-Driven Components**: All components read from parsed configuration
- **Presentation Sections**: Skills, projects, contact, resume components map directly to config structure
- **Chat System**: Real-time chat with AI using Vercel AI SDK and tools
- **Theme Support**: Light/dark mode with `next-themes`

## Development Patterns

### Adding New Content
1. Update `portfolio-config.json` - no code changes required
2. For new sections: Add to TypeScript types in `src/types/portfolio.ts`
3. Create corresponding components that read from config

### AI Chatbot Customization
- Modify chatbot personality in `portfolio-config.json`
- Add new tools in `src/app/api/chat/tools/` if needed
- Update system prompt generation in `config-parser.ts`

### Image Management
- Place images in `public/` directory
- Reference with `/filename.jpg` in config
- External URLs supported for remote hosting

### Styling
- Tailwind CSS with custom configuration
- Radix UI components for accessibility
- Framer Motion for animations
- shadcn/ui design system

## Important Implementation Details

- **No Database**: All data comes from JSON configuration
- **Serverless Deployment**: Optimized for Vercel deployment
- **Mobile-First**: Responsive design with mobile optimization
- **SEO Optimized**: Comprehensive metadata and structured data
- **Performance**: Next.js optimizations with image optimization
- **Accessibility**: WCAG compliant with Radix UI components
