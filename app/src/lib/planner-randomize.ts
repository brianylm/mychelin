// Recipe-picking logic for planner randomization. Pure and unit-tested
// (planner-randomize.test.ts) — the UI feeds it the recipe list it
// already loads for the add-meal dialog.
//
// Weighting follows the existing "Surprise me" convention: flagged
// recipes (newly_added) come before unflagged ones, and within a
// weight class the least-recently-cooked recipes come first. Within
// the same weight + recency, order is shuffled. Picks never repeat a
// recipe until the whole pool has been used; when the pool is exhausted
// it reshuffles, avoiding an immediate repeat of the last pick at the
// boundary.

export interface RandomizableRecipe {
  id: number;
  title: string;
  recipeFlags?: string[];
  lastCookedAt?: string | null;
}

type Rng = () => number;

function flagPriority(recipe: RandomizableRecipe): number {
  const flags = recipe.recipeFlags ?? [];
  if (flags.includes("newly_added")) return 1;
  return 0;
}

function lastCookedValue(recipe: RandomizableRecipe): number {
  if (!recipe.lastCookedAt) return 0;
  const t = new Date(recipe.lastCookedAt).getTime();
  return Number.isNaN(t) ? 0 : t;
}

function shuffled<T>(items: T[], rng: Rng): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Sorts the pool into pick order: flag priority desc, then least
// recently cooked first, with ties shuffled.
function orderedPool(recipes: RandomizableRecipe[], rng: Rng): RandomizableRecipe[] {
  return shuffled(recipes, rng).sort(
    (a, b) =>
      flagPriority(b) - flagPriority(a) ||
      lastCookedValue(a) - lastCookedValue(b)
  );
}

// Returns up to `count` recipes in pick order. See header for the
// no-repeat and reshuffle rules.
export function pickRecipesForSlots(input: {
  recipes: RandomizableRecipe[];
  count: number;
  rng?: Rng;
}): RandomizableRecipe[] {
  const { recipes, count } = input;
  const rng = input.rng ?? Math.random;
  if (count <= 0 || recipes.length === 0) return [];

  const picks: RandomizableRecipe[] = [];
  let pool = orderedPool(recipes, rng);

  while (picks.length < count) {
    if (pool.length === 0) {
      pool = orderedPool(recipes, rng);
      // Avoid repeating the previous pick right at the reshuffle
      // boundary when the pool has more than one recipe.
      if (pool.length > 1 && pool[0].id === picks[picks.length - 1].id) {
        [pool[0], pool[1]] = [pool[1], pool[0]];
      }
    }
    picks.push(pool.shift()!);
  }

  return picks;
}

// Slots the time-frame randomize fills — snacks stay manual.
export const RANDOMIZE_MEAL_TYPES = ["breakfast", "lunch", "dinner"] as const;

export interface SlotRef {
  date: string;
  mealType: string;
}

// Computes which slots in the visible range a time-frame randomize
// should fill: right meal types, no existing plan, not blocked.
export function findFillableSlots(input: {
  dates: string[];
  mealTypes?: readonly string[];
  plans: Array<{ date: string; mealType: string }>;
  blocks: Array<{ date: string; mealType: string }>;
}): SlotRef[] {
  const mealTypes = input.mealTypes ?? RANDOMIZE_MEAL_TYPES;
  const occupied = new Set(input.plans.map((p) => `${p.date}|${p.mealType}`));
  const blocked = new Set(input.blocks.map((b) => `${b.date}|${b.mealType}`));
  const slots: SlotRef[] = [];
  for (const date of input.dates) {
    for (const mealType of mealTypes) {
      const key = `${date}|${mealType}`;
      if (!occupied.has(key) && !blocked.has(key)) {
        slots.push({ date, mealType });
      }
    }
  }
  return slots;
}
