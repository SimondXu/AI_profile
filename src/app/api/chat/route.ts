import { createOpenAI } from "@ai-sdk/openai";
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
  convertToModelMessages,
  stepCountIs,
} from "ai";
import { z } from "zod";
import { createHash } from "node:crypto";

import { systemPrompt } from "@/lib/config-loader";
import { getFallbackAnswer } from "./fallback";
import { getContact } from "./tools/getContact";
import { getEntryLevel } from "./tools/getEntryLevel";
import { getPresentation } from "./tools/getPresentation";
import { getProjects } from "./tools/getProjects";
import { getResume } from "./tools/getResume";
import { getSkills } from "./tools/getSkills";
import { getTrustedClientIp } from "@/lib/tracking/client-ip";
import { isTrackingSameOrigin } from "@/lib/tracking/request-validation";
import { recordChatPrompt } from "@/lib/tracking/service";

export const maxDuration = 30;

const MAX_MESSAGES = 20;
const MAX_TEXT_CHARS = 12_000;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 20;
const HOUR_MS = 60 * 60_000;
const DAY_MS = 24 * HOUR_MS;
const DEFAULT_MAX_OUTPUT_TOKENS = 1024;
const UNTRUSTED_CLIENT_ID = "untrusted";

type RateLimitEntry = { count: number; resetAt: number };

const rateLimitStore = new Map<string, RateLimitEntry>();
const globalRateLimitStore = new Map<string, RateLimitEntry>();

function parsePositiveInt(value: string | undefined, fallback: number) {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

const CHAT_GLOBAL_MAX_PER_HOUR = parsePositiveInt(
  process.env.CHAT_GLOBAL_MAX_PER_HOUR,
  300,
);
const CHAT_GLOBAL_MAX_PER_DAY = parsePositiveInt(
  process.env.CHAT_GLOBAL_MAX_PER_DAY,
  1500,
);
const MAX_OUTPUT_TOKENS = parsePositiveInt(
  process.env.OPENROUTER_MAX_OUTPUT_TOKENS,
  DEFAULT_MAX_OUTPUT_TOKENS,
);

const chatRequestSchema = z.object({
  messages: z
    .array(
      z
        .object({
          id: z.string().optional(),
          role: z.enum(["system", "user", "assistant"]),
          parts: z
            .array(
              z
                .object({
                  type: z.string(),
                  text: z.string().optional(),
                })
                .passthrough(),
            )
            .default([]),
        })
        .passthrough(),
    )
    .min(1)
    .max(MAX_MESSAGES),
  trackingSessionId: z.string().uuid().optional(),
  trackingPathname: z.string().regex(/^\/[a-zA-Z0-9/_-]*$/).max(160).optional(),
});

const openrouter = createOpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
  headers: {
    "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
    "X-Title": "Simon Xu Portfolio",
  },
});

const openrouterModel =
  process.env.OPENROUTER_MODEL || "openai/gpt-5.6-luna";

function getClientIdentifier(req: Request) {
  const ip = getTrustedClientIp(req);
  if (ip === "unknown") return UNTRUSTED_CLIENT_ID;
  return createHash("sha256").update(ip).digest("hex");
}

function pruneExpired(store: Map<string, RateLimitEntry>, now: number) {
  for (const [key, entry] of store) {
    if (entry.resetAt <= now) store.delete(key);
  }
}

/** Fixed-window counter; returns true once the window's count exceeds `max`. */
function consumeWindow(
  store: Map<string, RateLimitEntry>,
  key: string,
  windowMs: number,
  max: number,
  now: number,
) {
  const current = store.get(key);

  if (!current || current.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }

  current.count += 1;
  return current.count > max;
}

function getRateLimitReason(clientId: string) {
  const now = Date.now();
  pruneExpired(rateLimitStore, now);
  pruneExpired(globalRateLimitStore, now);

  if (
    consumeWindow(
      rateLimitStore,
      clientId,
      RATE_LIMIT_WINDOW_MS,
      RATE_LIMIT_MAX_REQUESTS,
      now,
    )
  ) {
    return "per-client limit";
  }
  if (
    consumeWindow(
      globalRateLimitStore,
      "hour",
      HOUR_MS,
      CHAT_GLOBAL_MAX_PER_HOUR,
      now,
    )
  ) {
    return "global hourly limit";
  }
  if (
    consumeWindow(
      globalRateLimitStore,
      "day",
      DAY_MS,
      CHAT_GLOBAL_MAX_PER_DAY,
      now,
    )
  ) {
    return "global daily limit";
  }
  return null;
}

