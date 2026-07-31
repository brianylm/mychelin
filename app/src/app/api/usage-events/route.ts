import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { requestPath, trackUsageEvent, type UsageEventName } from "@/lib/usage-events";

export const runtime = "edge";
export const preferredRegion = "hnd1";

// Client-emittable usage events. trackUsageEvent itself is server-only,
// so low-stakes client events (viewed a card, exported) go through this
// route with a strict allowlist — no arbitrary event names or freeform
// properties from the client.
const CLIENT_EVENT_NAMES: ReadonlySet<UsageEventName> = new Set([
  "cooking_card_viewed",
  "cooking_card_export_png",
  "cooking_card_export_copy",
]);

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const eventName = body?.eventName as UsageEventName | undefined;
    if (!eventName || !CLIENT_EVENT_NAMES.has(eventName)) {
      return NextResponse.json({ error: "Unknown event" }, { status: 400 });
    }
    const recipeId = Number.isInteger(body?.recipeId) ? Number(body.recipeId) : null;

    await trackUsageEvent({
      userId: currentUser.id,
      eventName,
      source: "client",
      recipeId,
      path: requestPath(request),
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error("POST /api/usage-events error:", error);
    return NextResponse.json({ error: "Failed to track event" }, { status: 500 });
  }
}
