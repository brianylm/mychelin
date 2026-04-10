import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { recipeVersions } from "@/db/schema";
import { eq } from "drizzle-orm";

export const runtime = "edge";
export const preferredRegion = "hnd1";

type RouteContext = { params: Promise<{ id: string }> };

interface ParsedIngredient {
  name: string;
  quantity?: number;
  unit?: string;
  notes?: string;
}

interface IngredientDiff {
  name: string;
  status: "added" | "removed" | "changed" | "unchanged";
  base?: ParsedIngredient;
  compare?: ParsedIngredient;
  percentChange?: number; // % change in quantity
}

// ─── GET /api/recipes/:id/versions/compare?base=X&compare=Y
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const recipeId = Number(id);
    const { searchParams } = new URL(request.url);
    const baseParam = searchParams.get("base");
    const compareParam = searchParams.get("compare");

    if (!baseParam || !compareParam) {
      return NextResponse.json(
        { error: "Both base and compare version IDs are required" },
        { status: 400 }
      );
    }

    const baseId = Number(baseParam);
    const compareId = Number(compareParam);

    const [baseVersion, compareVersion] = await Promise.all([
      db.query.recipeVersions.findFirst({
        where: eq(recipeVersions.id, baseId),
      }),
      db.query.recipeVersions.findFirst({
        where: eq(recipeVersions.id, compareId),
      }),
    ]);

    if (!baseVersion || !compareVersion) {
      return NextResponse.json(
        { error: "One or both versions not found" },
        { status: 404 }
      );
    }

    if (baseVersion.recipeId !== recipeId || compareVersion.recipeId !== recipeId) {
      return NextResponse.json(
        { error: "Versions do not belong to this recipe" },
        { status: 400 }
      );
    }

    const baseIngredients: ParsedIngredient[] = baseVersion.ingredients
      ? JSON.parse(baseVersion.ingredients)
      : [];
    const compareIngredients: ParsedIngredient[] = compareVersion.ingredients
      ? JSON.parse(compareVersion.ingredients)
      : [];

    // Build ingredient diff
    const baseMap = new Map(baseIngredients.map((i) => [i.name.toLowerCase(), i]));
    const compareMap = new Map(compareIngredients.map((i) => [i.name.toLowerCase(), i]));

    const ingredientDiffs: IngredientDiff[] = [];

    // Check base ingredients
    for (const [key, baseIng] of baseMap) {
      const compareIng = compareMap.get(key);
      if (!compareIng) {
        ingredientDiffs.push({
          name: baseIng.name,
          status: "removed",
          base: baseIng,
        });
      } else {
        const baseQty = baseIng.quantity ?? 0;
        const compQty = compareIng.quantity ?? 0;
        const changed =
          baseQty !== compQty ||
          baseIng.unit !== compareIng.unit ||
          baseIng.notes !== compareIng.notes;

        if (changed) {
          const pctChange =
            baseQty > 0 ? Math.round(((compQty - baseQty) / baseQty) * 100) : null;
          ingredientDiffs.push({
            name: baseIng.name,
            status: "changed",
            base: baseIng,
            compare: compareIng,
            percentChange: pctChange ?? undefined,
          });
        } else {
          ingredientDiffs.push({
            name: baseIng.name,
            status: "unchanged",
            base: baseIng,
            compare: compareIng,
          });
        }
      }
    }

    // Check for added ingredients
    for (const [key, compareIng] of compareMap) {
      if (!baseMap.has(key)) {
        ingredientDiffs.push({
          name: compareIng.name,
          status: "added",
          compare: compareIng,
        });
      }
    }

    // Instruction diff (simple text comparison)
    const baseInstructions = baseVersion.instructions
      ? JSON.parse(baseVersion.instructions)
      : [];
    const compareInstructions = compareVersion.instructions
      ? JSON.parse(compareVersion.instructions)
      : [];

    return NextResponse.json({
      base: {
        id: baseVersion.id,
        versionNumber: baseVersion.versionNumber,
        versionLabel: baseVersion.versionLabel,
        captureMethod: baseVersion.captureMethod,
        closenessRating: baseVersion.closenessRating,
        createdAt: baseVersion.createdAt,
      },
      compare: {
        id: compareVersion.id,
        versionNumber: compareVersion.versionNumber,
        versionLabel: compareVersion.versionLabel,
        captureMethod: compareVersion.captureMethod,
        closenessRating: compareVersion.closenessRating,
        createdAt: compareVersion.createdAt,
      },
      ingredientDiffs,
      baseInstructions,
      compareInstructions,
      baseNotes: baseVersion.notes,
      compareNotes: compareVersion.notes,
    });
  } catch (error) {
    console.error("GET compare error:", error);
    return NextResponse.json(
      { error: "Failed to compare versions" },
      { status: 500 }
    );
  }
}
