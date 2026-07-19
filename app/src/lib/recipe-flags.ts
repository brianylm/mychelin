export const RECIPE_FLAG_OPTIONS = [
  {
    value: "newly_added",
    label: "New",
    shortLabel: "New",
    description: "Recipes that still need a first pass or cleanup.",
  },
  {
    value: "try_soon",
    label: "Try soon",
    shortLabel: "Try soon",
    description: "Recipes to prioritize when planning meals.",
  },
] as const;

export type RecipeFlag = (typeof RECIPE_FLAG_OPTIONS)[number]["value"];

const VALID_RECIPE_FLAGS = new Set<string>(
  RECIPE_FLAG_OPTIONS.map((option) => option.value)
);

export function normalizeRecipeFlags(input: unknown): RecipeFlag[] {
  if (!Array.isArray(input)) return [];
  const normalized: RecipeFlag[] = [];
  for (const item of input) {
    if (typeof item !== "string") continue;
    if (!VALID_RECIPE_FLAGS.has(item)) continue;
    const flag = item as RecipeFlag;
    if (!normalized.includes(flag)) normalized.push(flag);
  }
  return normalized;
}

export function recipeFlagLabel(flag: RecipeFlag): string {
  return RECIPE_FLAG_OPTIONS.find((option) => option.value === flag)?.label ?? flag;
}

export function recipeFlagShortLabel(flag: RecipeFlag): string {
  return RECIPE_FLAG_OPTIONS.find((option) => option.value === flag)?.shortLabel ?? recipeFlagLabel(flag);
}
