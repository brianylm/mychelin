import { test, expect } from "@playwright/test";
import { cleanupUsers, createRecipe, signup, uniqueEmail } from "./helpers";

const PREFIX = "e2e-books-count";
const PASSWORD = "E2eBooks123!";

test.afterAll(async () => {
  await cleanupUsers(PREFIX);
});

test("book summaries count recipes added through the book recipe endpoint", async ({ page }) => {
  await signup(page, uniqueEmail(PREFIX), PASSWORD);
  const recipe = await createRecipe(page, { title: "E2E Book Recipe" });

  const createBookResponse = await page.request.post("/api/books", {
    data: { title: "E2E Counted Book" },
  });
  expect(createBookResponse.status()).toBe(201);
  const book = await createBookResponse.json();

  const addRecipeResponse = await page.request.post(`/api/books/${book.id}/recipes`, {
    data: { recipeId: recipe.id },
  });
  expect(addRecipeResponse.ok()).toBe(true);

  const booksResponse = await page.request.get("/api/books");
  expect(booksResponse.ok()).toBe(true);
  const books = await booksResponse.json();
  const countedBook = books.find((candidate: { id: number }) => candidate.id === book.id);

  expect(countedBook?.recipeCount).toBe(1);
});
