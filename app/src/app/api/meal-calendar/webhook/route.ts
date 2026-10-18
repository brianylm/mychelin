import { NextRequest, NextResponse } from "next/server";
import { mealCalendarSetup } from "@/lib/meal-calendar/config";
import {
  enqueueCalendarJob,
  getCalendarConnectionByWatchChannel,
} from "@/lib/meal-calendar/store";
import { validateGoogleWatchNotification } from "@/lib/meal-calendar/webhook";

export const runtime = "edge";
export const preferredRegion = "hnd1";

export async function POST(request: NextRequest) {
  if (!mealCalendarSetup().configured) return new NextResponse(null, { status: 404 });
  const channelId = request.headers.get("x-goog-channel-id");
  if (!channelId) return new NextResponse(null, { status: 404 });
  const connection = await getCalendarConnectionByWatchChannel(channelId);
  const validation = await validateGoogleWatchNotification({
    headers: request.headers,
    watch:
      connection?.watchChannelId &&
      connection.watchResourceId &&
      connection.watchTokenHash
        ? {
            channelId: connection.watchChannelId,
            resourceId: connection.watchResourceId,
            tokenHash: connection.watchTokenHash,
            expiresAt: connection.watchExpiresAt,
          }
        : null,
  });
  if (!validation.valid || !connection) return new NextResponse(null, { status: 404 });
  await enqueueCalendarJob({
    connectionId: connection.id,
    action: "catchup",
    dedupeKey: `catchup:${connection.id}`,
  });
  return new NextResponse(null, { status: 204 });
}
