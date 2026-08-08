import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { householdMemberBlocks, mealPlanBlocks, mealPlans } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { ensureHouseholdTables, ensureMealPlanBlocksTable } from "@/db/ensure-schema";
import { getUserHousehold, logHouseholdActivity } from "@/lib/households";
import {
  blockActivityLabel,
  isHouseholdBlockScope,
  normalizeBlockDate,
  type HouseholdBlockScope,
} from "@/lib/household-blocking";

export const runtime = "edge";
export const preferredRegion = "hnd1";

const VALID_MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function validateSlot(body: { date?: unknown; mealType?: unknown }):
  | { date: string; mealType: string }
  | { error: string } {
  const { date, mealType } = body;
  if (typeof date !== "string" || !DATE_RE.test(date)) {
    return { error: "Invalid date format. Use YYYY-MM-DD" };
  }
  if (typeof mealType !== "string" || !VALID_MEAL_TYPES.includes(mealType)) {
    return { error: "Invalid meal type. Must be one of: breakfast, lunch, dinner, snack" };
  }
  return { date, mealType };
}

// Validates a household member-block request. Slot scope needs a meal
// type; wider scopes cover every meal type and store meal_type = "".
function validateMemberBlock(body: {
  date?: unknown;
  mealType?: unknown;
  scope?: unknown;
}):
  | { scope: HouseholdBlockScope; date: string; mealType: string }
  | { error: string } {
  const scope = body.scope === undefined ? "slot" : body.scope;
  if (!isHouseholdBlockScope(scope)) {
    return { error: "Invalid scope. Must be one of: slot, day, week, month" };
  }
  if (typeof body.date !== "string" || !DATE_RE.test(body.date)) {
    return { error: "Invalid date format. Use YYYY-MM-DD" };
  }
  let normalized: string;
  try {
    normalized = normalizeBlockDate(scope, body.date);
  } catch {
    return { error: "Invalid date format. Use YYYY-MM-DD" };
  }
  if (scope === "slot") {
    if (typeof body.mealType !== "string" || !VALID_MEAL_TYPES.includes(body.mealType)) {
      return { error: "Invalid meal type. Must be one of: breakfast, lunch, dinner, snack" };
    }
    return { scope, date: normalized, mealType: body.mealType };
  }
  return { scope, date: normalized, mealType: "" };
}

// ─── POST /api/meal-plans/blocks ───────────────────────────
// Solo users: blocks a meal slot ("eating out / something else").
// Blocking clears the slot's planned meals — which is also what keeps
// blocked slots out of the shopping list. Idempotent: re-blocking the
// same slot just updates the note.
//
// Household members: per-member "I'm not eating" block at slot / day /
// week / month scope. Never clears the shared slot's plans — the other
// members keep eating; the blocker is just excluded from eater counts.
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensureMealPlanBlocksTable();
    await ensureHouseholdTables();

    const membership = await getUserHousehold(currentUser.id);
    const body = await request.json();

    if (membership) {
      const parsed = validateMemberBlock(body);
      if ("error" in parsed) {
        return NextResponse.json({ error: parsed.error }, { status: 400 });
      }
      const note = typeof body.note === "string" && body.note.trim() ? body.note.trim() : null;
      const householdId = membership.household.id;

      await db
        .insert(householdMemberBlocks)
        .values({
          householdId,
          userId: currentUser.id,
          scope: parsed.scope,
          date: parsed.date,
          mealType: parsed.mealType,
          note,
          createdAt: new Date().toISOString(),
        })
        .onConflictDoUpdate({
          target: [
            householdMemberBlocks.householdId,
            householdMemberBlocks.userId,
            householdMemberBlocks.scope,
            householdMemberBlocks.date,
            householdMemberBlocks.mealType,
          ],
          set: { note },
        });

      await logHouseholdActivity(
        householdId,
        currentUser.id,
        "blocked_slot",
        blockActivityLabel(parsed.scope, parsed.date, parsed.mealType || undefined)
      );

      const [block] = await db
        .select()
        .from(householdMemberBlocks)
        .where(
          and(
            eq(householdMemberBlocks.householdId, householdId),
            eq(householdMemberBlocks.userId, currentUser.id),
            eq(householdMemberBlocks.scope, parsed.scope),
            eq(householdMemberBlocks.date, parsed.date),
            eq(householdMemberBlocks.mealType, parsed.mealType)
          )
        );

      return NextResponse.json(
        { ...block, userName: currentUser.name },
        { status: 201 }
      );
    }

    const slot = validateSlot(body);
    if ("error" in slot) {
      return NextResponse.json({ error: slot.error }, { status: 400 });
    }
    const note = typeof body.note === "string" && body.note.trim() ? body.note.trim() : null;

    // Blocking replaces the slot's plans.
    await db
      .delete(mealPlans)
      .where(
        and(
          eq(mealPlans.userId, currentUser.id),
          eq(mealPlans.date, slot.date),
          eq(mealPlans.mealType, slot.mealType)
        )
      );

    await db
      .insert(mealPlanBlocks)
      .values({
        userId: currentUser.id,
        date: slot.date,
        mealType: slot.mealType,
        note,
        createdAt: new Date().toISOString(),
      })
      .onConflictDoUpdate({
        target: [mealPlanBlocks.userId, mealPlanBlocks.date, mealPlanBlocks.mealType],
        set: { note },
      });

    const [block] = await db
      .select()
      .from(mealPlanBlocks)
      .where(
        and(
          eq(mealPlanBlocks.userId, currentUser.id),
          eq(mealPlanBlocks.date, slot.date),
          eq(mealPlanBlocks.mealType, slot.mealType)
        )
      );

    return NextResponse.json(block, { status: 201 });
  } catch (error) {
    console.error("POST /api/meal-plans/blocks error:", error);
    return NextResponse.json(
      { error: "Failed to block meal slot" },
      { status: 500 }
    );
  }
}

// ─── DELETE /api/meal-plans/blocks ─────────────────────────
// Lifts a block. Solo: the user's slot block. Household: the current
// member's block at the given scope. Both idempotent.
export async function DELETE(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensureMealPlanBlocksTable();
    await ensureHouseholdTables();

    const membership = await getUserHousehold(currentUser.id);
    const body = await request.json();

    if (membership) {
      const parsed = validateMemberBlock(body);
      if ("error" in parsed) {
        return NextResponse.json({ error: parsed.error }, { status: 400 });
      }

      await db
        .delete(householdMemberBlocks)
        .where(
          and(
            eq(householdMemberBlocks.householdId, membership.household.id),
            eq(householdMemberBlocks.userId, currentUser.id),
            eq(householdMemberBlocks.scope, parsed.scope),
            eq(householdMemberBlocks.date, parsed.date),
            eq(householdMemberBlocks.mealType, parsed.mealType)
          )
        );

      return NextResponse.json({ message: "Block removed" });
    }

    const slot = validateSlot(body);
    if ("error" in slot) {
      return NextResponse.json({ error: slot.error }, { status: 400 });
    }

    await db
      .delete(mealPlanBlocks)
      .where(
        and(
          eq(mealPlanBlocks.userId, currentUser.id),
          eq(mealPlanBlocks.date, slot.date),
          eq(mealPlanBlocks.mealType, slot.mealType)
        )
      );

    return NextResponse.json({ message: "Block removed" });
  } catch (error) {
    console.error("DELETE /api/meal-plans/blocks error:", error);
    return NextResponse.json(
      { error: "Failed to unblock meal slot" },
      { status: 500 }
    );
  }
}
