import { NextResponse } from "next/server";
import { createClient } from "@libsql/client/web";
import { requireAdminUser } from "@/lib/admin-auth";

export const runtime = "edge";
export const preferredRegion = "hnd1";

// ─── POST /api/admin/migrate-versions ──────────────────────
// One-off idempotent migration for the version label feature. Safe to
// re-run. Requires a logged-in user.
//
// What it does:
// 1. Adds the `version_label` column to `recipe_versions` (if missing)
// 2. Backfills version_label for existing rows from version_number
// 3. For every recipe with zero versions, creates a v1 row from the recipe's
//    current ingredients/instructions and points active_version_id at it
export async function POST() {
  const auth = await requireAdminUser();
  if (auth.response) return auth.response;

  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url) {
    return NextResponse.json({ error: "TURSO_DATABASE_URL missing" }, { status: 500 });
  }

  const client = createClient({ url, authToken });
  const report: Record<string, unknown> = {};

  try {
    // 1. Add version_label column (idempotent)
    try {
      await client.execute(`ALTER TABLE recipe_versions ADD COLUMN version_label text`);
      report.addColumn = "added";
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      if (message.toLowerCase().includes("duplicate")) {
        report.addColumn = "already exists";
      } else {
        report.addColumn = `skipped: ${message}`;
      }
    }

    // 2. Backfill version_label from version_number
    const backfillRes = await client.execute(
      `UPDATE recipe_versions SET version_label = CAST(version_number AS TEXT) WHERE version_label IS NULL`
    );
    report.backfilledLabels = backfillRes.rowsAffected ?? 0;

    // 3. Find recipes that have no recipe_versions row
    const recipesWithoutVersions = await client.execute(`
      SELECT r.id, r.user_id
      FROM recipes r
      LEFT JOIN recipe_versions rv ON rv.recipe_id = r.id
      WHERE rv.id IS NULL
      GROUP BY r.id
    `);

    let createdV1Count = 0;
    for (const row of recipesWithoutVersions.rows) {
      const recipeId = Number(row.id);
      const userId = row.user_id != null ? Number(row.user_id) : null;

      // Pull current ingredients + instructions
      const ingRes = await client.execute({
        sql: `SELECT name, quantity, unit, notes FROM ingredients WHERE recipe_id = ? ORDER BY sort_order`,
        args: [recipeId],
      });
      const instRes = await client.execute({
        sql: `SELECT content, tip, image_url FROM instructions WHERE recipe_id = ? ORDER BY step_number`,
        args: [recipeId],
      });

      const ingredientsJson = JSON.stringify(
        ingRes.rows.map((row) => ({
          name: row.name,
          quantity: row.quantity,
          unit: row.unit,
          notes: row.notes,
        }))
      );
      const instructionsJson = JSON.stringify(
        instRes.rows.map((row) => ({
          content: row.content,
          tip: row.tip,
          imageUrl: row.image_url,
        }))
      );

      const insertRes = await client.execute({
        sql: `INSERT INTO recipe_versions
              (recipe_id, version_number, version_label, capture_method,
               ingredients, instructions, changed_by, change_note, created_at)
              VALUES (?, 1, '1', 'manual', ?, ?, ?, 'Initial version (backfill)', ?)`,
        args: [
          recipeId,
          ingredientsJson,
          instructionsJson,
          userId,
          new Date().toISOString(),
        ],
      });

      const newVersionId = Number(insertRes.lastInsertRowid);
      await client.execute({
        sql: `UPDATE recipes SET active_version_id = ? WHERE id = ?`,
        args: [newVersionId, recipeId],
      });
      createdV1Count++;
    }
    report.createdV1ForRecipes = createdV1Count;

    return NextResponse.json({ ok: true, report });
  } catch (error: unknown) {
    console.error("Migration error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Migration failed", report },
      { status: 500 }
    );
  }
}
