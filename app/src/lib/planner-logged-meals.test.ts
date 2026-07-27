import { describe, it, expect } from "vitest";
import {
  inferMealType,
  shiftDateKey,
  mergeLoggedAttempts,
  type LoggedAttempt,
} from "./planner-logged-meals";

describe("inferMealType", () => {
  it("buckets by local hour", () => {
    expect(inferMealType("2026-07-27T07:30:00")).toBe("breakfast");
    expect(inferMealType("2026-07-27T09:59:00")).toBe("breakfast");
    expect(inferMealType("2026-07-27T12:00:00")).toBe("lunch");
    expect(inferMealType("2026-07-27T14:59:00")).toBe("lunch");
    expect(inferMealType("2026-07-27T19:00:00")).toBe("dinner");
    expect(inferMealType("2026-07-27T20:59:00")).toBe("dinner");
    expect(inferMealType("2026-07-27T23:30:00")).toBe("snack");
  });

  it("falls back to snack for invalid dates", () => {
    expect(inferMealType("not-a-date")).toBe("snack");
  });
});

describe("shiftDateKey", () => {
  it("shifts forward and backward across month boundaries", () => {
    expect(shiftDateKey("2026-07-27", 2)).toBe("2026-07-29");
    expect(shiftDateKey("2026-08-01", -2)).toBe("2026-07-30");
    expect(shiftDateKey("2026-01-01", -1)).toBe("2025-12-31");
  });
});

function attempt(overrides: Partial<LoggedAttempt>): LoggedAttempt {
  return {
    id: 1,
    recipeId: 10,
    cookedAt: "2026-07-27T11:00:00.000Z",
    notes: null,
    mealPlanId: null,
    recipeTitle: "Arrabiata",
    ...overrides,
  };
}

describe("mergeLoggedAttempts", () => {
  const plans = [{ id: 5 }];
  // Wide window so results don't depend on the test runner's timezone.
  const visibleDates = ["2026-07-26", "2026-07-27", "2026-07-28"];

  it("turns an unplanned attempt into a read-only calendar entry", () => {
    const entries = mergeLoggedAttempts({
      plans: [],
      attempts: [attempt({ id: 3 })],
      visibleDates,
    });
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      id: -3,
      recipeId: 10,
      servings: 1,
      loggedAttempt: true,
      recipe: { id: 10, title: "Arrabiata", yield: null },
    });
    expect(entries[0].cookedAt).toBe("2026-07-27T11:00:00.000Z");
    expect(["breakfast", "lunch", "dinner", "snack"]).toContain(entries[0].mealType);
  });

  it("skips attempts whose meal plan is already visible", () => {
    const entries = mergeLoggedAttempts({
      plans,
      attempts: [attempt({ mealPlanId: 5 })],
      visibleDates,
    });
    expect(entries).toHaveLength(0);
  });

  it("keeps attempts whose meal plan is not in view (e.g. deleted plan)", () => {
    const entries = mergeLoggedAttempts({
      plans,
      attempts: [attempt({ mealPlanId: 99 })],
      visibleDates,
    });
    expect(entries).toHaveLength(1);
  });

  it("drops attempts outside the visible dates", () => {
    const entries = mergeLoggedAttempts({
      plans: [],
      attempts: [attempt({ cookedAt: "2026-06-01T12:00:00.000Z" })],
      visibleDates,
    });
    expect(entries).toHaveLength(0);
  });

  it("drops attempts with invalid cookedAt", () => {
    const entries = mergeLoggedAttempts({
      plans: [],
      attempts: [attempt({ cookedAt: "garbage" })],
      visibleDates,
    });
    expect(entries).toHaveLength(0);
  });
});
