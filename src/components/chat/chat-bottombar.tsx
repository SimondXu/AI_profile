"use client";

import { ChatRequestOptions } from "ai";
import { ArrowRight, Square } from "lucide-react";
import React, { useEffect, useRef } from "react";

interface ChatBottombarProps {
  handleInputChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleSubmit: (
    event: React.FormEvent<HTMLFormElement>,
    chatRequestOptions?: ChatRequestOptions,
  ) => void;
  isLoading: boolean;
  stop: () => void;
  input: string;
  isToolInProgress: boolean;
}

const MAX_TEXTAREA_HEIGHT = 144; // ~6 lines

export default function ChatBottombar({
  input,
  handleInputChange,
  handleSubmit,
  isLoading,
  stop,
  isToolInProgress,
}: ChatBottombarProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // Auto-grow the textarea (up to ~6 lines) as its content changes,
  // including when it's cleared back to empty after a submit.
  useEffect(() => {
    const element = textareaRef.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${Math.min(element.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`;
  }, [input]);

  // ChatBottombar's exposed prop signature stays exactly as chat.tsx expects
  // it (handleInputChange takes an <input> change event); adapt the
  // <textarea> event to that shape here rather than changing chat.tsx.
  const handleTextareaChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    handleInputChange(
      event as unknown as React.ChangeEvent<HTMLInputElement>,
    );
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      formRef.current?.requestSubmit();
    }
  };

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="flex items-end gap-2"
    >
      <label className="sr-only" htmlFor="chat-question">
        Ask about experience or projects
      </label>
      <textarea
        id="chat-question"
        ref={textareaRef}
        rows={1}
        value={input}
        onChange={handleTextareaChange}
        onKeyDown={handleKeyDown}
        placeholder={isToolInProgress ? "Preparing a response" : "Ask about experience or projects"}
        disabled={isToolInProgress || isLoading}
        className="min-h-11 flex-1 resize-none rounded-[10px] border border-input bg-background px-4 py-2.5 text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-60"
      />
      <button
        type={isLoading ? "button" : "submit"}
        disabled={!isLoading && (!input.trim() || isToolInProgress)}
        aria-label={isLoading ? "Stop response" : "Send question"}
        onClick={(event) => {
          if (!isLoading) return;
          event.preventDefault();
          stop();
        }}
        className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] bg-accent text-accent-foreground transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-40"
      >
        {isLoading ? <Square aria-hidden="true" className="h-4 w-4" /> : <ArrowRight aria-hidden="true" className="h-4 w-4" />}
      </button>
    </form>
  );
}
