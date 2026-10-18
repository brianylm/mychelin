import { describe, expect, it } from "vitest";
import { classifyDish, effectiveDishTypes, parseDishTypes } from "./dish-type";

describe("classifyDish", () => {
  it.each([
    ["Steamed fish", [], ["seafood"]],
    ["Chicken rice", ["chicken", "rice", "garlic"], ["meat", "carb"]],
    ["Stir-fried kailan", ["kai lan", "garlic", "oyster sauce"], ["vegetable"]],
    ["Tomato egg", ["tomato", "eggs", "sugar"], ["egg", "vegetable"]],
    ["Mapo tofu", ["tofu", "minced pork", "chilli bean paste"], ["meat", "tofu"]],
    ["Lotus root soup", ["lotus root", "pork ribs"], ["meat", "vegetable", "soup"]],
    ["Fried bee hoon", ["bee hoon", "egg", "bean sprouts"], ["egg", "vegetable", "carb"]],
  ])("%s -> %j", (title, ingredients, expected) => {
    expect(classifyDish({ title, ingredients })).toEqual(expected);
  });

  it("ignores seasonings and stocks that only name a protein", () => {
    expect(
      classifyDish({
        title: "Garlic kangkong",
        ingredients: ["kangkong", "fish sauce", "chicken stock", "dried shrimp", "belacan"],
      })
    ).toEqual(["vegetable"]);
  });

  it("does not count egg noodles as egg or rice wine as a carb", () => {
    expect(classifyDish({ title: "Wanton mee", ingredients: ["egg noodles", "char siu"] })).toEqual([
      "meat",
      "carb",
    ]);
    expect(classifyDish({ title: "Drunken chicken", ingredients: ["chicken", "rice wine"] })).toEqual([
      "meat",
    ]);
  });

  it("returns nothing when it cannot tell", () => {
    expect(classifyDish({ title: "Ah Ma's special", ingredients: ["salt", "sugar"] })).toEqual([]);
  });
});

describe("overrides", () => {
  it("prefers a saved override, even an empty one", () => {
    expect(effectiveDishTypes({ title: "Steamed fish", override: '["vegetable"]' })).toEqual([
      "vegetable",
    ]);
    expect(effectiveDishTypes({ title: "Steamed fish", override: "[]" })).toEqual([]);
    expect(effectiveDishTypes({ title: "Steamed fish", override: null })).toEqual(["seafood"]);
  });

  it("drops unknown types and duplicates", () => {
    expect(parseDishTypes(["meat", "dessert", "meat"])).toEqual(["meat"]);
    expect(parseDishTypes("not json")).toBeNull();
  });
});
