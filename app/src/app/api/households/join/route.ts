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
} from "@/lib/households";
import { and, eq, isNull, sql } from "drizzle-orm";

export const runtime = "edge";
export const preferredRegion = "hnd1";

// ─── POST /api/households/join ─────────────────────────────
// Join a live household by its join code. Anyone holding the code can
// join while the household is live. One household per user in the UI
// (friendly 409); the schema allows many.
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

    const [household] = await db
      .select()
      .from(households)
      .where(and(eq(households.joinCode, joinCode), isNull(households.deletedAt)))
      .limit(1);

    if (!household) {
      return NextResponse.json(
        { error: "No household found for that code" },
        { status: 404 }
      );
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
