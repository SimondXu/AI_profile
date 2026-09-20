export const dynamic = "force-dynamic";

/**
 * Tiny public status probe for the UI: is the portfolio AI backed by a real
 * model right now, or will /api/chat answer from the local fallback? Exposes
 * a boolean only — never the key or any configuration values.
 */
export async function GET() {
  return Response.json(
    { ai: Boolean(process.env.OPENROUTER_API_KEY) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
