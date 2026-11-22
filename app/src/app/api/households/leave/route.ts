import { NextResponse } from "next/server";
import { db } from "@/db";
import { householdMembers } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { HOUSEHOLDS_ENABLED } from "@/lib/feature-flags";
import { ensureHouseholdTables } from "@/db/ensure-schema";
import {
  getUserHousehold,
  handleMemberDeparture,
  logHouseholdActivity,
  rotateJoinCode,
} from "@/lib/households";
import { and, eq, ne, sql } from "drizzle-orm";

export const runtime = "edge";
export const preferredRegion = "hnd1";

// ─── POST /api/households/leave ────────────────────────────
// Any member can always remove themselves. Their shared-plan meals stay
// on the household plan as ghost copies (display data snapshotted at
// departure); their activity attribution stays as-is; their per-member
// blocks are cleaned up. When the last member leaves, the 30-day
// deletion flow starts (dead/recoverable, reactivatable via join code).
export async function POST() {
  try {
    if (!HOUSEHOLDS_ENABLED) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensureHouseholdTables();

    const membership = await getUserHousehold(currentUser.id);
    if (!membership) {
      return NextResponse.json(
        { error: "You're not in a household" },
        { status: 404 }
      );
    }

    const householdId = membership.household.id;

    // The last member out keeps their membership row (role intact), the
    // same as every member's row survives an admin delete. Join-code
    // reactivation is limited to former admins, and this row is how a
    // last-out admin proves it. getUserHousehold ignores rows in dead
    // households, so the user is solo again either way.
    const [{ others }] = await db
      .select({ others: sql<number>`count(*)` })
      .from(householdMembers)
      .where(
        and(
          eq(householdMembers.householdId, householdId),
          ne(householdMembers.userId, currentUser.id)
        )
      );
    if (Number(others) > 0) {
      await db
        .delete(householdMembers)
        .where(
          and(
            eq(householdMembers.householdId, householdId),
            eq(householdMembers.userId, currentUser.id)
          )
        );
    }

    await logHouseholdActivity(
      householdId,
      currentUser.id,
      "left_household",
      currentUser.name
    );

    const emptied = await handleMemberDeparture(householdId, currentUser.id);

    // The departed member may still hold the code: rotate it while the
    // household lives on. A dead household keeps its code so a former
    // admin can reactivate it (the join route enforces the admin check).
    if (!emptied) {
      await rotateJoinCode(householdId);
    }

    return NextResponse.json({ success: true, householdDeleted: emptied });
  } catch (error) {
    console.error("POST /api/households/leave error:", error);
    return NextResponse.json(
      { error: "Failed to leave household" },
      { status: 500 }
    );
  }
}
