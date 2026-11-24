// GET /api/account/export returns only the caller's own data, without secrets.
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Client } from "@libsql/client";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import type * as schema from "@/db/schema";

vi.mock("@/db", async () => {
  const { createClient } = await import("@libsql/client");
  const { drizzle } = await import("drizzle-orm/libsql");
  const schema = await import("@/db/schema");
  const { tempDbUrl } = await import("@/test/full-schema-db");
  const client = createClient({ url: tempDbUrl("account-export") });
  return { db: drizzle(client, { schema }), __client: client };
});
const session = vi.hoisted(() => ({ user: null as { id: number; name: string; email: string } | null }));
vi.mock("@/lib/auth", () => ({ getCurrentUser: vi.fn(async () => session.user) }));

import { applyFullSchema, wipeAllTables } from "@/test/full-schema-db";
import { OTHER, OWNER, seedAccountFixture } from "@/test/account-fixture";
import { GET } from "./route";

let client: Client;
let db: LibSQLDatabase<typeof schema>;

beforeAll(async () => {
  const mod = (await import("@/db")) as unknown as { __client: Client; db: LibSQLDatabase<typeof schema> };
  client = mod.__client;
  db = mod.db;
  await applyFullSchema(client);
  await wipeAllTables(client);
  await seedAccountFixture(db);
}, 60_000);

beforeEach(() => {
  session.user = { id: OWNER.id, name: OWNER.name, email: OWNER.email };
});

describe("GET /api/account/export", () => {
  it("requires a session", async () => {
    session.user = null;
    expect((await GET()).status).toBe(401);
  });

  it("downloads a dated, uncached JSON attachment", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.headers.get("content-disposition")).toMatch(
      /^attachment; filename="mychelin-export-\d{4}-\d{2}-\d{2}\.json"$/
    );
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(res.headers.get("content-type")).toMatch(/application\/json/);
  });

  it("contains the caller's recipes with their details", async () => {
    const data = await (await GET()).json();
    expect(data.account).toMatchObject({ name: OWNER.name, email: OWNER.email, authProvider: "password", emailVerified: true });
    expect(data.recipes.map((r: { title: string }) => r.title).sort()).toEqual(["Owner Kaya", "Owner Laksa"]);
    const laksa = data.recipes.find((r: { title: string }) => r.title === "Owner Laksa");
    expect(laksa.ingredients).toHaveLength(1);
    expect(laksa.instructions[0].content).toBe("Boil the noodles");
    expect(laksa.versions).toHaveLength(1);
    expect(laksa.attempts).toHaveLength(1);
    expect(laksa.nextTries).toHaveLength(1);
    expect(laksa.flags).toEqual(["favourite"]);
    expect(laksa.photos).toHaveLength(2);
    expect(laksa.voiceRecordings).toHaveLength(1);
    expect(data.books).toEqual([expect.objectContaining({ title: "Owner Family Book", recipeIds: expect.arrayContaining([10, 20]) })]);
    expect(data.households).toEqual([expect.objectContaining({ name: "Synthetic Home", role: "admin" })]);
    expect(data.notificationPreferences.weeklyCookingGoal).toBe(3);
    expect(data.mealPlans).toHaveLength(2);
    expect(data.inventory).toHaveLength(2);
    expect(data.shoppingListItems).toHaveLength(2);
    expect(data.feedback).toEqual([expect.objectContaining({ comment: "Owner feedback" })]);
    expect(data.attemptsOnOtherRecipes).toHaveLength(1);
  });

  it("leaves out secrets and other people's data", async () => {
    const text = await (await GET()).text();
    for (const secret of [
      "passwordHash", "password_hash", "$2a$", "$2b$", "tokenVersion", "googleSub", "sub-owner-secret",
      "reset-hash", "verify-hash", "share-owner-secret", "p256dh-secret", "auth-secret", "cipher-secret",
    ]) {
      expect(text, secret).not.toContain(secret);
    }
    for (const foreign of [OTHER.email, OTHER.name, "Other Rendang", "Other feedback", "Other salt", "Other Family Book", "upload-20.jpg"]) {
      expect(text, foreign).not.toContain(foreign);
    }
  });
});
