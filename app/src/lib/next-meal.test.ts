import { describe, expect, it } from "vitest";
import type { MealGroupView } from "@/lib/meal-pilot/types";
import { describeWhen, findNextMeal, localDateKey, type LoosePlan } from "./next-meal";

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
  it("says Tonight only for today's dinner", () => {
    expect(describeWhen({ date: "2026-10-18", mealType: "dinner" }, now)).toBe("Tonight · Dinner");
  });

  it("uses the meal type for other meals today, even late in the day", () => {
    expect(describeWhen({ date: "2026-10-18", mealType: "lunch" }, now)).toBe("Today · Lunch");
    expect(describeWhen({ date: "2026-10-18", mealType: "snack" }, new Date("2026-10-18T21:00:00"))).toBe("Today · Snack");
  });

  it("names tomorrow by meal type, including tomorrow's dinner", () => {
    expect(describeWhen({ date: "2026-10-19", mealType: "lunch" }, now)).toBe("Tomorrow · Lunch");
    expect(describeWhen({ date: "2026-10-19", mealType: "dinner" }, now)).toBe("Tomorrow · Dinner");
  });

  it("keys the day off the plan date, not the clock time", () => {
    // Just after midnight a late dinner from yesterday is still in grace.
    expect(describeWhen({ date: "2026-10-18", mealType: "dinner" }, new Date("2026-10-19T00:30:00"))).toBe("Yesterday · Dinner");
  });

  it("uses the weekday further out", () => {
    const weekday = new Date("2026-10-21T00:00:00").toLocaleDateString(undefined, { weekday: "long" });
    expect(describeWhen({ date: "2026-10-21", mealType: "breakfast" }, now)).toBe(`${weekday} · Breakfast`);
  });
});

describe("localDateKey", () => {
  it("formats the local calendar day", () => {
    expect(localDateKey(new Date("2026-01-05T23:59:00"))).toBe("2026-01-05");
  });
});
