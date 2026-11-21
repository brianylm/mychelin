import { NextRequest, NextResponse } from "next/server";
import { and, eq, gte, inArray, lt, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  householdMemberBlocks,
  householdMembers,
  mealPlanBlocks,
  mealPlans,
  recipeAttempts,
  recipes,
  users,
} from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { ensureHouseholdTables, ensureMealPilotTables, ensureMealPlanBlocksTable, ensureMealPlanCookedAtColumn, ensurePlanningOwnershipColumns, ensureRecipeAttemptsTable } from "@/db/ensure-schema";
import { getUserHousehold } from "@/lib/households";
import { createMealPlanForUser } from "@/lib/meal-plan-writes";
import { shiftDateKey } from "@/lib/planner-logged-meals";
import { requestPath } from "@/lib/usage-events";

export const runtime = "edge";
export const preferredRegion = "hnd1";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// ─── GET /api/meal-plans ───────────────────────────────────
// Returns the current user's meal plans for the date range, plus cook
// attempts logged in that range so the calendar can show what was
// actually cooked — even when it was never planned — plus blocked
// slots ("eating out / something else") in the range. Attempts are
// fetched with a 1-day pad on each side because cooked_at is UTC while
// the calendar works in local dates; the client re-filters precisely.
//
// Household mode: when the user is in a household, `plans` are the
// household's shared slots (each carrying `addedByName` attribution),
// `blocks` is empty (personal blocks don't apply), and `memberBlocks`
// carries every member's per-member blocks with names. Solo users get
// the original response shape and zero behavior change.
export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await Promise.all([
      ensurePlanningOwnershipColumns(),
      ensureMealPlanCookedAtColumn(),
      ensureRecipeAttemptsTable(),
      ensureMealPlanBlocksTable(),
      ensureHouseholdTables(),
      ensureMealPilotTables(),
    ]);

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const membership = await getUserHousehold(currentUser.id);

    const whereConditions = membership
      ? [eq(mealPlans.householdId, membership.household.id)]
      : [eq(mealPlans.userId, currentUser.id)];
    const blockConditions = [eq(mealPlanBlocks.userId, currentUser.id)];

    if (startDate) {
      whereConditions.push(gte(mealPlans.date, startDate));
      blockConditions.push(gte(mealPlanBlocks.date, startDate));
    }
    if (endDate) {
      whereConditions.push(lte(mealPlans.date, endDate));
      blockConditions.push(lte(mealPlanBlocks.date, endDate));
    }

    const fetchAttempts =
      startDate && endDate && DATE_RE.test(startDate) && DATE_RE.test(endDate);

    // Member blocks are padded 31 days back so week/month-scope blocks
    // whose normalized start date precedes the visible range still load.
    const memberBlockConditions = membership
      ? [eq(householdMemberBlocks.householdId, membership.household.id)]
      : null;
    if (memberBlockConditions && startDate) {
      memberBlockConditions.push(
        gte(householdMemberBlocks.date, shiftDateKey(startDate, -31))
      );
    }
    if (memberBlockConditions && endDate) {
      memberBlockConditions.push(lte(householdMemberBlocks.date, endDate));
    }

    const [plans, attemptRows, blockRows, memberBlockRows, memberCountRow] =
      await Promise.all([
        db.query.mealPlans.findMany({
          where: and(...whereConditions),
          with: {
            recipe: {
              columns: { id: true, title: true, yield: true },
            },
          },
          orderBy: (mp, { asc }) => [asc(mp.date), asc(mp.mealType)],
        }),
        fetchAttempts
          ? db
              .select({
                id: recipeAttempts.id,
                recipeId: recipeAttempts.recipeId,
                cookedAt: recipeAttempts.cookedAt,
                notes: recipeAttempts.notes,
                mealPlanId: recipeAttempts.mealPlanId,
                recipeTitle: recipes.title,
              })
              .from(recipeAttempts)
              .innerJoin(recipes, eq(recipeAttempts.recipeId, recipes.id))
              .where(
                and(
                  eq(recipeAttempts.userId, currentUser.id),
                  gte(recipeAttempts.cookedAt, shiftDateKey(startDate, -1)),
                  lt(recipeAttempts.cookedAt, shiftDateKey(endDate, 2))
                )
              )
          : Promise.resolve([]),
        // Personal blocks only exist for solo users.
        membership
          ? Promise.resolve([])
          : db
              .select()
              .from(mealPlanBlocks)
              .where(and(...blockConditions)),
        memberBlockConditions
          ? db
              .select({
                id: householdMemberBlocks.id,
                userId: householdMemberBlocks.userId,
                scope: householdMemberBlocks.scope,
                date: householdMemberBlocks.date,
                mealType: householdMemberBlocks.mealType,
                note: householdMemberBlocks.note,
                userName: users.name,
              })
              .from(householdMemberBlocks)
              .innerJoin(users, eq(householdMemberBlocks.userId, users.id))
              .where(and(...memberBlockConditions))
          : Promise.resolve([]),
        membership
          ? db
              .select({ count: sql<number>`count(*)` })
              .from(householdMembers)
              .where(eq(householdMembers.householdId, membership.household.id))
          : Promise.resolve([{ count: 0 }]),
      ]);

    if (!membership) {
      return NextResponse.json({ plans, attempts: attemptRows, blocks: blockRows });
    }

    // Attribution: who added each shared slot.
    const adderIds = [
      ...new Set(
        plans.map((p) => p.userId).filter((id): id is number => id != null)
      ),
    ];
    const adderRows = adderIds.length
      ? await db
          .select({ id: users.id, name: users.name })
          .from(users)
          .where(inArray(users.id, adderIds))
      : [];
    const adderNames = new Map(adderRows.map((r) => [r.id, r.name]));

    return NextResponse.json({
      plans: plans.map((p) => ({
        ...p,
        addedByName: p.userId != null ? adderNames.get(p.userId) ?? null : null,
      })),
      attempts: attemptRows,
      blocks: [],
      household: {
        id: membership.household.id,
        name: membership.household.name,
        memberCount: Number(memberCountRow[0]?.count ?? 0),
      },
      memberBlocks: memberBlockRows,
    });
  } catch (error) {
    console.error("GET /api/meal-plans error:", error);
    return NextResponse.json(
      { error: "Failed to fetch meal plans" },
      { status: 500 }
    );
  }
}

// ─── POST /api/meal-plans ──────────────────────────────────
// Creates a new meal plan. For household members the plan lands on the
// shared household plan (userId records who added it); for solo users
// nothing changes.
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await Promise.all([
      ensurePlanningOwnershipColumns(),
      ensureMealPlanCookedAtColumn(),
      ensureMealPlanBlocksTable(),
      ensureHouseholdTables(),
      ensureMealPilotTables(),
    ]);

    const body = await request.json();
    const membership = await getUserHousehold(currentUser.id);

    const result = await createMealPlanForUser({
      user: currentUser,
      householdId: membership?.household.id ?? null,
      input: body,
      path: requestPath(request),
      source: "meal_plan",
      logActivity: true,
    });
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json(result.plan, { status: 201 });
  } catch (error) {
    console.error("POST /api/meal-plans error:", error);
    return NextResponse.json(
      { error: "Failed to create meal plan" },
      { status: 500 }
    );
  }
}
