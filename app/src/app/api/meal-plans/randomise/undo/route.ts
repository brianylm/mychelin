import { NextRequest, NextResponse } from "next/server";
import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { mealPlans } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { ensureHouseholdTables, ensureMealPilotTables, ensureMealPlanCookedAtColumn, ensurePlanningOwnershipColumns } from "@/db/ensure-schema";
import { logHouseholdActivity } from "@/lib/households";
import { findAuthorizedPlans } from "@/lib/meal-plan-access";
import { mealsLabel } from "@/lib/meal-plan-writes";

export const runtime = "edge";
export const preferredRegion = "hnd1";

const MAX_UNDO_IDS = 50;

// ─── POST /api/meal-plans/randomise/undo ───────────────────
// One-step undo of the last randomize roll. Body: { ids: number[] }.
// Authorization is per row and at least as strict as DELETE
// /api/meal-plans/:id: the row must pass findAuthorizedPlan's rule
// (own plan, or a plan of a household the caller belongs to) AND have
// been added by the caller — a roll only ever creates rows owned by the
// roller, so undo can never remove another member's meals. Every other
// id lands in `failed`. On a household plan the feed gets ONE
// "undid_randomize" entry instead of a "removed_meal" entry per row.
// Returns { deleted: number[], failed: number[] }.
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const rawIds: unknown = body?.ids;
    if (!Array.isArray(rawIds) || rawIds.length === 0) {
      return NextResponse.json({ error: "ids must be a non-empty array" }, { status: 400 });
    }
    if (rawIds.length > MAX_UNDO_IDS) {
      return NextResponse.json({ error: `At most ${MAX_UNDO_IDS} ids per undo` }, { status: 400 });
    }
    if (!rawIds.every((id) => Number.isSafeInteger(id) && (id as number) > 0)) {
      return NextResponse.json({ error: "ids must be positive integers" }, { status: 400 });
    }
    const ids = [...new Set(rawIds as number[])];

    await Promise.all([
      ensurePlanningOwnershipColumns(),
      ensureMealPlanCookedAtColumn(),
      ensureHouseholdTables(),
      ensureMealPilotTables(),
    ]);

    const authorized = (await findAuthorizedPlans(ids, currentUser.id)).filter(
      (plan) => plan.userId === currentUser.id
    );
    const deleted = authorized.map((plan) => plan.id);
    if (deleted.length > 0) {
      await db.delete(mealPlans).where(inArray(mealPlans.id, deleted));
    }
    const deletedSet = new Set(deleted);
    const failed = ids.filter((id) => !deletedSet.has(id));

    // One summary entry per household touched (in practice the caller's).
    const perHousehold = new Map<number, number>();
    for (const plan of authorized) {
      if (plan.householdId != null) {
        perHousehold.set(plan.householdId, (perHousehold.get(plan.householdId) ?? 0) + 1);
      }
    }
    for (const [householdId, count] of perHousehold) {
      await logHouseholdActivity(
        householdId,
        currentUser.id,
        "undid_randomize",
        mealsLabel(count)
      );
    }

    return NextResponse.json({ deleted, failed });
  } catch (error) {
    console.error("POST /api/meal-plans/randomise/undo error:", error);
    return NextResponse.json({ error: "Failed to undo randomize" }, { status: 500 });
  }
}
