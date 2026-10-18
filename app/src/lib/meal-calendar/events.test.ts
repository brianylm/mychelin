import { describe, expect, it } from "vitest";
import type { CalendarMealSource } from "./types";
import {
  buildCalendarActivities,
  deterministicGoogleEventId,
  MissingMealTimingError,
} from "./events";

function source(overrides: Partial<CalendarMealSource["mealGroup"]> = {}): CalendarMealSource {
  return {
    mealGroup: {
      id: 41,
      revision: 3,
      date: "2026-10-20",
      mealType: "dinner",
      serveAt: "2026-10-20T11:00:00.000Z",
      timezone: "Asia/Singapore",
      dinerCount: 2,
      durationOverrideMinutes: null,
      defrostAtOverride: null,
      status: "planned",
      confirmedAt: null,
      ...overrides,
    },
    dishes: [
      {
        source: "fresh",
        mealPlanId: 1,
        recipeId: 11,
        title: "Greens",
        yieldText: "2 servings",
        prepTime: 10,
        cookTime: 20,
        servingsMultiplier: 1,
        targetPortions: 2,
        plannedOutput: null,
        cookedAt: null,
        stations: [],
        dishTypes: [],
      },
      {
        source: "fresh",
        mealPlanId: 2,
        recipeId: 12,
        title: "Steamed fish",
        yieldText: "2 servings",
        prepTime: 15,
        cookTime: 30,
        servingsMultiplier: 1,
        targetPortions: 2,
        plannedOutput: null,
        cookedAt: null,
        stations: [],
        dishTypes: [],
      },
      {
        source: "frozen",
        reservationId: 8,
        batchId: 4,
        lotId: 7,
        title: "Winter melon soup",
        recipeId: null,
        plannedPortions: 2,
        consumedPortions: 0,
        reservationStatus: "reserved",
        reheatNotes: "Warm gently before serving.",
        useByDate: null,
        stations: [],
        dishTypes: [],
      },
    ],
  };
}

describe("meal calendar activity generation", () => {
  it("builds one longest-dish cooking block plus one prior defrost reminder", () => {
    const activities = buildCalendarActivities(source(), {
      appBaseUrl: "https://mychelin.example",
    });
    expect(activities).toHaveLength(2);
    expect(activities[0]).toMatchObject({
      kind: "cooking",
      startAt: "2026-10-20T10:00:00.000Z",
      endAt: "2026-10-20T11:00:00.000Z",
    });
    expect(activities[0].description).toContain("Winter melon soup (frozen, 2 portions)");
    expect(activities[0].description).toContain("cookTogether=1");
    expect(activities[1]).toMatchObject({
      kind: "defrost",
      startAt: "2026-10-19T10:00:00.000Z",
      endAt: "2026-10-19T10:15:00.000Z",
    });
    expect(activities[1].description).toContain("Reminder to thaw ahead");
  });

  it("honours an explicit duration when fresh recipe timing is missing", () => {
    const value = source({ durationOverrideMinutes: 75 });
    const firstFresh = value.dishes[0];
    if (firstFresh.source === "fresh") firstFresh.prepTime = null;
    expect(buildCalendarActivities(value, { appBaseUrl: "https://example.test" })[0])
      .toMatchObject({ startAt: "2026-10-20T09:45:00.000Z" });
  });

  it("requires timing only when a fresh block has no valid override", () => {
    const value = source();
    const firstFresh = value.dishes[0];
    if (firstFresh.source === "fresh") firstFresh.prepTime = null;
    expect(() =>
      buildCalendarActivities(value, { appBaseUrl: "https://example.test" })
    ).toThrow(MissingMealTimingError);
  });

  it("creates no cooking event for a prepared-only meal", () => {
    const value = source();
    value.dishes = value.dishes.filter((dish) => dish.source === "frozen");
    expect(buildCalendarActivities(value, { appBaseUrl: "https://example.test" }))
      .toHaveLength(1);
  });

  it("uses a valid Google base32hex event id", async () => {
    const id = await deterministicGoogleEventId({
      connectionId: 3,
      mealGroupId: 41,
      kind: "cooking",
    });
    expect(id).toMatch(/^[0-9a-v]{5,1024}$/);
    await expect(
      deterministicGoogleEventId({ connectionId: 3, mealGroupId: 41, kind: "cooking" })
    ).resolves.toBe(id);
  });
});
