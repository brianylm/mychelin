import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { households, householdMembers } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { HOUSEHOLDS_ENABLED } from "@/lib/feature-flags";
import { ensureHouseholdTables } from "@/db/ensure-schema";
import {
  getUserHousehold,
  isHouseholdMember,
  logHouseholdActivity,
  purgeHousehold,
} from "@/lib/households";
import {
  isPastRecoveryWindow,
  isWithinRecoveryWindow,
} from "@/lib/household-lifecycle";
import { and, eq, sql } from "drizzle-orm";

export const runtime = "edge";
export const preferredRegion = "hnd1";

// ─── POST /api/households/join ─────────────────────────────
// Join a live household by its join code. Anyone holding the code can
// join while the household is live. One household per user in the UI
// (friendly 409); the schema allows many.
//
// Slice 2: the join code is also the reactivation path. A dead
// household (deleted_at set) inside its 30-day window is restored
// wholesale — deleted_at cleared, every plan/inventory/shopping/log row
// intact — and the reactivating user (re)joins as admin. Past the
// window the household is purged here (lazy purge on the join path) and
// the code fails cleanly.
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

    // Look up by code regardless of deletion state — the state decides
    // whether this is a join, a reactivation, or a clean failure.
    const [household] = await db
      .select()
      .from(households)
      .where(eq(households.joinCode, joinCode))
      .limit(1);

    if (!household) {
      return NextResponse.json(
        { error: "No household found for that code" },
        { status: 404 }
      );
    }

    if (household.deletedAt) {
      if (isPastRecoveryWindow(household.deletedAt)) {
        // Lazy purge on the join path, then fail cleanly.
        await purgeHousehold(household.id);
        return NextResponse.json(
          { error: "This household has been permanently deleted" },
          { status: 410 }
        );
      }
      if (!isWithinRecoveryWindow(household.deletedAt)) {
        return NextResponse.json(
          { error: "This household has been permanently deleted" },
          { status: 410 }
        );
      }

      // Reactivate: restore the household wholesale and (re)join the
      // reactivating user as admin.
      await db
        .update(households)
        .set({ deletedAt: null })
        .where(eq(households.id, household.id));

      if (await isHouseholdMember(currentUser.id, household.id)) {
        await db
          .update(householdMembers)
          .set({ role: "admin" })
          .where(
            and(
              eq(householdMembers.householdId, household.id),
              eq(householdMembers.userId, currentUser.id)
            )
          );
      } else {
        await db.insert(householdMembers).values({
          householdId: household.id,
          userId: currentUser.id,
          role: "admin",
        });
      }

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
