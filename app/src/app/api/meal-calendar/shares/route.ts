import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getMealCalendarConfig, mealCalendarSetup } from "@/lib/meal-calendar/config";
import { GoogleCalendarApiError, GoogleCalendarClient } from "@/lib/meal-calendar/google-client";
import { resolveCalendarScope } from "@/lib/meal-calendar/scope";
import {
  getCalendarConnectionForScope,
  getCalendarShare,
  saveCalendarShare,
} from "@/lib/meal-calendar/store";
import { getCalendarAccessToken } from "@/lib/meal-calendar/token-service";
import { publicCalendarError } from "@/lib/meal-calendar/api-errors";

export const runtime = "edge";
export const preferredRegion = "hnd1";

async function context(userId: number) {
  if (!mealCalendarSetup().configured) throw new Error("Calendar sync is not configured");
  const resolved = await resolveCalendarScope(userId);
  if (resolved.scope.type !== "household") {
    throw new Error("Calendar sharing is available for households");
  }
  const connection = await getCalendarConnectionForScope(resolved.scope);
  if (!connection) throw new Error("Connect the household calendar first");
  return { resolved, connection, config: getMealCalendarConfig() };
}

export async function POST() {
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!mealCalendarSetup().configured) {
    return NextResponse.json({ error: "Calendar sync is not configured" }, { status: 503 });
  }
  try {
    const { connection, config } = await context(currentUser.id);
    if (connection.userId === currentUser.id) {
      return NextResponse.json({ success: true, status: "owner" });
    }
    const existing = await getCalendarShare({
      connectionId: connection.id,
      userId: currentUser.id,
    });
    if (existing?.status === "active") {
      return NextResponse.json({ success: true, status: "active" });
    }
    await saveCalendarShare({
      connectionId: connection.id,
      userId: currentUser.id,
      email: currentUser.email,
      status: "pending",
    });
    const client = new GoogleCalendarClient();
    const accessToken = await getCalendarAccessToken({ connection, config, client });
    let rule: { id: string };
    try {
      rule = await client.shareCalendar({
        accessToken,
        calendarId: connection.calendarId,
        email: currentUser.email,
      });
    } catch (error) {
      if (!(error instanceof GoogleCalendarApiError) || error.status !== 409) throw error;
      rule = await client.getCalendarShare({
        accessToken,
        calendarId: connection.calendarId,
        ruleId: `user:${currentUser.email.toLowerCase()}`,
      });
    }
    await saveCalendarShare({
      connectionId: connection.id,
      userId: currentUser.id,
      email: currentUser.email,
      status: "active",
      googleAclRuleId: rule.id,
    });
    return NextResponse.json({ success: true, status: "active" });
  } catch (error) {
    return NextResponse.json(
      { error: publicCalendarError(error, "Google Calendar sharing could not be updated. Try again.") },
      { status: 409 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!mealCalendarSetup().configured) {
    return NextResponse.json({ error: "Calendar sync is not configured" }, { status: 503 });
  }
  try {
    const { connection, config, resolved } = await context(currentUser.id);
    const body = (await request.json().catch(() => ({}))) as { userId?: unknown };
    const requestedUserId = Number(body.userId || currentUser.id);
    if (!Number.isInteger(requestedUserId)) throw new Error("Invalid household member");
    if (requestedUserId !== currentUser.id && !resolved.canManage) {
      return NextResponse.json({ error: "Only an admin can revoke another member" }, { status: 403 });
    }
    const share = await getCalendarShare({
      connectionId: connection.id,
      userId: requestedUserId,
    });
    if (!share || share.status === "revoked") {
      return NextResponse.json({ success: true });
    }
    if (share.googleAclRuleId) {
      const client = new GoogleCalendarClient();
      const accessToken = await getCalendarAccessToken({ connection, config, client });
      try {
        await client.revokeCalendarShare({
          accessToken,
          calendarId: connection.calendarId,
          ruleId: share.googleAclRuleId,
        });
      } catch (error) {
        if (!(error instanceof GoogleCalendarApiError) || error.status !== 404) throw error;
      }
    }
    await saveCalendarShare({
      connectionId: connection.id,
      userId: share.userId,
      email: share.email,
      status: "revoked",
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: publicCalendarError(error, "Google Calendar sharing could not be updated. Try again.") },
      { status: 409 }
    );
  }
}
