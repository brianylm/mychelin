import { describe, expect, it } from "vitest";
import type { MealGroupView } from "@/lib/meal-pilot/types";
import { describeWhen, findNextMeal, type LoosePlan } from "./next-meal";

const now = new Date("2026-10-18T17:00:00"); // local time

function group(over: Partial<MealGroupView> & { serveAt: string }): MealGroupView {
  return {
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
    dishes: [
      {
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
      },
    ],
    timing: { durationMinutes: null, missingTiming: true, startAt: null },
    conflicts: [],
    syncState: "disabled",
    ...over,
  } as MealGroupView;
}

const loose = (over: Partial<LoosePlan>): LoosePlan => ({
  id: 50,
  date: "2026-10-18",
  mealType: "dinner",
  recipeId: 200,
  title: "Greens",
  cookedAt: null,
  ...over,
});

describe("findNextMeal", () => {
  it("picks the earliest upcoming meal and lists what to cook", () => {
    const next = findNextMeal(
      [group({ serveAt: new Date("2026-10-18T19:00:00").toISOString() })],
      [loose({ date: "2026-10-19", mealType: "lunch" })],
      now
    );
    expect(next?.mealType).toBe("dinner");
    expect(next?.toCook).toEqual([{ recipeId: 101, mealPlanId: 11 }]);
    expect(next?.dinerCount).toBe(2);
  });

  it("keeps a meal for 90 minutes after serving, then moves on", () => {
    const served = group({ serveAt: new Date("2026-10-18T16:00:00").toISOString() });
    expect(findNextMeal([served], [], now)).not.toBeNull();
    expect(findNextMeal([served], [], new Date("2026-10-18T17:31:00"))).toBeNull();
  });

  it("skips confirmed meals, cooked loose dishes and grouped loose rows", () => {
    expect(
      findNextMeal(
        [group({ serveAt: new Date("2026-10-18T19:00:00").toISOString(), status: "confirmed" })],
        [loose({ cookedAt: "2026-10-18T12:00:00Z" }), loose({ id: 51, mealGroupId: 1 })],
        now
      )
    ).toBeNull();
  });

  it("groups loose dishes in one slot into one meal", () => {
    const next = findNextMeal([], [loose({}), loose({ id: 51, recipeId: 201, title: "Soup" })], now);
    expect(next?.titles).toEqual(["Greens", "Soup"]);
    expect(next?.toCook).toHaveLength(2);
  });
});

describe("describeWhen", () => {
  it("names today and tomorrow plainly", () => {
    expect(describeWhen(new Date("2026-10-18T19:00:00"), now)).toBe("Tonight");
    expect(describeWhen(new Date("2026-10-19T12:30:00"), now)).toBe("Tomorrow afternoon");
  });
});