function getTotalTextLength(
  messages: z.infer<typeof chatRequestSchema>["messages"],
) {
  return messages.reduce((total, message) => {
    const messageText = message.parts.reduce((partTotal, part) => {
      if (part.type !== "text" || !part.text) {
        return partTotal;
      }

      return partTotal + part.text.length;
    }, 0);

    return total + messageText;
  }, 0);
}

function getLastUserText(
  messages: z.infer<typeof chatRequestSchema>["messages"],
) {
  const lastUserMessage = messages.findLast(
    (message) => message.role === "user",
  );

  return (
    lastUserMessage?.parts
      .filter(
        (part): part is typeof part & { text: string } =>
          part.type === "text" && typeof part.text === "string",
      )
      .map((part) => part.text)
      .join("\n") ?? ""
  );
}

function createFallbackResponse(question: string) {
  const answer = getFallbackAnswer(question);
  const textPartId = "fallback-answer";
  const stream = createUIMessageStream({
    execute: ({ writer }) => {
      writer.write({ type: "start" });
      writer.write({ type: "start-step" });
      writer.write({ type: "text-start", id: textPartId });
      writer.write({ type: "text-delta", id: textPartId, delta: answer });
      writer.write({ type: "text-end", id: textPartId });
      writer.write({ type: "finish-step" });
      writer.write({ type: "finish", finishReason: "stop" });
    },
  });

  return createUIMessageStreamResponse({ stream });
}

export async function POST(req: Request) {
  if (!isTrackingSameOrigin(req)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const rateLimitReason = getRateLimitReason(getClientIdentifier(req));

    const body = await req.json();
    const parsedBody = chatRequestSchema.safeParse(body);

    if (!parsedBody.success) {
      return new Response("Invalid chat request payload.", { status: 400 });
    }

    const { messages, trackingSessionId, trackingPathname } = parsedBody.data;
    const totalTextLength = getTotalTextLength(messages);

    if (totalTextLength > MAX_TEXT_CHARS) {
      return new Response(
        "Chat request is too large. Please shorten your message.",
        {
          status: 413,
        },
      );
    }

    const lastUserText = getLastUserText(messages).trim();
    if (trackingSessionId && lastUserText) {
      recordChatPrompt(req, {
        sessionId: trackingSessionId,
        pathname: trackingPathname ?? "/chat",
        prompt: lastUserText,
      });
    }

    if (rateLimitReason) {
      console.warn(`[CHAT-API] Rate limited (${rateLimitReason}), serving local fallback`);
      return createFallbackResponse(lastUserText);
    }

    if (!process.env.OPENROUTER_API_KEY) {
      console.info("[CHAT-API] Using local portfolio fallback", {
        messageCount: messages.length,
        totalTextLength,
      });
      return createFallbackResponse(lastUserText);
    }

    console.info("[CHAT-API] Request accepted", {
      messageCount: messages.length,
      totalTextLength,
      model: openrouterModel,
    });

    // Add tools
    const tools = {
      getProjects,
      getPresentation,
      getResume,
      getContact,
      getSkills,
      getEntryLevel,
    };

    const baseConfig = {
      system: systemPrompt,
      messages: convertToModelMessages(
        messages as Parameters<typeof convertToModelMessages>[0],
      ),
      tools,
      stopWhen: stepCountIs(5),
      maxOutputTokens: MAX_OUTPUT_TOKENS,
    };

    const result = streamText({
      model: openrouter.chat(openrouterModel),
      ...baseConfig,
      providerOptions: {
        openai: {
          reasoningEffort: "medium",
        },
      },
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error("[CHAT-API] Request failed");

    if (error instanceof Error && error.message?.includes("network")) {
      return new Response(
        "Network error. Please check your connection and try again.",
        { status: 503 },
      );
    }

    return new Response("Internal Server Error. Please try again later.", {
      status: 500,
    });
  }
}
