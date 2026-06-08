import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { pushSubscriptions } from "@/db/schema";
import { ensureNotificationTables } from "@/db/ensure-schema";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "edge";
export const preferredRegion = "hnd1";

function extractKeys(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const subscription = value as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } };
  if (typeof subscription.endpoint !== "string") return null;
  if (typeof subscription.keys?.p256dh !== "string") return null;
  if (typeof subscription.keys?.auth !== "string") return null;
  return {
    endpoint: subscription.endpoint,
    p256dh: subscription.keys.p256dh,
    auth: subscription.keys.auth,
  };
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const configured = Boolean((process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY || "").trim());
    if (!configured) {
      return NextResponse.json({ error: "Notifications are not configured yet" }, { status: 503 });
    }

    await ensureNotificationTables();
    const body = await request.json();
    const parsed = extractKeys(body.subscription ?? body);
    if (!parsed) {
      return NextResponse.json({ error: "Invalid push subscription" }, { status: 400 });
    }

    const now = new Date().toISOString();
    const existing = await db.query.pushSubscriptions.findFirst({
      where: eq(pushSubscriptions.endpoint, parsed.endpoint),
    });

    if (existing) {
      await db
        .update(pushSubscriptions)
        .set({
          userId: currentUser.id,
          p256dh: parsed.p256dh,
          auth: parsed.auth,
          userAgent: request.headers.get("user-agent") ?? null,
          disabledAt: null,
          updatedAt: now,
        })
        .where(eq(pushSubscriptions.id, existing.id));
    } else {
      await db.insert(pushSubscriptions).values({
        userId: currentUser.id,
        endpoint: parsed.endpoint,
        p256dh: parsed.p256dh,
        auth: parsed.auth,
        userAgent: request.headers.get("user-agent") ?? null,
        createdAt: now,
        updatedAt: now,
      });
    }

    return NextResponse.json({ subscribed: true });
  } catch (error) {
    console.error("POST /api/notifications/subscribe error:", error);
    return NextResponse.json({ error: "Failed to save push subscription" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await ensureNotificationTables();

    const body = await request.json().catch(() => ({}));
    if (typeof body.endpoint !== "string") {
      return NextResponse.json({ error: "Endpoint is required" }, { status: 400 });
    }

    await db
      .update(pushSubscriptions)
      .set({ disabledAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
      .where(and(eq(pushSubscriptions.userId, currentUser.id), eq(pushSubscriptions.endpoint, body.endpoint)));

    return NextResponse.json({ subscribed: false });
  } catch (error) {
    console.error("DELETE /api/notifications/subscribe error:", error);
    return NextResponse.json({ error: "Failed to remove push subscription" }, { status: 500 });
  }
}
