import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, like, sql } from "drizzle-orm";
import { db } from "@/db";
import { ingredientCatalog, ingredients, recipes } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "edge";
export const preferredRegion = "hnd1";

// Max suggestions returned. Keeps the dropdown short and scannable.
const MAX_RESULTS = 10;

// How many recent ingredients to return when the query is empty.
const RECENT_LIMIT = 8;

interface Suggestion {
  name: string;
  unit: string | null;
  source: "catalog" | "history";
}

/**
 * GET /api/ingredients/suggest?q={query}
 *
 * Returns a merged, deduped list of ingredient suggestions drawn from:
 *   1. The user's personal history (ingredients they've used in past recipes),
 *      ranked by recency and frequency
 *   2. The global ingredient_catalog table
 *
 * Personal history is ranked first (users recognize their own ingredients
 * faster than catalog entries). When the query is empty, we return the
 * most recent personal ingredients — useful as a "quick pick" on focus.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const q = (request.nextUrl.searchParams.get("q") || "").trim().toLowerCase();

    // ── Personal history ────────────────────────────────────
    // Group the user's past recipe ingredients by lowercase name, count
    // frequency, and take the most recent created_at per group. Ranked by
    // recency first, then frequency.
    const historyRows = await db
      .select({
        name: sql<string>`min(${ingredients.name})`.as("name"),
        unit: sql<string | null>`min(${ingredients.unit})`.as("unit"),
        latest: sql<string>`max(${recipes.createdAt})`.as("latest"),
        uses: sql<number>`count(*)`.as("uses"),
      })
      .from(ingredients)
      .innerJoin(recipes, eq(ingredients.recipeId, recipes.id))
      .where(
        q
          ? and(
              eq(recipes.userId, user.id),
              like(sql`lower(${ingredients.name})`, `${q}%`)
            )
          : eq(recipes.userId, user.id)
      )
      .groupBy(sql`lower(${ingredients.name})`)
      .orderBy(sql`max(${recipes.createdAt}) desc`, sql`count(*) desc`)
      .limit(q ? MAX_RESULTS : RECENT_LIMIT);

    const historySuggestions: Suggestion[] = historyRows.map((r) => ({
      name: r.name,
      unit: r.unit,
      source: "history",
    }));

    // ── Catalog matches ─────────────────────────────────────
    // Only query the catalog when there's a search term — on empty query
    // we just want the user's recents, not the whole catalog.
    let catalogSuggestions: Suggestion[] = [];
    if (q) {
      const catalogRows = await db
        .select({
          name: ingredientCatalog.name,
          defaultUnit: ingredientCatalog.defaultUnit,
        })
        .from(ingredientCatalog)
        .where(like(sql`lower(${ingredientCatalog.name})`, `${q}%`))
        .orderBy(ingredientCatalog.name)
        .limit(MAX_RESULTS);

      catalogSuggestions = catalogRows.map((r) => ({
        name: r.name,
        unit: r.defaultUnit,
        source: "catalog",
      }));
    }

    // ── Merge + dedupe ──────────────────────────────────────
    // History wins over catalog on name collision (case-insensitive).
    const seen = new Set<string>();
    const merged: Suggestion[] = [];
    for (const s of [...historySuggestions, ...catalogSuggestions]) {
      const key = s.name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(s);
      if (merged.length >= MAX_RESULTS) break;
    }

    return NextResponse.json({ suggestions: merged });
  } catch (err) {
    console.error("Suggest ingredients error:", err);
    return NextResponse.json(
      { error: "Failed to fetch suggestions" },
      { status: 500 }
    );
  }
}
