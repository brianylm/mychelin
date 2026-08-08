import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { householdMembers, users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { HOUSEHOLDS_ENABLED } from "@/lib/feature-flags";
import { ensureHouseholdTables } from "@/db/ensure-schema";
import {
  getUserHousehold,
  handleMemberDeparture,
  isHouseholdAdmin,
  isHouseholdMember,
  logHouseholdActivity,
} from "@/lib/households";
import { and, eq } from "drizzle-orm";

export const runtime = "edge";
export const preferredRegion = "hnd1";

// ─── PATCH /api/households/members ─────────────────────────
// Promote a member to admin (admins only). Flat hierarchy: there is no
// owner role, and no demote in v1.
export async function PATCH(request: NextRequest) {
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
    const targetUserId = Number(body.userId);
    if (!Number.isInteger(targetUserId)) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    const membership = await getUserHousehold(currentUser.id);
    if (!membership) {
      return NextResponse.json(
        { error: "You're not in a household" },
        { status: 404 }
      );
    }
    const householdId = membership.household.id;

    if (!(await isHouseholdAdmin(currentUser.id, householdId))) {
      return NextResponse.json(
        { error: "Only household admins can promote members" },
        { status: 403 }
      );
    }

    if (!(await isHouseholdMember(targetUserId, householdId))) {
      return NextResponse.json(
        { error: "That user is not in your household" },
        { status: 404 }
      );
    }

    await db
      .update(householdMembers)
      .set({ role: "admin" })
      .where(
        and(
          eq(householdMembers.householdId, householdId),
          eq(householdMembers.userId, targetUserId)
        )
      );

    const [targetUser] = await db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.id, targetUserId))
      .limit(1);

    await logHouseholdActivity(
      householdId,
      currentUser.id,
      "promoted_member",
      targetUser?.name ?? null
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PATCH /api/households/members error:", error);
    return NextResponse.json(
      { error: "Failed to promote member" },
      { status: 500 }
    );
  }
}

// ─── DELETE /api/households/members ────────────────────────
// Admin removes a member OR another admin — flat hierarchy means any
// admin can remove any admin, including the original creator. Removing
// yourself goes through /leave instead.
export async function DELETE(request: NextRequest) {
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
    const targetUserId = Number(body.userId);
    if (!Number.isInteger(targetUserId)) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    if (targetUserId === currentUser.id) {
      return NextResponse.json(
        { error: "Use leave to remove yourself from the household" },
        { status: 400 }
      );
    }

    const membership = await getUserHousehold(currentUser.id);
    if (!membership) {
      return NextResponse.json(
        { error: "You're not in a household" },
        { status: 404 }
      );
    }
    const householdId = membership.household.id;

    if (!(await isHouseholdAdmin(currentUser.id, householdId))) {
      return NextResponse.json(
        { error: "Only household admins can remove members" },
        { status: 403 }
      );
    }

    if (!(await isHouseholdMember(targetUserId, householdId))) {
      return NextResponse.json(
        { error: "That user is not in your household" },
        { status: 404 }
      );
    }

    const [targetUser] = await db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.id, targetUserId))
      .limit(1);

    await db
      .delete(householdMembers)
      .where(
        and(
          eq(householdMembers.householdId, householdId),
          eq(householdMembers.userId, targetUserId)
        )
      );

    await logHouseholdActivity(
      householdId,
      currentUser.id,
      "removed_member",
      targetUser?.name ?? null
    );

    // Same data treatment as leaving (packet decision 7): ghost their
    // on-plan recipes, clean up their block rows, and start the 30-day
    // flow if the removal emptied the household.
    const emptied = await handleMemberDeparture(householdId, targetUserId);

    return NextResponse.json({ success: true, householdDeleted: emptied });
  } catch (error) {
    console.error("DELETE /api/households/members error:", error);
    return NextResponse.json(
      { error: "Failed to remove member" },
      { status: 500 }
    );
  }
}
