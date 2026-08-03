import { describe, it, expect } from "vitest";
import { recipeToMarkdown } from "./cooking-card-markdown";

const rows = [
  { name: "garlic", amount: "3 cloves" },
  { name: "rice", amount: "400 g" },
];

const steps = [
  {
    stepNumber: 1,
    title: "Fry",
    text: "garlic until fragrant",
    heat: "high" as const,
    timerText: null,
    matchedRowIndexes: [0],
    blockRowIndexes: [0],
  },
  {
    stepNumber: 2,
    title: "Add rice and soy sauce, toss",
    text: "Add rice and soy sauce, toss for 2 min",
    heat: null,
    timerText: "2 min",
    matchedRowIndexes: [1],
    blockRowIndexes: [1],
  },
];

describe("recipeToMarkdown", () => {
  it("renders title, meta, ingredients, and steps", () => {
    const md = recipeToMarkdown({
      title: "Fried Rice",
      cuisine: "Chinese",
      servingsLine: "Serves 4",
      rows,
      steps,
    });
    expect(md).toContain("# Fried Rice");
    expect(md).toContain("Cuisine: Chinese · Serves 4");
    expect(md).toContain("## Ingredients");
    expect(md).toContain("- 3 cloves garlic");
    expect(md).toContain("- 400 g rice");
    expect(md).toContain("## Steps");
    expect(md).toContain("1. Fry — garlic until fragrant");
    expect(md).toContain("2. Add rice and soy sauce, toss for 2 min");
  });

  it("omits empty sections", () => {
    const md = recipeToMarkdown({ title: "Bare", rows: [], steps: [] });
    expect(md).toBe("# Bare");
  });

  it("skips the meta line when there is nothing to say", () => {
    const md = recipeToMarkdown({ title: "Solo", rows, steps: [] });
    expect(md).not.toContain("Cuisine:");
    expect(md).not.toContain("Serves");
  });

  it("excludes the synthetic combine column from the copied steps", () => {
    const md = recipeToMarkdown({
      title: "Combined",
      rows,
      steps: [
        { stepNumber: 1, title: "Fry", text: "garlic until fragrant", heat: null, timerText: null, matchedRowIndexes: [0], blockRowIndexes: [0] },
        { stepNumber: 2, title: "Combine all", text: "", heat: null, timerText: null, matchedRowIndexes: [0, 1], blockRowIndexes: [0, 1], combine: true },
      ],
    });
    expect(md).toContain("1. Fry — garlic until fragrant");
    expect(md).not.toContain("Combine all");
  });
});
