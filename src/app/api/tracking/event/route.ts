import { z } from "zod";
import { isTrackingSameOrigin } from "@/lib/tracking/request-validation";
import { recordInteraction } from "@/lib/tracking/service";

const base = {
  sessionId: z.string().uuid(),
  pathname: z.string().regex(/^\/[a-zA-Z0-9/_-]*$/).max(160),
};

const musicDetail = z.object({
  title: z.string().max(160),
  artist: z.string().max(160),
  source: z.enum(["file", "youtube"]),
});

// One schema per browser-reported event: the shape of `target` and `detail`
// is what keeps arbitrary payloads out of the database.
const interactionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("music_play"), ...base, target: z.string().min(1).max(120), detail: musicDetail }),
  z.object({ type: z.literal("music_complete"), ...base, target: z.string().min(1).max(120), detail: musicDetail }),
  z.object({
    type: z.literal("outbound_click"),
    ...base,
    target: z.string().max(512).refine((value) => /^(https?:\/\/|mailto:|tel:)/.test(value)),
    detail: z.object({ text: z.string().max(80).nullable() }),
  }),
]);

export async function POST(request: Request) {
  if (!isTrackingSameOrigin(request)) return new Response(null, { status: 403 });
  try {
    const input = interactionSchema.safeParse(await request.json());
    if (input.success && !input.data.pathname.startsWith("/tracking")) {
      const { type, ...rest } = input.data;
      recordInteraction(request, { eventType: type, ...rest });
    }
  } catch {
    // Write-only endpoint: stays silent so tracking can never break an interaction.
  }
  return new Response(null, {
    status: 204,
    headers: { "Cache-Control": "no-store" },
  });
}
