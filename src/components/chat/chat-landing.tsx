"use client";

import Image from "next/image";
import { getConfig } from "@/lib/config-loader";

interface ChatLandingProps {
  submitQuery: (message: string) => void;
}

const config = getConfig();
const suggestedQuestions = config.aiProfile.featuredQuestions;

export default function ChatLanding({ submitQuery }: ChatLandingProps) {
  return (
    <section
      className="mx-auto flex w-full max-w-3xl flex-col items-center gap-4 px-4 pt-16 text-center sm:px-6"
      aria-labelledby="chat-title"
    >
      <Image
        src={config.personal.avatar}
        alt={config.personal.name}
        width={64}
        height={64}
        className="rounded-full"
        priority
      />
      <h1 id="chat-title" className="font-display text-2xl font-semibold text-foreground">
        Ask about my work
      </h1>
      <p className="max-w-prose text-sm text-muted-foreground">
        Questions are answered from my experience, projects, and resume.
      </p>
      {suggestedQuestions.length ? (
        <div
          className="mt-2 flex w-full max-w-md flex-col gap-2"
          aria-label="Suggested questions"
        >
          {suggestedQuestions.map((question) => (
            <button
              key={question}
              type="button"
              onClick={() => submitQuery(question)}
              className="rounded-[10px] border border-border bg-surface px-4 py-2.5 text-left text-sm text-foreground transition-colors hover:border-input focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              {question}
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}
