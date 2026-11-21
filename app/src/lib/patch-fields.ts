/**
 * Copy only the named keys from an untrusted PATCH body.
 *
 * Child-row routes (ingredients, instructions) check edit access on the
 * recipe in the URL, so the body must never set id or recipeId: that would
 * move the row into a recipe the caller cannot edit.
 */
export function pickPatchFields<K extends string>(
  body: unknown,
  allowed: readonly K[]
): Partial<Record<K, unknown>> {
  if (!body || typeof body !== "object" || Array.isArray(body)) return {};
  const source = body as Record<string, unknown>;
  const picked: Partial<Record<K, unknown>> = {};
  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(source, key) && source[key] !== undefined) {
      picked[key] = source[key];
    }
  }
  return picked;
}

export const INGREDIENT_PATCH_FIELDS = [
  "catalogIngredientId",
  "name",
  "quantity",
  "unit",
  "approximate",
  "quantityText",
  "notes",
  "sortOrder",
] as const;

export const INSTRUCTION_PATCH_FIELDS = ["stepNumber", "content", "tip", "imageUrl"] as const;
