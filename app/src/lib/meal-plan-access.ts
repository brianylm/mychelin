import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { mealPlans } from "@/db/schema";
import { isHouseholdMember } from "@/lib/households";

export type MealPlanRow = typeof mealPlans.$inferSelect;

// A plan row is accessible to the user when they own it (personal plan)
// OR when it belongs to a household they are a member of (shared plan).
// Every meal-plan write goes through this gate — household scoping must
// never rely on a client-supplied id alone.
export async function findAuthorizedPlan(planId: number, userId: number): Promise<MealPlanRow | null> {
  const plan = await db.query.mealPlans.findFirst({
    where: eq(mealPlans.id, planId),
  });
  if (!plan) return null;
  if (plan.userId === userId) return plan;
  if (plan.householdId != null && (await isHouseholdMember(userId, plan.householdId))) {
    return plan;
  }
  return null;
}

// Batch form of findAuthorizedPlan with the same rule, one read for the
// rows and one membership check per distinct household. Ids that do not
// exist or that the user may not touch are simply absent from the result.
export async function findAuthorizedPlans(planIds: number[], userId: number): Promise<MealPlanRow[]> {
  if (planIds.length === 0) return [];
  const rows = await db.select().from(mealPlans).where(inArray(mealPlans.id, planIds));
  const householdIds = [
    ...new Set(
      rows
        .filter((row) => row.userId !== userId && row.householdId != null)
        .map((row) => row.householdId as number)
    ),
  ];
  const memberOf = new Set<number>();
  for (const householdId of householdIds) {
    if (await isHouseholdMember(userId, householdId)) memberOf.add(householdId);
  }
  return rows.filter(
    (row) => row.userId === userId || (row.householdId != null && memberOf.has(row.householdId))
  );
}
