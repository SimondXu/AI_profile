"use client";

import Image from "next/image";
import { AiStatusPill } from "@/components/landing/ai-status-pill";
import { getConfig } from "@/lib/config-loader";

interface ChatLandingProps {
  submitQuery: (message: string) => void;
}

const config = getConfig();

/** Real question groups from the config, shown as labelled starter decks. */
const decks: Array<{ label: string; questions: string[] }> = [
  { label: "Start here", questions: config.aiProfile.featuredQuestions.slice(0, 3) },
  { label: "Projects", questions: config.presetQuestions.projects.slice(0, 3) },
  { label: "Working with me", questions: config.presetQuestions.professional.slice(0, 3) },
  { label: "Off the clock", questions: config.presetQuestions.fun.slice(0, 3) },
].filter((deck) => deck.questions.length > 0);

export default function ChatLanding({ submitQuery }: ChatLandingProps) {
  return (
    <section
      className="mx-auto flex w-full max-w-3xl flex-col items-center gap-5 px-4 pt-12 text-center sm:px-6 sm:pt-16"
      aria-labelledby="chat-title"
    >
      <div className="reveal rounded-[14px] bg-material-paper p-1.5 shadow-[0_1px_2px_rgba(0,0,0,0.12),0_14px_32px_-18px_rgba(0,0,0,0.45)] rotate-[-3deg]">
        <Image
          src={config.personal.avatar}
          alt={config.personal.name}
          width={80}
          height={80}
          className="h-20 w-20 rounded-[10px] object-cover"
          priority
        />
      </div>
      <div className="reveal flex flex-col items-center gap-3" style={{ animationDelay: "60ms" }}>
        <h1 id="chat-title" className="font-display text-[32px] font-semibold leading-tight tracking-tight text-foreground">
          Ask about my work
        </h1>
        <p className="max-w-prose text-[15px] text-muted-foreground">
          Answers come from my experience, projects, and resume — nothing made up.
        </p>
        <AiStatusPill />
      </div>

      <div
        className="reveal mt-2 grid w-full gap-4 text-left sm:grid-cols-2"
        style={{ animationDelay: "120ms" }}
        aria-label="Suggested questions"
      >
        {decks.map((deck) => (
          <div
            key={deck.label}
            className="flex flex-col gap-2 rounded-[18px] border border-border bg-surface/70 p-4 backdrop-blur"
          >
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              {deck.label}
            </p>
            {deck.questions.map((question) => (
              <button
                key={question}
                type="button"
                onClick={() => submitQuery(question)}
                className="rounded-[10px] px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-accent-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                {question}
              </button>
            ))}
          </div>
        ))}
      </div>

      <p className="font-mono text-[11px] text-muted-foreground">
        Tip: press ⌘K on any page to ask from there
      </p>
    </section>
  );
}
