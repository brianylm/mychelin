import { describe, expect, it } from "vitest";
import { searchRecipes } from "./recipe-search";

const recipes = [
  { id: 1, title: "Chicken Curry", cuisine: "Indian", description: null, ingredients: ["chicken thigh", "curry powder"] },
  { id: 2, title: "Mee Rebus", cuisine: "Malay", description: "Noodles in gravy", ingredients: ["taucheo", "yellow noodles"] },
  { id: 3, title: "Fried Rice", cuisine: "Chinese", description: null, ingredients: ["chicken stock", "egg"] },
  { id: 4, title: "Crème Brûlée", cuisine: "French", description: null, ingredients: ["cream"] },
];

const ids = (q: string) => searchRecipes(recipes, q).map((h) => h.recipe.id);

describe("searchRecipes", () => {
  it("tolerates a typo", () => {
    expect(ids("chiken curry")).toEqual([1]);
  });
  it("matches prefixes", () => {
    expect(ids("curr")).toContain(1);
    expect(ids("curry")).toContain(1);
  });
  it("matches ingredients and reports which", () => {
    const hits = searchRecipes(recipes, "taucheo");
    expect(hits.map((h) => h.recipe.id)).toEqual([2]);
    expect(hits[0].matchedIngredient).toBe("taucheo");
  });
  it("returns nothing for unrelated text", () => {
    expect(ids("xyz")).toEqual([]);
  });
  it("does not fuzzy-match short tokens", () => {
    expect(ids("ab")).toEqual([]);
    expect(ids("egh")).toEqual([]);
  });
  it("ranks title matches above ingredient matches", () => {
    expect(ids("chicken")).toEqual([1, 3]);
    const hits = searchRecipes(recipes, "chicken");
    expect(hits[0].score).toBeGreaterThan(hits[1].score);
  });
  it("strips accents and punctuation", () => {
    expect(ids("creme brulee")).toEqual([4]);
  });
  it("requires all tokens", () => {
    expect(ids("chicken rice")).toEqual([3]);
  });
});
