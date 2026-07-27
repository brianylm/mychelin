import { sql, type SQL } from "drizzle-orm";

// Builds the recursive-CTE query that returns every recipe id in the
// fork lineage of `startRecipeId` as seen by `userId`.
//
// Semantics (must stay in sync with recipe-lineage.test.ts):
// - CAST(forked_from AS INTEGER) handles both stored formats ("57"
//   legacy and "57:Recipe Title") — SQLite parses the numeric prefix.
// - Walking UP stops at the user boundary: a fork saved from a shared
//   page doesn't leak another user's history.
// - The root is the highest same-user ancestor. If a degenerate fork
//   cycle exists (a -> b -> a), there is no root, so the walk is
//   seeded with every reachable ancestor instead of returning nothing.
// - Walking DOWN collects only recipes visible to the user (owned, or
//   in a book they belong to).
// - UNION (not UNION ALL) dedups rows and guarantees termination.
export function buildLineageSql(startRecipeId: number, userId: number): SQL {
  return sql`
    WITH RECURSIVE
    up(id) AS (
      SELECT ${startRecipeId}
      UNION
      SELECT CAST(r.forked_from AS INTEGER)
      FROM recipes r
      JOIN up u ON r.id = u.id
      WHERE CAST(r.forked_from AS INTEGER) > 0
        AND EXISTS (
          SELECT 1 FROM recipes p
          WHERE p.id = CAST(r.forked_from AS INTEGER)
            AND p.user_id = ${userId}
        )
    ),
    root(id) AS (
      SELECT u.id FROM up u
      WHERE NOT EXISTS (
        SELECT 1 FROM recipes r
        WHERE r.id = u.id
          AND CAST(r.forked_from AS INTEGER) > 0
          AND EXISTS (
            SELECT 1 FROM recipes p
            WHERE p.id = CAST(r.forked_from AS INTEGER)
              AND p.user_id = ${userId}
          )
      )
    ),
    tree(id) AS (
      SELECT id FROM root
      UNION
      SELECT id FROM up WHERE NOT EXISTS (SELECT 1 FROM root)
      UNION
      SELECT r.id FROM recipes r
      JOIN tree t ON CAST(r.forked_from AS INTEGER) = t.id
      WHERE r.user_id = ${userId}
         OR r.book_id IN (
           SELECT book_id FROM book_members WHERE user_id = ${userId}
         )
    )
    SELECT id FROM tree
  `;
}
