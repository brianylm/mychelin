import { NextResponse } from "next/server";
import { db } from "@/db";
import { householdMembers } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { HOUSEHOLDS_ENABLED } from "@/lib/feature-flags";
import { ensureHouseholdTables } from "@/db/ensure-schema";
import { getUserHousehold, logHouseholdActivity } from "@/lib/households";
import { and, eq } from "drizzle-orm";

export const runtime = "edge";
export const preferredRegion = "hnd1";

// ─── POST /api/households/leave ────────────────────────────
// Any member can always remove themselves. Their shared-plan meals stay
// on the household plan (ghost behaviour per the packet); their
// activity attribution stays as-is. Slice 2 adds the empty-household
// 30-day deletion trigger.
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

    await db
      .delete(householdMembers)
      .where(
        and(
          eq(householdMembers.householdId, membership.household.id),
          eq(householdMembers.userId, currentUser.id)
        )
      );

    await logHouseholdActivity(
      membership.household.id,
      currentUser.id,
      "left_household",
      currentUser.name
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/households/leave error:", error);
    return NextResponse.json(
      { error: "Failed to leave household" },
      { status: 500 }
    );
  }
}
