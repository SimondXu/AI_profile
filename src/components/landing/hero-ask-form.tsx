"use client";

import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useId, useState } from "react";

interface HeroAskFormProps {
  placeholder: string;
  label: string;
}

/**
 * Small hero-level shortcut into the Ask experience. Never calls the chat
 * API directly — it only routes to /chat with the question pre-filled.
 */
export function HeroAskForm({ placeholder, label }: HeroAskFormProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const inputId = useId();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    router.push(`/chat?q=${encodeURIComponent(trimmed)}`);
  };

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-md flex-col gap-2">
      <label
        htmlFor={inputId}
        className="text-sm font-medium text-foreground"
      >
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          id={inputId}
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={placeholder}
          className="min-h-11 flex-1 rounded-[10px] border border-input bg-surface px-4 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        />
        <button
          type="submit"
          aria-label="Ask"
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] bg-accent text-accent-foreground transition-colors hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <ArrowRight className="h-[18px] w-[18px]" aria-hidden="true" />
        </button>
      </div>
    </form>
  );
}
