import { afterEach, describe, expect, it, vi } from "vitest";
import { loadNextMeal } from "./NextMealCard";

const now = new Date("2026-10-18T17:00:00");

afterEach(() => vi.unstubAllGlobals());

describe("loadNextMeal", () => {
  it("returns the earliest meal from meal groups and loose plans", async () => {
    const fetchStub = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.startsWith("/api/meal-groups")) {
        return new Response(JSON.stringify({ mealGroups: [{
          id: 1,
          revision: 1,
          date: "2026-10-18",
          mealType: "dinner",
          timezone: "Asia/Singapore",
          dinerCount: 2,
          durationOverrideMinutes: null,
          defrostAtOverride: null,
          status: "planned",
          confirmedAt: null,
          dishes: [{
            source: "fresh",
            mealPlanId: 11,
            recipeId: 101,
            title: "Rice",
            yieldText: null,
            prepTime: null,
            cookTime: null,
            servingsMultiplier: 1,
            targetPortions: 2,
            plannedOutput: null,
            cookedAt: null,
            stations: [],
            dishTypes: [],
          }],
          timing: { durationMinutes: null, missingTiming: true, startAt: null },
          conflicts: [],
          syncState: "disabled",
          serveAt: "2026-10-18T19:00:00",
        }] }), { status: 200 });
      }
      return new Response(JSON.stringify({ plans: [{
        id: 50, date: "2026-10-19", mealType: "lunch", recipeId: 200,
        cookedAt: null, mealGroupId: null, recipe: { title: "Greens" },
      }] }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchStub);

    const meal = await loadNextMeal(now);

    expect(meal?.mealType).toBe("dinner");
    expect(meal?.titles).toEqual(["Rice"]);
    expect(meal?.toCook).toEqual([{ recipeId: 101, mealPlanId: 11 }]);
  });

  it("returns null when both responses are empty", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ mealGroups: [], plans: [] }), { status: 200 })));

    await expect(loadNextMeal(now)).resolves.toBeNull();
  });
});
