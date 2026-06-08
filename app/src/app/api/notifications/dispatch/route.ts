import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { and, eq, isNull, lt, lte } from "drizzle-orm";
import { db } from "@/db";
import { notificationJobs, pushSubscriptions } from "@/db/schema";
import { ensureNotificationTables } from "@/db/ensure-schema";

export const runtime = "nodejs";
export const preferredRegion = "hnd1";

function isAuthorized(request: NextRequest): boolean {
  const cronSecret = (process.env.CRON_SECRET || "").trim();
  if (cronSecret) {
    return request.headers.get("authorization") === "Bearer " + cronSecret;
  }
  return request.headers.get("x-vercel-cron") === "1" || request.nextUrl.searchParams.get("cron") === "1";
}

function configureWebPush() {
  const publicKey = (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY || "").trim();
  const privateKey = (process.env.VAPID_PRIVATE_KEY || "").trim();
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:support@mychelin.app", publicKey, privateKey);
  return true;
}

export async function GET(request: NextRequest) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!configureWebPush()) {
      return NextResponse.json({ configured: false, sent: 0, message: "VAPID keys not configured" });
    }

    await ensureNotificationTables();
    const now = new Date().toISOString();
    const jobs = await db
      .select()
      .from(notificationJobs)
      .where(
        and(
          lte(notificationJobs.dueAt, now),
          isNull(notificationJobs.sentAt),
          isNull(notificationJobs.canceledAt),
          lt(notificationJobs.attempts, 3)
        )
      )
      .limit(25);

    let sent = 0;
    let skipped = 0;

    for (const job of jobs) {
      const subscriptions = await db
        .select()
        .from(pushSubscriptions)
        .where(and(eq(pushSubscriptions.userId, job.userId), isNull(pushSubscriptions.disabledAt)));

      if (subscriptions.length === 0) {
        await db
          .update(notificationJobs)
          .set({ attempts: job.attempts + 1, lastError: "No active subscriptions" })
          .where(eq(notificationJobs.id, job.id));
        skipped += 1;
        continue;
      }

      const payload = JSON.stringify({
        title: job.title,
        body: job.body,
        url: job.url,
        type: job.type,
      });

      let delivered = false;
      let lastError = "";
      for (const subscription of subscriptions) {
        try {
          await webpush.sendNotification(
            {
              endpoint: subscription.endpoint,
              keys: { p256dh: subscription.p256dh, auth: subscription.auth },
            },
            payload
          );
          delivered = true;
          await db
            .update(pushSubscriptions)
            .set({ lastSuccessAt: now, updatedAt: now })
            .where(eq(pushSubscriptions.id, subscription.id));
        } catch (error) {
          lastError = error instanceof Error ? error.message : String(error);
          const statusCode = typeof error === "object" && error && "statusCode" in error
            ? Number((error as { statusCode?: number }).statusCode)
            : 0;
          if (statusCode === 404 || statusCode === 410) {
            await db
              .update(pushSubscriptions)
              .set({ disabledAt: now, updatedAt: now })
              .where(eq(pushSubscriptions.id, subscription.id));
          }
        }
      }

      await db
        .update(notificationJobs)
        .set({
          sentAt: delivered ? now : null,
          attempts: job.attempts + 1,
          lastError: delivered ? null : lastError || "Delivery failed",
        })
        .where(eq(notificationJobs.id, job.id));

      if (delivered) sent += 1;
      else skipped += 1;
    }

    return NextResponse.json({ configured: true, sent, skipped, checked: jobs.length });
  } catch (error) {
    console.error("GET /api/notifications/dispatch error:", error);
    return NextResponse.json({ error: "Failed to dispatch notifications" }, { status: 500 });
  }
}
