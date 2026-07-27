import { describe, it, expect, beforeAll } from "vitest";
import { createClient, type Client } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import { buildLineageSql } from "./recipe-lineage";

// Reference implementation: the original JS fork-tree walk that the
// recursive CTE replaced (2 queries per ancestor hop, BFS down). The
// CTE must return identical id sets for every case.
async function oldWalk(
  client: Client,
  startRecipeId: number,
  userId: number
): Promise<number[]> {
  let rootId = startRecipeId;
  const seenUp = new Set<number>();
  let cursor: number | null = startRecipeId;
  for (let i = 0; i < 20 && cursor != null && !seenUp.has(cursor); i++) {
    seenUp.add(cursor);
    const r = await client.execute({
      sql: "SELECT forked_from, user_id FROM recipes WHERE id = ?",
      args: [cursor],
    });
    const row = r.rows[0] as unknown as { forked_from: string | null } | undefined;
    const parentId = row?.forked_from ? parseInt(row.forked_from) : NaN;
    if (!Number.isNaN(parentId) && parentId > 0) {
      const pr = await client.execute({
        sql: "SELECT user_id FROM recipes WHERE id = ?",
        args: [parentId],
      });
      const parentRow = pr.rows[0] as unknown as { user_id: number | null } | undefined;
      if (parentRow && parentRow.user_id === userId) {
        rootId = parentId;
        cursor = parentId;
      } else {
        rootId = cursor;
        cursor = null;
      }
    } else {
      rootId = cursor;
      cursor = null;
    }
  }
  const all = new Set<number>([rootId]);
  let frontier = [rootId];
  for (let d = 0; d < 20 && frontier.length; d++) {
    const preds = frontier
      .map((p) => `(forked_from = '${p}' OR forked_from LIKE '${p}:%')`)
      .join(" OR ");
    const vis = `(user_id = ${userId} OR book_id IN (SELECT book_id FROM book_members WHERE user_id = ${userId}))`;
    const r = await client.execute(
      `SELECT id FROM recipes WHERE ${vis} AND (${preds})`
    );
    const next: number[] = [];
    for (const row of r.rows) {
      const id = row.id as number;
      if (!all.has(id)) {
        all.add(id);
        next.push(id);
      }
    }
    frontier = next;
  }
  return [...all].sort((a, b) => a - b);
}

// Fixture — covers: fork chains, both forked_from formats, a cross-user
// boundary (7's parent belongs to user 2), a book-shared recipe (8), a
// private other-user recipe (9), and a degenerate fork cycle (11 <-> 12).
const RECIPES: Array<[number, number, number | null, string | null]> = [
  [1, 1, null, null],
  [2, 1, null, "1"],
  [3, 1, null, "2"],
  [4, 1, null, "1:Grandma chicken rice"],
  [5, 1, null, "3:Variant"],
  [6, 2, null, null],
  [7, 1, null, "6"],
  [8, 2, 10, "5"],
  [9, 2, null, "5"],
  [11, 1, null, "12"],
  [12, 1, null, "11"],
];

const CASES: Array<[number, number]> = [
  [1, 1], [3, 1], [5, 1], [7, 1], [6, 2], [8, 2], [9, 2], [11, 1], [12, 1],
];

describe("buildLineageSql", () => {
  let client: Client;
  let db: LibSQLDatabase;

  beforeAll(async () => {
    client = createClient({ url: ":memory:" });
    db = drizzle(client);
    await client.execute(
      "CREATE TABLE recipes (id integer PRIMARY KEY, user_id integer, book_id integer, forked_from text)"
    );
    await client.execute(
      "CREATE TABLE book_members (id integer PRIMARY KEY, book_id integer, user_id integer, role text)"
    );
    for (const row of RECIPES) {
      await client.execute({ sql: "INSERT INTO recipes VALUES (?,?,?,?)", args: row });
    }
    await client.execute({
      sql: "INSERT INTO book_members VALUES (1, 10, 1, ?)",
      args: ["viewer"],
    });
  });

  for (const [start, user] of CASES) {
    it(`matches the old JS walk (start=${start}, user=${user})`, async () => {
      const rows = await db.all<{ id: number }>(buildLineageSql(start, user));
      const cteIds = rows.map((r) => r.id).sort((a, b) => a - b);
      const oldIds = await oldWalk(client, start, user);
      expect(cteIds).toEqual(oldIds);
    });
  }

  it("returns only the start recipe when it has no lineage", async () => {
    const rows = await db.all<{ id: number }>(buildLineageSql(6, 2));
    expect(rows.map((r) => r.id)).toEqual([6]);
  });
});
