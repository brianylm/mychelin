// DELETE /api/recipes/:id removes the recipe's blob files (uploads,
// generated photos, voice clips, cover image) after the rows, and nothing
// else: other recipes' files and files a fork still uses are kept.
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Client } from "@libsql/client";
import { NextRequest } from "next/server";

vi.mock("@/db", async () => {
  const { createClient } = await import("@libsql/client");
  const { drizzle } = await import("drizzle-orm/libsql");
  const schema = await import("@/db/schema");
  const { tempDbUrl } = await import("@/test/full-schema-db");
  const client = createClient({ url: tempDbUrl("recipe-delete") });
  return { db: drizzle(client, { schema }), __client: client };
});
vi.mock("@/db/ensure-schema", async (importOriginal) => {
  const real = await importOriginal<Record<string, unknown>>();
  return Object.fromEntries(
    Object.entries(real).map(([k, v]) => [k, typeof v === "function" ? vi.fn(async () => {}) : v])
  );
});
const blob = vi.hoisted(() => ({ del: vi.fn<(urls: string | string[]) => Promise<void>>(async () => {}) }));
vi.mock("@vercel/blob", () => ({ del: blob.del }));
const auth = vi.hoisted(() => ({ user: { id: 1, name: "Owner", email: "owner@example.test" } as { id: number; name: string; email: string } | null }));
vi.mock("@/lib/auth", () => ({ getCurrentUser: vi.fn(async () => auth.user) }));

import { applyFullSchema, count, wipeAllTables } from "@/test/full-schema-db";
import { DELETE } from "./route";

const B = "https://abc123.public.blob.vercel-storage.com";
let client: Client;

beforeAll(async () => {
  client = ((await import("@/db")) as unknown as { __client: Client }).__client;
  await applyFullSchema(client);
}, 60_000);

beforeEach(async () => {
  await wipeAllTables(client);
  blob.del.mockReset();
  blob.del.mockImplementation(async () => {});
  auth.user = { id: 1, name: "Owner", email: "owner@example.test" };
  const now = new Date().toISOString();
  for (const [id, email] of [[1, "owner@example.test"], [2, "other@example.test"]] as const) {
    await client.execute({
      sql: "INSERT INTO users (id, name, email, password_hash, created_at) VALUES (?, ?, ?, 'x', ?)",
      args: [id, `User ${id}`, email, now],
    });
  }
  const recipe = (id: number, userId: number, imageUrl: string | null) =>
    client.execute({
      sql: "INSERT INTO recipes (id, user_id, title, image_url, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
      args: [id, userId, `Recipe ${id}`, imageUrl, now, now],
    });
  await recipe(10, 1, `${B}/cover-10.jpg`);
  await recipe(11, 1, `${B}/cover-11.jpg`);
  // User 2's fork of recipe 10 reuses its cover URL.
  await recipe(20, 2, `${B}/cover-10.jpg`);
  await client.execute({
    sql: `INSERT INTO recipe_photos (recipe_id, blob_url, source, created_at) VALUES
      (10, ?, 'upload', ?), (10, ?, 'generated', ?), (11, ?, 'upload', ?)`,
    args: [`${B}/upload-10.jpg`, now, `${B}/generated-10.png`, now, `${B}/upload-11.jpg`, now],
  });
  await client.execute({
    sql: `INSERT INTO voice_recordings (recipe_id, blob_url, duration, created_at) VALUES
      (10, ?, 30, ?), (11, ?, 12, ?)`,
    args: [`${B}/voice-10.webm`, now, `${B}/voice-11.webm`, now],
  });
  // Not a blob URL: must never be sent to del().
  await client.execute({
    sql: "INSERT INTO instructions (recipe_id, step_number, content, image_url) VALUES (10, 1, 'Boil', 'https://example.com/step.jpg')",
    args: [],
  });
});

function del(id: number) {
  return DELETE(new NextRequest(`http://localhost/api/recipes/${id}`, { method: "DELETE" }), {
    params: Promise.resolve({ id: String(id) }),
  });
}

function deletedUrls(): string[] {
  return blob.del.mock.calls.flatMap(([arg]) => (Array.isArray(arg) ? arg : [arg]));
}

describe("DELETE /api/recipes/:id blob cleanup", () => {
  it("deletes this recipe's photo, generated photo and voice files, and nothing else", async () => {
    const res = await del(10);
    expect(res.status).toBe(200);
    expect(deletedUrls().sort()).toEqual(
      [`${B}/generated-10.png`, `${B}/upload-10.jpg`, `${B}/voice-10.webm`].sort()
    );
    // Cover image is still used by user 2's fork, so it stays.
    expect(deletedUrls()).not.toContain(`${B}/cover-10.jpg`);
    expect(await count(client, "recipes", "id = 10")).toBe(0);
    expect(await count(client, "recipe_photos", "recipe_id = 10")).toBe(0);
    expect(await count(client, "recipe_photos", "recipe_id = 11")).toBe(1);
  });

  it("deletes the cover image when no other recipe uses it", async () => {
    await del(11);
    expect(deletedUrls().sort()).toEqual(
      [`${B}/cover-11.jpg`, `${B}/upload-11.jpg`, `${B}/voice-11.webm`].sort()
    );
  });

  it("still reports success when the blob store fails", async () => {
    blob.del.mockRejectedValue(new Error("blob store down"));
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await del(10);
    errors.mockRestore();
    expect(res.status).toBe(200);
    expect(await count(client, "recipes", "id = 10")).toBe(0);
  });

  it("deletes nothing for a recipe the caller cannot edit", async () => {
    const res = await del(20);
    expect(res.status).toBe(404);
    expect(blob.del).not.toHaveBeenCalled();
    expect(await count(client, "recipes", "id = 20")).toBe(1);
  });
});
