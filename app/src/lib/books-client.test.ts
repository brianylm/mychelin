import { describe, expect, it } from "vitest";
import { adjustBookRecipeCounts, type BookSummary } from "./books-client";

const books: BookSummary[] = [
  {
    id: 1,
    title: "Weeknight dinners",
    description: null,
    coverEmoji: "🍲",
    coverColor: "amber",
    recipeCount: 2,
  },
  {
    id: 2,
    title: "Family favourites",
    description: null,
    coverEmoji: "📚",
    coverColor: "rose",
    recipeCount: 4,
  },
];

describe("adjustBookRecipeCounts", () => {
  it("updates only the affected book counts", () => {
    expect(
      adjustBookRecipeCounts(books, new Map([
        [1, 1],
        [2, 2],
      ]))
    ).toEqual([
      { ...books[0], recipeCount: 3 },
      { ...books[1], recipeCount: 6 },
    ]);
  });

  it("does not allow a count to fall below zero", () => {
    expect(adjustBookRecipeCounts(books, new Map([[1, -10]]))?.[0].recipeCount).toBe(0);
  });
});
