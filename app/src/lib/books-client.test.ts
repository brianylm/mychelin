import { describe, expect, it } from "vitest";
import {
  addBookRecipeMemberships,
  bookTitlesForRecipe,
  removeBookRecipeMemberships,
  type BookSummary,
} from "./books-client";

const books: BookSummary[] = [
  {
    id: 1,
    title: "Weeknight dinners",
    description: null,
    coverEmoji: "🍲",
    coverColor: "amber",
    recipeCount: 2,
    recipeIds: [10, 11],
  },
  {
    id: 2,
    title: "Family favourites",
    description: null,
    coverEmoji: "📚",
    coverColor: "rose",
    recipeCount: 4,
    recipeIds: [20, 21, 22, 23],
  },
];

describe("book membership cache helpers", () => {
  it("adds memberships idempotently and derives a count from recipe ids", () => {
    expect(
      addBookRecipeMemberships(books, new Map([
        [1, [11, 12]],
        [2, [24]],
      ]))
    ).toEqual([
      { ...books[0], recipeCount: 3, recipeIds: [10, 11, 12] },
      { ...books[1], recipeCount: 5, recipeIds: [20, 21, 22, 23, 24] },
    ]);
  });

  it("removes memberships and updates visible book titles", () => {
    const updated = removeBookRecipeMemberships(books, new Map([[1, [10]]]));
    expect(updated?.[0]).toEqual({ ...books[0], recipeCount: 1, recipeIds: [11] });
    expect(bookTitlesForRecipe(books, 11)).toEqual(["Weeknight dinners"]);
    expect(bookTitlesForRecipe(books, 999)).toEqual([]);
  });
});
