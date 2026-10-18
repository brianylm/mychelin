import { describe, it, expect } from "vitest";
import { getMealCookingDuration, type MealTimingDish } from "./meal-cooking-duration";

describe("getMealCookingDuration", () => {
  it("uses the longest fresh dish plus buffer and ignores fridge/frozen", () => {
    const dishes: MealTimingDish[] = [
      { source: "fresh", prepTime: 30, cookTime: 0 },
      { source: "fresh", prepTime: 15, cookTime: 30 },
      { source: "frozen", prepTime: 90, cookTime: 60 },
      { source: "fridge", prepTime: 40, cookTime: 40 },
    ];

    expect(getMealCookingDuration(dishes)).toEqual({
      durationMinutes: 60,
      missingTiming: false,
    });
  });

  it("adds the 15 minute buffer to a single fresh dish", () => {
    expect(
      getMealCookingDuration([{ source: "fresh", prepTime: 10, cookTime: 20 }]),
    ).toEqual({ durationMinutes: 45, missingTiming: false });
  });

  it("returns null without flagging missing timing when there are no fresh dishes", () => {
    const dishes: MealTimingDish[] = [
      { source: "fridge", prepTime: null, cookTime: null },
      { source: "frozen", prepTime: null, cookTime: 60 },
    ];

    expect(getMealCookingDuration(dishes)).toEqual({
      durationMinutes: null,
      missingTiming: false,
    });
    expect(getMealCookingDuration(dishes, 120)).toEqual({
      durationMinutes: null,
      missingTiming: false,
    });
  });

  it("honours a valid override even when fresh timings are missing", () => {
    const dishes: MealTimingDish[] = [{ source: "fresh", prepTime: null, cookTime: null }];

    expect(getMealCookingDuration(dishes, 90)).toEqual({
      durationMinutes: 90,
      missingTiming: false,
    });
  });

  it("flags missing timing when a fresh dish has null prep or cook time", () => {
    expect(
      getMealCookingDuration([{ source: "fresh", prepTime: null, cookTime: 30 }]),
    ).toEqual({ durationMinutes: null, missingTiming: true });
    expect(
      getMealCookingDuration([{ source: "fresh", prepTime: 30, cookTime: null }]),
    ).toEqual({ durationMinutes: null, missingTiming: true });
  });

  it("flags missing timing for NaN, Infinity, or negative values", () => {
    expect(
      getMealCookingDuration([{ source: "fresh", prepTime: Number.NaN, cookTime: 30 }]),
    ).toEqual({ durationMinutes: null, missingTiming: true });
    expect(
      getMealCookingDuration([
        { source: "fresh", prepTime: 10, cookTime: Number.POSITIVE_INFINITY },
      ]),
    ).toEqual({ durationMinutes: null, missingTiming: true });
    expect(
      getMealCookingDuration([{ source: "fresh", prepTime: -5, cookTime: 30 }]),
    ).toEqual({ durationMinutes: null, missingTiming: true });
    expect(
      getMealCookingDuration([{ source: "fresh", prepTime: 0, cookTime: 0 }]),
    ).toEqual({ durationMinutes: null, missingTiming: true });
  });

  it("ignores an invalid override and falls back to dish timings", () => {
    const dishes: MealTimingDish[] = [{ source: "fresh", prepTime: 10, cookTime: 20 }];

    for (const invalidOverride of [0, -15, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(getMealCookingDuration(dishes, invalidOverride)).toEqual({
        durationMinutes: 45,
        missingTiming: false,
      });
    }

    expect(
      getMealCookingDuration(
        [{ source: "fresh", prepTime: null, cookTime: null }],
        Number.NaN,
      ),
    ).toEqual({ durationMinutes: null, missingTiming: true });
  });

  it("does not mutate the input dishes", () => {
    const dishes: MealTimingDish[] = [
      { source: "fresh", prepTime: 30, cookTime: 15 },
      { source: "frozen", prepTime: null, cookTime: null },
    ];
    const snapshot = JSON.parse(JSON.stringify(dishes));

    getMealCookingDuration(dishes, 20);
    getMealCookingDuration(dishes);

    expect(dishes).toEqual(snapshot);
  });
});
