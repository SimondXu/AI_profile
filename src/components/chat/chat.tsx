"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, isToolOrDynamicToolUIPart } from "ai";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ChatBottombar from "@/components/chat/chat-bottombar";
import ChatLanding from "@/components/chat/chat-landing";
import ChatMessageContent from "@/components/chat/chat-message-content";
import HelperBoost from "@/components/chat/HelperBoost";
import { SimplifiedChatView } from "@/components/chat/simple-chat-view";
import { ChatBubble, ChatBubbleMessage } from "@/components/ui/chat/chat-bubble";
import MessageLoading from "@/components/ui/chat/message-loading";
import { getTrackingSessionId } from "@/components/tracking/session-id";

const SCROLL_BOTTOM_THRESHOLD = 80;
const SCROLL_UP_TOLERANCE = 1;

export default function Chat() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q");
  const [input, setInput] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const initialQuerySent = useRef(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);
  const shouldFollowRef = useRef(true);
  const lastScrollTopRef = useRef(0);
  const [composerHeight, setComposerHeight] = useState(96);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: {
          trackingSessionId: getTrackingSessionId(),
          trackingPathname: "/chat",
        },
      }),
    [],
  );
  const { messages, sendMessage, stop, regenerate, status } = useChat({
    transport,
    onError: () => setErrorMessage("Chat is unavailable."),
  });

  const isLoading = status === "submitted" || status === "streaming";
  const lastAssistantMessageIndex = useMemo(
    () => messages.findLastIndex((message) => message.role === "assistant"),
    [messages],
  );
  const followUpQuestionOffset = useMemo(
    () =>
      Math.max(
        0,
        messages.filter((message) => message.role === "assistant").length - 1,
      ) * 3,
    [messages],
  );
  const isToolInProgress = useMemo(
    () =>
      messages.some(
        (message) =>
          message.role === "assistant" &&
          message.parts?.some(
            (part) =>
              isToolOrDynamicToolUIPart(part) &&
              part.state !== "output-available",
          ),
      ),
    [messages],
  );

  const submitQuery = useCallback(
    (query: string) => {
      const text = query.trim();
      if (!text || isLoading || isToolInProgress) return;
      setErrorMessage(null);
      shouldFollowRef.current = true;
      sendMessage({ text });
    },
    [isLoading, isToolInProgress, sendMessage],
  );

  useEffect(() => {
    if (!initialQuery || initialQuerySent.current) return;
    initialQuerySent.current = true;
    submitQuery(initialQuery);
  }, [initialQuery, submitQuery]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!input.trim() || isLoading || isToolInProgress) return;
    submitQuery(input);
    setInput("");
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInput(event.target.value);
  };

  const handleChatScroll = () => {
    const container = chatScrollRef.current;
    if (!container) return;

    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    if (distanceFromBottom <= SCROLL_BOTTOM_THRESHOLD) {
      shouldFollowRef.current = true;
    } else if (
      container.scrollTop < lastScrollTopRef.current - SCROLL_UP_TOLERANCE
    ) {
      shouldFollowRef.current = false;
    }

    lastScrollTopRef.current = container.scrollTop;
  };

  useEffect(() => {
    if (
      !shouldFollowRef.current ||
      (messages.length === 0 && !isLoading && !errorMessage)
    ) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      const container = chatScrollRef.current;
      if (container && shouldFollowRef.current) {
        container.scrollTop = container.scrollHeight;
      }
    });

    return () => cancelAnimationFrame(frame);
  }, [messages, status, isLoading, errorMessage]);

  // Keep the scroll region's bottom padding equal to the composer's actual
  // height so a tall (auto-grown) composer never covers the last message.
  useEffect(() => {
    const element = composerRef.current;
    if (!element) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setComposerHeight(entry.contentRect.height);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="flex h-[calc(100dvh-4rem)] flex-col">
      <div
        ref={chatScrollRef}
        className="min-h-0 flex-1 overflow-y-auto"
        aria-live="polite"
        onScroll={handleChatScroll}
      >
        {messages.length === 0 && !isLoading ? (
          <ChatLanding submitQuery={submitQuery} />
        ) : (
          <div
            className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 pt-6 sm:px-6"
            style={{ paddingBottom: composerHeight + 24 }}
          >
            {messages.map((message, index) =>
              message.role === "user" ? (
                <div key={message.id ?? index} className="flex justify-end">
                  <ChatBubble variant="sent">
                    <ChatBubbleMessage>
                      <ChatMessageContent message={message} />
                    </ChatBubbleMessage>
                  </ChatBubble>
                </div>
              ) : message.role === "assistant" ? (
                <SimplifiedChatView
                  key={message.id ?? index}
                  message={message}
                  isLoading={isLoading && index === lastAssistantMessageIndex}
                />
              ) : null,
            )}
            {isLoading && lastAssistantMessageIndex === -1 ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <MessageLoading />
              </div>
            ) : null}
            {errorMessage ? (
              <div
                className="max-w-prose rounded-[10px] border border-border bg-surface px-4 py-3 text-sm text-foreground"
                role="alert"
              >
                <p>Chat is unavailable.</p>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setErrorMessage(null);
                      regenerate();
                    }}
                    className="rounded-[10px] border border-input px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-surface-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    Try again
                  </button>
                  <Link href="/resume" className="text-accent underline-offset-4 hover:underline">
                    View resume
                  </Link>
                  <a
                    href="mailto:edisonapply@gmail.com"
                    className="text-accent underline-offset-4 hover:underline"
                  >
                    Email Simon
                  </a>
                </div>
              </div>
            ) : null}
            {!isLoading ? (
              <HelperBoost
                submitQuery={submitQuery}
                questionOffset={followUpQuestionOffset}
              />
            ) : null}
          </div>
        )}
      </div>
      <div
        ref={composerRef}
        className="sticky bottom-0 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
      >
        <div className="mx-auto w-full max-w-3xl px-4 py-3 sm:px-6">
          <ChatBottombar
            input={input}
            handleInputChange={handleInputChange}
            handleSubmit={handleSubmit}
            isLoading={isLoading}
            stop={stop}
            isToolInProgress={isToolInProgress}
          />
        </div>
      </div>
    </div>
  );
}
