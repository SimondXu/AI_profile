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
  const shouldFollowRef = useRef(true);
  const lastScrollTopRef = useRef(0);

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
  const { messages, sendMessage, stop, regenerate, addToolResult, status } = useChat({
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

  return (
    <div className="quiet-page quiet-chat-page">
      <div className="quiet-chat-main">
        <div
          ref={chatScrollRef}
          className="quiet-chat-scroll"
          aria-live="polite"
          onScroll={handleChatScroll}
        >
          {messages.length === 0 && !isLoading ? (
            <ChatLanding submitQuery={submitQuery} />
          ) : (
            <div className="quiet-chat-thread">
              {messages.map((message, index) =>
                message.role === "user" ? (
                  <div key={message.id ?? index} className="quiet-user-message">
                    <ChatBubble variant="sent">
                      <ChatBubbleMessage>
                        <ChatMessageContent
                          message={message}
                          isLast
                          isLoading={false}
                          reload={regenerate}
                        />
                      </ChatBubbleMessage>
                    </ChatBubble>
                  </div>
                ) : message.role === "assistant" ? (
                  <SimplifiedChatView
                    key={message.id ?? index}
                    message={message}
                    isLoading={isLoading && index === lastAssistantMessageIndex}
                    reload={regenerate}
                    addToolResult={addToolResult}
                  />
                ) : null,
              )}
              {isLoading && lastAssistantMessageIndex === -1 ? (
                <div className="quiet-assistant-status">Thinking...</div>
              ) : null}
              {errorMessage ? (
                <div className="quiet-chat-error" role="alert">
                  <p>Chat is unavailable.</p>
                  <div>
                    <Link href="/resume">View resume</Link>
                    <a href="mailto:edisonapply@gmail.com">Email Simon</a>
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
        <div className="quiet-chat-composer">
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
