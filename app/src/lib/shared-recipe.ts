import { db } from "@/db";
import {
  bookRecipes,
  ingredients,
  instructions,
  recipeVersions,
  recipes,
} from "@/db/schema";
import { and, eq } from "drizzle-orm";

export type SharedRecipeIngredient = {
  name: string;
  quantity: number | null;
  unit: string | null;
  approximate: boolean;
  quantityText: string | null;
  notes: string | null;
};

export type SharedRecipeInstruction = {
  stepNumber: number;
  content: string;
  tip: string | null;
  imageUrl: string | null;
};

export type SharedRecipePhoto = {
  blobUrl: string;
  sortOrder: number | null;
};

export type SharedRecipeDTO = {
  id: number;
  title: string;
  description: string | null;
  cuisine: string | null;
  yield: string | null;
  prepTime: number | null;
  cookTime: number | null;
  story: string | null;
  imageUrl: string | null;
  origin: string | null;
  dialect: string | null;
  occasion: string | null;
  familyMember: string | null;
  generation: string | null;
  sourceUrl: string | null;
  definitiveVersionLabel: string | null;
  ingredients: SharedRecipeIngredient[];
  instructions: SharedRecipeInstruction[];
  photos: SharedRecipePhoto[];
};

export type SharedBookRecipeCard = {
  id: number;
  title: string;
  cuisine: string | null;
  imageUrl: string | null;
  description: string | null;
};

function parseArray(value: string | null): unknown[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function nullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function nullableNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function normalizeVersionIngredients(items: unknown[]): SharedRecipeIngredient[] {
  return items
    .map((item) => {
      const row = item && typeof item === "object" ? item as Record<string, unknown> : {};
      const name = nullableString(row.name);
      if (!name) return null;
      return {
        name,
        quantity: nullableNumber(row.quantity),
        unit: nullableString(row.unit),
        approximate: row.approximate === true,
        quantityText: nullableString(row.quantityText),
        notes: nullableString(row.notes),
      };
    })
    .filter((item): item is SharedRecipeIngredient => item !== null);
}

function normalizeVersionInstructions(items: unknown[]): SharedRecipeInstruction[] {
  return items
    .map((item, index) => {
      const row = item && typeof item === "object" ? item as Record<string, unknown> : {};
      const content = nullableString(row.content) ?? nullableString(row.text);
      if (!content) return null;
      return {
        stepNumber: nullableNumber(row.stepNumber) ?? nullableNumber(row.step) ?? index + 1,
        content,
        tip: nullableString(row.tip),
        imageUrl: nullableString(row.imageUrl),
      };
    })
    .filter((item): item is SharedRecipeInstruction => item !== null);
}

export async function getSharedRecipeDTO(recipeId: number): Promise<SharedRecipeDTO | null> {
  const recipe = await db.query.recipes.findFirst({
    where: eq(recipes.id, recipeId),
    with: {
      photos: { orderBy: (p, { asc }) => [asc(p.sortOrder)] },
    },
  });

  if (!recipe) return null;

  const definitiveVersion = recipe.activeVersionId
    ? await db.query.recipeVersions.findFirst({
        where: and(
          eq(recipeVersions.id, recipe.activeVersionId),
          eq(recipeVersions.recipeId, recipe.id)
        ),
      })
    : null;

  let sharedIngredients = definitiveVersion
    ? normalizeVersionIngredients(parseArray(definitiveVersion.ingredients))
    : [];
  let sharedInstructions = definitiveVersion
    ? normalizeVersionInstructions(parseArray(definitiveVersion.instructions))
    : [];

  if (sharedIngredients.length === 0) {
    const rows = await db.query.ingredients.findMany({
      where: eq(ingredients.recipeId, recipe.id),
      orderBy: (ing, { asc }) => [asc(ing.sortOrder)],
    });
    sharedIngredients = rows.map((ing) => ({
      name: ing.name,
      quantity: ing.quantity ?? null,
      unit: ing.unit ?? null,
      approximate: Boolean(ing.approximate),
      quantityText: ing.quantityText ?? null,
      notes: ing.notes ?? null,
    }));
  }

  if (sharedInstructions.length === 0) {
    const rows = await db.query.instructions.findMany({
      where: eq(instructions.recipeId, recipe.id),
      orderBy: (inst, { asc }) => [asc(inst.stepNumber)],
    });
    sharedInstructions = rows.map((inst) => ({
      stepNumber: inst.stepNumber,
      content: inst.content,
      tip: inst.tip ?? null,
      imageUrl: inst.imageUrl ?? null,
    }));
  }

  return {
    id: recipe.id,
    title: recipe.title,
    description: recipe.description ?? null,
    cuisine: recipe.cuisine ?? null,
    yield: recipe.yield ?? null,
    prepTime: recipe.prepTime ?? null,
    cookTime: recipe.cookTime ?? null,
    story: recipe.story ?? null,
    imageUrl: recipe.imageUrl ?? null,
    origin: recipe.origin ?? null,
    dialect: recipe.dialect ?? null,
    occasion: recipe.occasion ?? null,
    familyMember: recipe.familyMember ?? null,
    generation: recipe.generation ?? null,
    sourceUrl: recipe.sourceUrl ?? null,
    definitiveVersionLabel: definitiveVersion?.versionLabel ?? definitiveVersion?.versionNumber?.toString() ?? null,
    ingredients: sharedIngredients,
    instructions: sharedInstructions,
    photos: (recipe.photos ?? []).map((photo) => ({
      blobUrl: photo.blobUrl,
      sortOrder: photo.sortOrder ?? null,
    })),
  };
}

export async function listSharedBookRecipeCards(bookId: number): Promise<SharedBookRecipeCard[]> {
  const directRows = await db
    .select({
      id: recipes.id,
      title: recipes.title,
      cuisine: recipes.cuisine,
      imageUrl: recipes.imageUrl,
      description: recipes.description,
    })
    .from(recipes)
    .where(eq(recipes.bookId, bookId))
    .orderBy(recipes.title);

  const linkedRows = await db
    .select({
      id: recipes.id,
      title: recipes.title,
      cuisine: recipes.cuisine,
      imageUrl: recipes.imageUrl,
      description: recipes.description,
    })
    .from(bookRecipes)
    .innerJoin(recipes, eq(bookRecipes.recipeId, recipes.id))
    .where(eq(bookRecipes.bookId, bookId))
    .orderBy(bookRecipes.sortOrder);

  const seen = new Set<number>();
  const merged: SharedBookRecipeCard[] = [];
  for (const row of [...linkedRows, ...directRows]) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    merged.push(row);
  }

  return merged;
}

export async function isRecipeInSharedBook(recipeId: number, bookId: number): Promise<boolean> {
  const direct = await db
    .select({ id: recipes.id })
    .from(recipes)
    .where(and(eq(recipes.id, recipeId), eq(recipes.bookId, bookId)))
    .limit(1);
  if (direct.length > 0) return true;

  const linked = await db
    .select({ id: bookRecipes.id })
    .from(bookRecipes)
    .where(and(eq(bookRecipes.recipeId, recipeId), eq(bookRecipes.bookId, bookId)))
    .limit(1);

  return linked.length > 0;
}
