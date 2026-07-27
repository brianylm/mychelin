// Helpers for showing logged cook attempts in the meal-plan calendar.
// Extracted from MealPlanView / the meal-plans API so the behavior is
// unit-testable (see planner-logged-meals.test.ts).

export interface LoggedAttempt {
  id: number;
  recipeId: number;
  cookedAt: string;
  notes: string | null;
  mealPlanId: number | null;
  recipeTitle: string;
}

export interface CalendarMealEntry {
  id: number;
  date: string;
  mealType: string;
  recipeId: number;
  servings: number;
  notes: string | null;
  cookedAt: string | null;
  recipe?: { id: number; title: string; yield: string | null };
  // True when this entry comes from a logged cook attempt rather than a
  // planned meal. Logged entries are read-only in the calendar.
  loggedAttempt?: boolean;
}

const VALID_MEAL_TYPES = new Set(["breakfast", "lunch", "dinner", "snack"]);

// Attempts have no meal type — infer the slot from the local time of day.
export function inferMealType(cookedAt: string): string {
  const hour = new Date(cookedAt).getHours();
  if (Number.isNaN(hour)) return "snack";
  if (hour < 10) return "breakfast";
  if (hour < 15) return "lunch";
  if (hour < 21) return "dinner";
  return "snack";
}

// Shift a "YYYY-MM-DD" date key by whole days, staying in UTC so the
// result never drifts across DST.
export function shiftDateKey(dateKey: string, days: number): string {
  const d = new Date(dateKey + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function toLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Turns cook attempts into read-only calendar entries so the plan shows
// what was actually cooked, not just what was planned. Attempts tied to
// a plan that is visible in this range are skipped — the plan row
// itself carries the cooked state. Attempt timestamps are UTC ISO and
// are bucketed into local calendar dates here.
export function mergeLoggedAttempts(input: {
  plans: Array<{ id: number }>;
  attempts: LoggedAttempt[];
  visibleDates: string[];
}): CalendarMealEntry[] {
  const { plans, attempts, visibleDates } = input;
  const visible = new Set(visibleDates);
  const plannedIds = new Set(plans.map((p) => p.id));
  const entries: CalendarMealEntry[] = [];

  for (const attempt of attempts) {
    if (attempt.mealPlanId && plannedIds.has(attempt.mealPlanId)) continue;
    const cookedDate = new Date(attempt.cookedAt);
    if (Number.isNaN(cookedDate.getTime())) continue;
    const dateKey = toLocalDateKey(cookedDate);
    if (!visible.has(dateKey)) continue;
    const mealType = inferMealType(attempt.cookedAt);
    entries.push({
      // Negative id keeps logged entries from colliding with plan ids
      // in React keys and in removal handlers.
      id: -attempt.id,
      date: dateKey,
      mealType: VALID_MEAL_TYPES.has(mealType) ? mealType : "snack",
      recipeId: attempt.recipeId,
      servings: 1,
      notes: attempt.notes,
      cookedAt: attempt.cookedAt,
      recipe: { id: attempt.recipeId, title: attempt.recipeTitle, yield: null },
      loggedAttempt: true,
    });
  }

  return entries;
}
