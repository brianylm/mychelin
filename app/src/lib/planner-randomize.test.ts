import { describe, it, expect } from "vitest";
import {
  pickRecipesForSlots,
  findFillableSlots,
  RANDOMIZE_MEAL_TYPES,
  type RandomizableRecipe,
} from "./planner-randomize";

// Deterministic RNG (mulberry32) so tests don't flake.
function seededRng(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function recipe(id: number, overrides: Partial<RandomizableRecipe> = {}): RandomizableRecipe {
  return { id, title: `Recipe ${id}`, ...overrides };
}

describe("pickRecipesForSlots", () => {
  it("returns [] for empty pool or non-positive count", () => {
    expect(pickRecipesForSlots({ recipes: [], count: 3 })).toEqual([]);
    expect(pickRecipesForSlots({ recipes: [recipe(1)], count: 0 })).toEqual([]);
  });

  it("never repeats a recipe until the pool is exhausted", () => {
    const recipes = [recipe(1), recipe(2), recipe(3), recipe(4)];
    const picks = pickRecipesForSlots({ recipes, count: 4, rng: seededRng(7) });
    expect(new Set(picks.map((r) => r.id)).size).toBe(4);
  });

  it("reshuffles past pool size without an immediate boundary repeat", () => {
    const recipes = [recipe(1), recipe(2), recipe(3)];
    for (const seed of [1, 2, 3, 42, 99]) {
      const picks = pickRecipesForSlots({ recipes, count: 7, rng: seededRng(seed) });
      expect(picks).toHaveLength(7);
      for (let i = 1; i < picks.length; i++) {
        // consecutive duplicates are only possible in general if the
        // pool has a single recipe; with 3, never
        expect(picks[i].id === picks[i - 1].id && recipes.length > 1).toBe(false);
      }
    }
  });

  it("puts newly_added recipes before unflagged ones", () => {
    const recipes = [
      recipe(1),
      recipe(2, { recipeFlags: ["newly_added"] }),
      recipe(3),
      recipe(4),
    ];
    const picks = pickRecipesForSlots({ recipes, count: 4, rng: seededRng(5) });
    expect(picks[0].id).toBe(2);
    expect([1, 3, 4]).toContain(picks[1].id);
    expect([1, 3, 4]).toContain(picks[2].id);
    expect([1, 3, 4]).toContain(picks[3].id);
  });

  it("prefers least-recently-cooked within the same flag class", () => {
    const recipes = [
      recipe(1, { lastCookedAt: "2026-07-25T10:00:00.000Z" }),
      recipe(2, { lastCookedAt: "2026-07-01T10:00:00.000Z" }),
      recipe(3), // never cooked = oldest
    ];
    const picks = pickRecipesForSlots({ recipes, count: 3, rng: seededRng(3) });
    expect(picks.map((r) => r.id)).toEqual([3, 2, 1]);
  });
});

describe("findFillableSlots", () => {
  const dates = ["2026-07-27", "2026-07-28"];

  it("fills only empty, unblocked breakfast/lunch/dinner slots", () => {
    const slots = findFillableSlots({
      dates,
      plans: [{ date: "2026-07-27", mealType: "lunch" }],
      blocks: [{ date: "2026-07-28", mealType: "dinner" }],
    });
    const keys = slots.map((s) => `${s.date}|${s.mealType}`);
    expect(keys).toHaveLength(2 * 3 - 2);
    expect(keys).not.toContain("2026-07-27|lunch");
    expect(keys).not.toContain("2026-07-28|dinner");
    expect(keys).toContain("2026-07-27|breakfast");
    expect(keys).toContain("2026-07-28|lunch");
  });

  it("never fills snack slots by default", () => {
    const slots = findFillableSlots({ dates, plans: [], blocks: [] });
    expect(slots.every((s) => (RANDOMIZE_MEAL_TYPES as readonly string[]).includes(s.mealType))).toBe(true);
    expect(slots.some((s) => s.mealType === "snack")).toBe(false);
  });

  it("respects a custom meal-type list (per-slot randomize)", () => {
    const slots = findFillableSlots({
      dates,
      mealTypes: ["snack"],
      plans: [],
      blocks: [{ date: "2026-07-27", mealType: "snack" }],
    });
    expect(slots.map((s) => `${s.date}|${s.mealType}`)).toEqual(["2026-07-28|snack"]);
  });
});
