import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Client } from "@libsql/client";

vi.mock("@/db", async () => {
  const { createClient } = await import("@libsql/client");
  const { drizzle } = await import("drizzle-orm/libsql");
  const schema = await import("@/db/schema");
  const client = createClient({ url: "file::memory:" });

  return { db: drizzle(client, { schema }), __client: client };
});

vi.mock("@/lib/auth", () => ({
  getCurrentUser: vi.fn(async () => ({
    id: 7,
    name: "Visible user",
    email: "visible@example.com",
  })),
}));

import { GET as listBooks } from "./route";
import {
  DELETE as removeBookRecipe,
  GET as listBookRecipes,
  POST as addBookRecipe,
} from "./[id]/recipes/route";
import { GET as getBookDetail } from "./[id]/route";

let client: Client;

beforeAll(async () => {
  const dbModule = await import("@/db") as unknown as { __client: Client };
  client = dbModule.__client;
  await client.executeMultiple(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL
    );
    CREATE TABLE books (
      id INTEGER PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      cover_emoji TEXT,
      cover_color TEXT,
      created_by INTEGER NOT NULL,
      is_public INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE book_members (
      id INTEGER PRIMARY KEY,
      book_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      role TEXT NOT NULL,
      joined_at TEXT NOT NULL
    );
    CREATE TABLE recipes (
      id INTEGER PRIMARY KEY,
      user_id INTEGER,
      title TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      description TEXT,
      cuisine TEXT,
      yield TEXT,
      prep_time INTEGER,
      cook_time INTEGER,
      image_url TEXT,
      forked_from TEXT,
      book_id INTEGER,
      created_at TEXT NOT NULL
    );
    CREATE TABLE book_recipes (
      id INTEGER PRIMARY KEY,
      book_id INTEGER NOT NULL,
      recipe_id INTEGER NOT NULL,
      added_by INTEGER NOT NULL,
      sort_order INTEGER DEFAULT 0,
      added_at TEXT NOT NULL
    );
    CREATE TABLE book_activity_log (
      id INTEGER PRIMARY KEY,
      book_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      action TEXT NOT NULL,
      target_name TEXT,
      created_at TEXT NOT NULL
    );
  `);
});

beforeEach(async () => {
  await client.executeMultiple(`
    DELETE FROM book_activity_log;
    DELETE FROM book_recipes;
    DELETE FROM recipes;
    DELETE FROM book_members;
    DELETE FROM books;
    DELETE FROM users;

    INSERT INTO users (id, name, email) VALUES
      (7, 'Visible user', 'visible@example.com'),
      (8, 'Other user', 'other@example.com');
    INSERT INTO books (
      id, title, description, cover_emoji, cover_color, created_by,
      is_public, created_at, updated_at
    ) VALUES
      (1, 'Family favourites', NULL, '📚', 'amber', 7, 0, '2026-01-01', '2026-01-01'),
      (2, 'Empty book', NULL, '🥣', 'rose', 7, 0, '2026-01-01', '2026-01-02'),
      (3, 'Private to someone else', NULL, '🔒', 'slate', 8, 0, '2026-01-01', '2026-01-03');
    INSERT INTO book_members (id, book_id, user_id, role, joined_at) VALUES
      (1, 1, 7, 'owner', '2026-01-01'),
      (2, 2, 7, 'owner', '2026-01-01'),
      (3, 3, 8, 'owner', '2026-01-01');
    INSERT INTO recipes (
      id, user_id, title, status, description, cuisine, yield, prep_time,
      cook_time, image_url, forked_from, book_id, created_at
    ) VALUES
      (101, 7, 'Direct only', 'active', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, '2026-01-01'),
      (102, 7, 'Both paths', 'active', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, '2026-01-02'),
      (103, 7, 'Junction only', 'active', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-01-03'),
      (104, 8, 'Invisible recipe', 'active', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 3, '2026-01-04');
    INSERT INTO book_recipes (
      id, book_id, recipe_id, added_by, sort_order, added_at
    ) VALUES
      (1, 1, 102, 7, 0, '2026-01-02'),
      (2, 1, 103, 7, 1, '2026-01-03'),
      (3, 1, 999, 7, 2, '2026-01-04'),
      (4, 3, 104, 8, 0, '2026-01-04');
  `);
});

afterAll(async () => {
  client.close();
});

describe("book recipe membership reads", () => {
  it("returns initial counts and recipe ids from both membership paths without duplicates or leaks", async () => {
    const response = await listBooks();
    expect(response.status).toBe(200);

    const result = await response.json();
    expect(result.map((book: { id: number }) => book.id)).toEqual([1, 2]);
    expect(result[0]).toMatchObject({
      id: 1,
      recipeCount: 3,
      recipeIds: [102, 103, 101],
    });
    expect(result[1]).toMatchObject({ id: 2, recipeCount: 0, recipeIds: [] });
  });

  it("keeps the book contents endpoint and detail endpoint on the same deduplicated union", async () => {
    const context = { params: Promise.resolve({ id: "1" }) };
    const [contentsResponse, detailResponse] = await Promise.all([
      listBookRecipes(new Request("http://localhost/api/books/1/recipes") as never, context),
      getBookDetail(new Request("http://localhost/api/books/1") as never, context),
    ]);

    expect(contentsResponse.status).toBe(200);
    expect(detailResponse.status).toBe(200);

    const contents = await contentsResponse.json();
    const detail = await detailResponse.json();
    expect(contents.map((recipe: { id: number }) => recipe.id)).toEqual([102, 103, 101]);
    expect(detail.recipes.map((recipe: { id: number }) => recipe.id)).toEqual([102, 103, 101]);
  });

  it("treats a direct membership as an existing add", async () => {
    const response = await addBookRecipe(
      new Request("http://localhost/api/books/1/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipeId: 101 }),
      }) as never,
      { params: Promise.resolve({ id: "1" }) }
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      error: "Recipe is already in this book",
    });
  });

  it("removes direct and junction memberships atomically while preserving other books", async () => {
    await client.execute({
      sql: `INSERT INTO book_recipes
        (id, book_id, recipe_id, added_by, sort_order, added_at)
        VALUES (?, ?, ?, ?, ?, ?)`,
      args: [5, 2, 102, 7, 0, "2026-01-05"],
    });

    const remove = (recipeId: number) => removeBookRecipe(
      new Request("http://localhost/api/books/1/recipes", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipeId }),
      }) as never,
      { params: Promise.resolve({ id: "1" }) }
    );

    expect((await remove(102)).status).toBe(200);
    expect((await remove(101)).status).toBe(200);

    const directRows = await client.execute({
      sql: "SELECT id, book_id FROM recipes WHERE id IN (?, ?) ORDER BY id",
      args: [101, 102],
    });
    expect(directRows.rows.map((row) => ({ id: Number(row.id), bookId: row.book_id }))).toEqual([
      { id: 101, bookId: null },
      { id: 102, bookId: null },
    ]);

    const linkedRows = await client.execute({
      sql: "SELECT book_id, recipe_id FROM book_recipes WHERE recipe_id = ? ORDER BY book_id",
      args: [102],
    });
    expect(linkedRows.rows.map((row) => ({
      bookId: Number(row.book_id),
      recipeId: Number(row.recipe_id),
    }))).toEqual([{ bookId: 2, recipeId: 102 }]);
  });
});
