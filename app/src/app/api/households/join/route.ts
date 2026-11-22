import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { households, householdMembers } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { HOUSEHOLDS_ENABLED } from "@/lib/feature-flags";
import { ensureHouseholdTables } from "@/db/ensure-schema";
import {
  getUserHousehold,
  isHouseholdAdmin,
  isHouseholdMember,
  isWellFormedJoinCode,
  logHouseholdActivity,
  purgeHousehold,
} from "@/lib/households";
import {
  checkRateLimit,
  getClientIp,
  RATE_LIMITS,
  rateLimitHeaders,
} from "@/lib/rateLimit";
import {
  isPastRecoveryWindow,
  isWithinRecoveryWindow,
} from "@/lib/household-lifecycle";
import { eq, sql } from "drizzle-orm";

export const runtime = "edge";
export const preferredRegion = "hnd1";

// ─── POST /api/households/join ─────────────────────────────
// Join a live household by its join code. Anyone holding the code can
// join while the household is live. One household per user in the UI
// (friendly 409); the schema allows many.
//
// Codes are 8 characters (6 for households that have not rotated since
// the change). The code rotates whenever a member leaves or is removed,
// and attempts are rate limited per user and per IP.
//
// Slice 2: the join code is also the reactivation path. A dead
// household (deleted_at set) inside its 30-day window is restored
// wholesale — deleted_at cleared, every plan/inventory/shopping/log row
// intact — but only for a caller who was an admin of it when it died
// (their membership row survives the delete). Everyone else gets the
// same response as a wrong code, so the code reveals nothing. Past the
// window the household is purged here (lazy purge on the join path).
function invalidCode() {
  return NextResponse.json(
    { error: "No household found for that code" },
    { status: 404 }
  );
}

export async function POST(request: NextRequest) {
  try {
    if (!HOUSEHOLDS_ENABLED) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensureHouseholdTables();

    const body = await request.json();
    const joinCode =
      typeof body.joinCode === "string" ? body.joinCode.trim().toUpperCase() : "";
    if (!joinCode) {
      return NextResponse.json(
        { error: "Join code is required" },
        { status: 400 }
      );
    }

    if (await getUserHousehold(currentUser.id)) {
      return NextResponse.json(
        {
          error:
            "You're already in a household. Leave it before joining another one.",
        },
        { status: 409 }
      );
    }

    // Every attempt counts (right or wrong), per user and per IP, before
    // the code is looked up. Both checks run so each bucket advances.
    const [byUser, byIp] = await Promise.all([
      checkRateLimit(RATE_LIMITS.householdJoinUser, `user:${currentUser.id}`),
      checkRateLimit(RATE_LIMITS.householdJoinIp, `ip:${getClientIp(request)}`),
    ]);
    const blocked = !byUser.allowed ? byUser : !byIp.allowed ? byIp : null;
    if (blocked) {
      return NextResponse.json(
        {
          error:
            "Too many join attempts. Please wait a while and try again, or ask your household for a fresh invite link.",
        },
        { status: 429, headers: rateLimitHeaders(blocked) }
      );
    }

    if (!isWellFormedJoinCode(joinCode)) {
      return invalidCode();
    }

    // Look up by code regardless of deletion state — the state decides
    // whether this is a join, a reactivation, or a clean failure.
    const [household] = await db
      .select()
      .from(households)
      .where(eq(households.joinCode, joinCode))
      .limit(1);

    if (!household) {
      return invalidCode();
    }

    if (household.deletedAt) {
      // Only an admin at deletion time may learn the household exists.
      const wasAdmin = await isHouseholdAdmin(currentUser.id, household.id);

      if (isPastRecoveryWindow(household.deletedAt)) {
        // Lazy purge on the join path, then fail cleanly.
        await purgeHousehold(household.id);
        return wasAdmin
          ? NextResponse.json(
              { error: "This household has been permanently deleted" },
              { status: 410 }
            )
          : invalidCode();
      }
      if (!wasAdmin) {
        return invalidCode();
      }
      if (!isWithinRecoveryWindow(household.deletedAt)) {
        return NextResponse.json(
          { error: "This household has been permanently deleted" },
          { status: 410 }
        );
      }

      // Reactivate: restore the household wholesale. The caller's admin
      // membership row already exists (it survived the delete).
      await db
        .update(households)
        .set({ deletedAt: null })
        .where(eq(households.id, household.id));

      await logHouseholdActivity(
        household.id,
        currentUser.id,
        "reactivated_household",
        household.name
      );

      const [{ count }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(householdMembers)
        .where(eq(householdMembers.householdId, household.id));

      return NextResponse.json({
        household: {
          id: household.id,
          name: household.name,
          joinCode: household.joinCode,
          createdAt: household.createdAt,
          memberCount: Number(count),
          myRole: "admin" as const,
        },
        reactivated: true,
      });
    }

    if (await isHouseholdMember(currentUser.id, household.id)) {
      return NextResponse.json(
        { error: "You're already a member of this household" },
        { status: 409 }
      );
    }

    await db.insert(householdMembers).values({
      householdId: household.id,
      userId: currentUser.id,
      role: "member",
    });

    await logHouseholdActivity(
      household.id,
      currentUser.id,
      "joined_household",
      currentUser.name
    );

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(householdMembers)
      .where(eq(householdMembers.householdId, household.id));

    return NextResponse.json({
      household: {
        id: household.id,
        name: household.name,
        joinCode: household.joinCode,
        createdAt: household.createdAt,
        memberCount: Number(count),
        myRole: "member" as const,
      },
    });
  } catch (error) {
    console.error("POST /api/households/join error:", error);
    return NextResponse.json(
      { error: "Failed to join household" },
      { status: 500 }
    );
  }
}
