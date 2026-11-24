import { describe, expect, it } from "vitest";
import { dedupeIngredients, dedupeRecipeIngredients, normalizeIngredientName } from "./ingredient-dedupe";

describe("dedupeIngredients", () => {
  it("sums same name and unit", () => {
    const result = dedupeIngredients([
      { name: "Soy sauce", quantity: 2, unit: "tbsp" },
      { name: "soy sauce ", quantity: 1, unit: "tablespoon" },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ name: "Soy sauce", quantity: 3, unit: "tbsp" });
  });

  it("keeps different units apart", () => {
    const result = dedupeIngredients([
      { name: "Sugar", quantity: 1, unit: "tsp" },
      { name: "Sugar", quantity: 1, unit: "tbsp" },
    ]);
    expect(result).toHaveLength(2);
  });

  it("matches simple plurals and unitless counts", () => {
    expect(normalizeIngredientName("Onions")).toBe("onion");
    expect(normalizeIngredientName("Tomatoes")).toBe("tomato");
    expect(normalizeIngredientName("Asparagus")).toBe("asparagus");
    const result = dedupeIngredients([
      { name: "Onion", quantity: 1 },
      { name: "onions", quantity: 2 },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].quantity).toBe(3);
  });

  it("merges approximate entries only with identical text", () => {
    const same = dedupeIngredients([
      { name: "Salt", approximate: true, quantityText: "to taste" },
      { name: "salt", approximate: true, quantityText: "To taste" },
    ]);
    expect(same).toHaveLength(1);
    const different = dedupeIngredients([
      { name: "Salt", approximate: true, quantityText: "to taste" },
      { name: "Salt", approximate: true, quantityText: "a pinch" },
      { name: "Salt", quantity: 1, unit: "tsp" },
    ]);
    expect(different).toHaveLength(3);
  });

  it("keeps a bare entry apart from a measured one and never merges unnamed", () => {
    expect(dedupeIngredients([{ name: "Salt" }, { name: "Salt", quantity: 1, unit: "tsp" }])).toHaveLength(2);
    expect(dedupeIngredients([{ name: "" }, { name: "" }])).toHaveLength(2);
  });

  it("combines notes without repeating and keeps first-seen order", () => {
    const result = dedupeIngredients([
      { name: "Garlic", quantity: 2, unit: "clove", notes: "minced" },
      { name: "Ginger", quantity: 1, unit: "tsp" },
      { name: "Garlic", quantity: 1, unit: "clove", notes: "Minced, fresh" },
    ]);
    expect(result.map((i) => i.name)).toEqual(["Garlic", "Ginger"]);
    expect(result[0]).toMatchObject({ quantity: 3, notes: "minced, fresh" });
  });
});

describe("dedupeRecipeIngredients", () => {
  it("dedupes an AI-shaped result and leaves the rest alone", () => {
    const recipe = {
      title: "Stir fry",
      ingredients: [
        { name: "soy sauce", quantity: 2, unit: "tbsp", notes: "" },
        { name: "sugar", quantity: 1, unit: "tsp", notes: "" },
        { name: "Soy Sauce", quantity: 1, unit: "tbsp", notes: "" },
        { name: "sugar", quantity: 1, unit: "tbsp", notes: "" },
      ],
      instructions: [{ stepNumber: 1, content: "Mix." }],
    };
    const out = dedupeRecipeIngredients(recipe);
    expect(out.ingredients).toHaveLength(3);
    expect(out.ingredients[0]).toMatchObject({ name: "soy sauce", quantity: 3, unit: "tbsp", notes: "" });
    expect(out.instructions).toEqual(recipe.instructions);
  });

  it("passes through non-recipe values", () => {
    expect(dedupeRecipeIngredients(null)).toBeNull();
    expect(dedupeRecipeIngredients({ title: "x" })).toEqual({ title: "x" });
    const odd = { ingredients: ["a", "b"] };
    expect(dedupeRecipeIngredients(odd)).toBe(odd);
  });
});
