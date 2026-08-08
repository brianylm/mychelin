import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  households,
  householdMembers,
  householdActivityLog,
  users,
} from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { HOUSEHOLDS_ENABLED } from "@/lib/feature-flags";
import { ensureHouseholdTables } from "@/db/ensure-schema";
import {
  generateJoinCode,
  getUserHousehold,
  logHouseholdActivity,
  snapshotGhostSlots,
} from "@/lib/households";
import { and, desc, eq, isNull } from "drizzle-orm";

export const runtime = "edge";
export const preferredRegion = "hnd1";

// ─── GET /api/households ───────────────────────────────────
// The current user's household (Slice 1 UI: one per user) with its
// members and the recent activity feed. Returns { household: null }
// for solo users — that is the normal state, not an error.
export async function GET() {
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
      return NextResponse.json({ household: null });
    }
    const householdId = membership.household.id;

    const [members, activity] = await Promise.all([
      db
        .select({
          userId: householdMembers.userId,
          role: householdMembers.role,
          joinedAt: householdMembers.joinedAt,
          name: users.name,
        })
        .from(householdMembers)
        .innerJoin(users, eq(householdMembers.userId, users.id))
        .where(eq(householdMembers.householdId, householdId))
        .orderBy(householdMembers.joinedAt),
      db
        .select({
          id: householdActivityLog.id,
          userId: householdActivityLog.userId,
          action: householdActivityLog.action,
          targetName: householdActivityLog.targetName,
          createdAt: householdActivityLog.createdAt,
          userName: users.name,
        })
        .from(householdActivityLog)
        .innerJoin(users, eq(householdActivityLog.userId, users.id))
        .where(eq(householdActivityLog.householdId, householdId))
        .orderBy(desc(householdActivityLog.createdAt), desc(householdActivityLog.id))
        .limit(30),
    ]);

    return NextResponse.json({
      household: {
        id: membership.household.id,
        name: membership.household.name,
        joinCode: membership.household.joinCode,
        createdAt: membership.household.createdAt,
        memberCount: members.length,
        myRole: membership.role,
      },
      members,
      activity,
    });
  } catch (error) {
    console.error("GET /api/households error:", error);
    return NextResponse.json(
      { error: "Failed to fetch household" },
      { status: 500 }
    );
  }
}

// ─── POST /api/households ──────────────────────────────────
// Creates a household; the creator becomes its first admin. The UI
// gates to one household per user (friendly 409) even though the
// schema allows many.
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
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) {
      return NextResponse.json(
        { error: "Household name is required" },
        { status: 400 }
      );
    }
    if (name.length > 80) {
      return NextResponse.json(
        { error: "Household name is too long" },
        { status: 400 }
      );
    }

    if (await getUserHousehold(currentUser.id)) {
      return NextResponse.json(
        {
          error:
            "You're already in a household. Leave it before creating a new one.",
        },
        { status: 409 }
      );
    }

    // Join-code collisions are astronomically unlikely but the column is
    // unique, so retry a few times instead of ever failing on one.
    let created: typeof households.$inferSelect | null = null;
    for (let attempt = 0; attempt < 5 && !created; attempt++) {
      try {
        const [row] = await db
          .insert(households)
          .values({
            name,
            joinCode: generateJoinCode(),
            createdBy: currentUser.id,
          })
          .returning();
        created = row;
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        if (!message.toLowerCase().includes("unique")) throw e;
      }
    }
    if (!created) {
      return NextResponse.json(
        { error: "Could not generate a join code — try again" },
        { status: 500 }
      );
    }

    await db.insert(householdMembers).values({
      householdId: created.id,
      userId: currentUser.id,
      role: "admin",
    });

    await logHouseholdActivity(created.id, currentUser.id, "created_household", name);

    return NextResponse.json(
      {
        household: {
          id: created.id,
          name: created.name,
          joinCode: created.joinCode,
          createdAt: created.createdAt,
          memberCount: 1,
          myRole: "admin" as const,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/households error:", error);
    return NextResponse.json(
      { error: "Failed to create household" },
      { status: 500 }
    );
  }
}

// ─── DELETE /api/households ────────────────────────────────
// Admin-only explicit delete. Starts the 30-day flow: the household
// goes dead/recoverable (deleted_at set) and disappears from all UI and
// APIs except join-code reactivation. Nothing is purged here — the lazy
// purge runs after the window (see lib/households.ts). Ghost snapshots
// are taken for every on-plan recipe up front so slots keep rendering
// whatever happens to members' libraries during the window.
export async function DELETE() {
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
    if (membership.role !== "admin") {
      return NextResponse.json(
        { error: "Only household admins can delete the household" },
        { status: 403 }
      );
    }
    const householdId = membership.household.id;

    // ownerUserId null → snapshot every on-plan slot, not one member's.
    await snapshotGhostSlots(householdId, null);

    await logHouseholdActivity(
      householdId,
      currentUser.id,
      "deleted_household",
      membership.household.name
    );

    await db
      .update(households)
      .set({ deletedAt: new Date().toISOString() })
      .where(and(eq(households.id, householdId), isNull(households.deletedAt)));

    return NextResponse.json({ success: true, deletedAt: new Date().toISOString() });
  } catch (error) {
    console.error("DELETE /api/households error:", error);
    return NextResponse.json(
      { error: "Failed to delete household" },
      { status: 500 }
    );
  }
}
