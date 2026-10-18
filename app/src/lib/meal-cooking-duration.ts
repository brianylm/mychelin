export type MealTimingDish = {
  source: "fresh" | "fridge" | "frozen";
  prepTime: number | null;
  cookTime: number | null;
};

/**
 * Estimate how long a meal will take to cook, using only fresh dishes.
 *
 * The result is the longest single fresh dish (prep + cook) plus a 15 minute
 * buffer, or an explicit positive override. Fridge/frozen dishes are ignored
 * because their clocks start earlier, and dish times are never summed.
 *
 * Invalid overrides are ignored. Without a valid override, a fresh dish
 * missing usable timing produces `missingTiming: true` instead of a guess.
 */
export function getMealCookingDuration(
  dishes: readonly MealTimingDish[],
  overrideMinutes?: number | null,
): { durationMinutes: number | null; missingTiming: boolean } {
  const freshDishes = dishes.filter((dish) => dish.source === "fresh");

  if (freshDishes.length === 0) {
    return { durationMinutes: null, missingTiming: false };
  }

  if (
    typeof overrideMinutes === "number" &&
    Number.isFinite(overrideMinutes) &&
    overrideMinutes > 0
  ) {
    return { durationMinutes: overrideMinutes, missingTiming: false };
  }

  let longestDishMinutes = 0;

  for (const dish of freshDishes) {
    const { prepTime, cookTime } = dish;
    const hasValidPrep =
      typeof prepTime === "number" && Number.isFinite(prepTime) && prepTime >= 0;
    const hasValidCook =
      typeof cookTime === "number" && Number.isFinite(cookTime) && cookTime >= 0;

    if (!hasValidPrep || !hasValidCook) {
      return { durationMinutes: null, missingTiming: true };
    }

    const dishMinutes = prepTime + cookTime;

    if (dishMinutes <= 0) {
      return { durationMinutes: null, missingTiming: true };
    }

    if (dishMinutes > longestDishMinutes) {
      longestDishMinutes = dishMinutes;
    }
  }

  return { durationMinutes: longestDishMinutes + 15, missingTiming: false };
}
