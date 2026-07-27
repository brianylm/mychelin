import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { mealPlanBlocks, mealPlans } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { ensureMealPlanBlocksTable } from "@/db/ensure-schema";

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

// ─── POST /api/meal-plans/blocks ───────────────────────────
// Blocks a meal slot ("eating out / something else"). Blocking clears
// the slot's planned meals — which is also what keeps blocked slots
// out of the shopping list. Idempotent: re-blocking the same slot
// just updates the note.
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensureMealPlanBlocksTable();

    const body = await request.json();
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
// Lifts the block on a meal slot. Idempotent.
export async function DELETE(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensureMealPlanBlocksTable();

    const body = await request.json();
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
