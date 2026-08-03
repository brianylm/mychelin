import { describe, it, expect } from "vitest";
import { matchIngredientsForStep, stepEncompassesAll } from "./step-ingredient-amounts";

function names(result: Array<{ name: string }>): string[] {
  return result.map((item) => item.name);
}

const xiaoBaiCai = [
  { name: "xiao bai cai", notes: "washed; stems separated from leaves" },
  { name: "garlic", notes: "minced" },
  { name: "cooking oil" },
  { name: "light soy sauce" },
  { name: "water" },
];

describe("matchIngredientsForStep — base matching", () => {
  it("matches an ingredient named in a step", () => {
    expect(names(matchIngredientsForStep("Fry garlic until fragrant", xiaoBaiCai))).toContain("garlic");
  });

  it("matches a multi-word phrase in a step", () => {
    expect(names(matchIngredientsForStep("Add the light soy sauce and toss", xiaoBaiCai))).toContain("light soy sauce");
  });
});

describe("matchIngredientsForStep — semantic hints", () => {
  it("uses ingredient notes to resolve implicit references (stems → xiao bai cai)", () => {
    const result = names(matchIngredientsForStep("Add the stems and stir-fry for 1 minute", xiaoBaiCai));
    expect(result).toContain("xiao bai cai");
  });

  it("uses ingredient notes for plant parts (leaves → xiao bai cai)", () => {
    const result = names(matchIngredientsForStep("Add the leaves, soy sauce and water", xiaoBaiCai));
    expect(result).toContain("xiao bai cai");
  });

  it("resolves an unambiguous generic token (oil → cooking oil)", () => {
    const result = names(matchIngredientsForStep("Heat the oil in a wok", xiaoBaiCai));
    expect(result).toContain("cooking oil");
  });

  it("skips an ambiguous generic token (sauce with several sauces)", () => {
    const ingredients = [
      { name: "dark soy sauce" },
      { name: "light soy sauce" },
      { name: "garlic" },
    ];
    const result = names(matchIngredientsForStep("Add the sauce and stir", ingredients));
    expect(result).not.toContain("dark soy sauce");
    expect(result).not.toContain("light soy sauce");
  });

  it("infers oil from a frying step even when it is not named", () => {
    const ingredients = [
      { name: "yellow onion" },
      { name: "cooking oil" },
      { name: "eggs" },
    ];
    const result = names(matchIngredientsForStep("Fry onions until soft", ingredients));
    expect(result).toContain("cooking oil");
    expect(result).toContain("yellow onion");
  });

  it("does not infer oil when the recipe has two oils (ambiguous)", () => {
    const ingredients = [
      { name: "cooking oil" },
      { name: "sesame oil" },
      { name: "yellow onion" },
    ];
    const result = names(matchIngredientsForStep("Fry the onions", ingredients));
    expect(result).not.toContain("cooking oil");
    expect(result).not.toContain("sesame oil");
  });

  it("resolves a category word to the actual ingredients (aromatics)", () => {
    const ingredients = [
      { name: "garlic" },
      { name: "shallot" },
      { name: "pork belly" },
    ];
    const result = names(matchIngredientsForStep("Fry the aromatics until fragrant", ingredients));
    expect(result).toContain("garlic");
    expect(result).toContain("shallot");
    expect(result).not.toContain("pork belly");
  });
});

describe("stepEncompassesAll", () => {
  it("fires on whole-dish phrases", () => {
    expect(stepEncompassesAll("Add everything to the pot and pressure cook 20 min")).toBe(true);
    expect(stepEncompassesAll("Mix well and serve")).toBe(true);
    expect(stepEncompassesAll("Add all of it and stir together")).toBe(true);
  });

  it("does not fire on a specific subset phrase", () => {
    expect(stepEncompassesAll("Combine all the dry ingredients")).toBe(false);
  });

  it("returns every ingredient for a whole-dish step", () => {
    const result = names(matchIngredientsForStep("Add everything and mix well", xiaoBaiCai));
    expect(result).toEqual(xiaoBaiCai.map((ing) => ing.name));
  });
});
