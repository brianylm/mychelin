// "Download my data" (GET /api/account/export): the signed-in user's own
// rows as one JSON document. Never includes password hashes, token
// versions, Google ids, reset/verification tokens, push keys, calendar
// tokens, share-link tokens, or other people's details.
import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  bookRecipes,
  books,
  householdMembers,
  households,
  ingredients,
  instructions,
  inventory,
  mealPlans,
  notificationPreferences,
  pilotFeedback,
  recipeAttempts,
  recipeFlags,
  recipeNextTries,
  recipePhotos,
  recipes,
  recipeVersions,
  shoppingListItems,
  users,
  voiceRecordings,
} from "@/db/schema";

export const EXPORT_FORMAT_VERSION = 1;

function groupBy<T, K>(rows: T[], key: (row: T) => K): Map<K, T[]> {
  const map = new Map<K, T[]>();
  for (const row of rows) {
    const k = key(row);
    const list = map.get(k);
    if (list) list.push(row);
    else map.set(k, [row]);
  }
  return map;
}

function omit<T extends Record<string, unknown>, K extends keyof T>(row: T, keys: K[]): Omit<T, K> {
  const copy = { ...row };
  for (const k of keys) delete copy[k];
  return copy;
}

export async function buildAccountExport(userId: number, now: Date = new Date()) {
  const ownRecipeIds = db.select({ id: recipes.id }).from(recipes).where(eq(recipes.userId, userId));
  const ownBookIds = db.select({ id: books.id }).from(books).where(eq(books.createdBy, userId));

  // One round trip: every query is scoped to this user's id.
  const [
    account,
    notificationRows,
    recipeRows,
    ingredientRows,
    instructionRows,
    versionRows,
    photoRows,
    voiceRows,
    attemptRows,
    nextTryRows,
    flagRows,
    bookRows,
    bookRecipeRows,
    householdRows,
    mealPlanRows,
    inventoryRows,
    shoppingRows,
    feedbackRows,
  ] = await db.batch([
    db
      .select({
        name: users.name,
        email: users.email,
        authProvider: users.authProvider,
        emailVerified: users.emailVerified,
        avatarUrl: users.avatarUrl,
        createdAt: users.createdAt,
        cookingSkillLevel: users.cookingSkillLevel,
        householdSize: users.householdSize,
        favoriteCuisines: users.favoriteCuisines,
        dietaryRestrictions: users.dietaryRestrictions,
        onboardingCompleted: users.onboardingCompleted,
        cookingGoal: users.cookingGoal,
        cookingFrequency: users.cookingFrequency,
        firstCaptureMode: users.firstCaptureMode,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1),
    db.select().from(notificationPreferences).where(eq(notificationPreferences.userId, userId)),
    db.select().from(recipes).where(eq(recipes.userId, userId)),
    db.select().from(ingredients).where(inArray(ingredients.recipeId, ownRecipeIds)),
    db.select().from(instructions).where(inArray(instructions.recipeId, ownRecipeIds)),
    db.select().from(recipeVersions).where(inArray(recipeVersions.recipeId, ownRecipeIds)),
    db.select().from(recipePhotos).where(inArray(recipePhotos.recipeId, ownRecipeIds)),
    db.select().from(voiceRecordings).where(inArray(voiceRecordings.recipeId, ownRecipeIds)),
    db.select().from(recipeAttempts).where(eq(recipeAttempts.userId, userId)),
    db.select().from(recipeNextTries).where(eq(recipeNextTries.userId, userId)),
    db.select().from(recipeFlags).where(eq(recipeFlags.userId, userId)),
    db.select().from(books).where(eq(books.createdBy, userId)),
    db
      .select({ bookId: bookRecipes.bookId, recipeId: bookRecipes.recipeId })
      .from(bookRecipes)
      .where(inArray(bookRecipes.bookId, ownBookIds)),
    db
      .select({
        name: households.name,
        role: householdMembers.role,
        joinedAt: householdMembers.joinedAt,
        deletedAt: households.deletedAt,
      })
      .from(householdMembers)
      .innerJoin(households, eq(householdMembers.householdId, households.id))
      .where(eq(householdMembers.userId, userId)),
    db.select().from(mealPlans).where(eq(mealPlans.userId, userId)),
    db.select().from(inventory).where(eq(inventory.userId, userId)),
    db.select().from(shoppingListItems).where(eq(shoppingListItems.userId, userId)),
    db.select().from(pilotFeedback).where(eq(pilotFeedback.userId, userId)),
  ]);

  const byRecipe = <T extends { recipeId: number }>(rows: T[]) => groupBy(rows, (r) => r.recipeId);
  const ingredientsBy = byRecipe(ingredientRows);
  const instructionsBy = byRecipe(instructionRows);
  const versionsBy = byRecipe(versionRows);
  const photosBy = byRecipe(photoRows);
  const voiceBy = byRecipe(voiceRows);
  const attemptsBy = byRecipe(attemptRows);
  const nextTriesBy = byRecipe(nextTryRows);
  const flagsBy = byRecipe(flagRows);
  const ownIds = new Set(recipeRows.map((r) => r.id));
  const bookRecipesBy = groupBy(bookRecipeRows, (r) => r.bookId);

  return {
    format: "mychelin-export",
    version: EXPORT_FORMAT_VERSION,
    exportedAt: now.toISOString(),
    account: account[0] ?? null,
    notificationPreferences: notificationRows[0] ? omit(notificationRows[0], ["userId"]) : null,
    recipes: recipeRows.map((recipe) => ({
      ...omit(recipe, ["userId"]),
      ingredients: (ingredientsBy.get(recipe.id) ?? []).map((r) => omit(r, ["recipeId"])),
      instructions: (instructionsBy.get(recipe.id) ?? []).map((r) => omit(r, ["recipeId"])),
      versions: (versionsBy.get(recipe.id) ?? []).map((r) => omit(r, ["recipeId", "changedBy"])),
      attempts: (attemptsBy.get(recipe.id) ?? []).map((r) => omit(r, ["recipeId", "userId"])),
      nextTries: (nextTriesBy.get(recipe.id) ?? []).map((r) => omit(r, ["recipeId", "userId"])),
      flags: (flagsBy.get(recipe.id) ?? []).map((r) => r.flag),
      photos: (photosBy.get(recipe.id) ?? []).map((r) => ({ url: r.blobUrl, source: r.source, createdAt: r.createdAt })),
      voiceRecordings: (voiceBy.get(recipe.id) ?? []).map((r) => ({
        url: r.blobUrl,
        label: r.label,
        durationSeconds: r.duration,
        createdAt: r.createdAt,
      })),
    })),
    // Your cooks and flags on recipes other people shared with you.
    attemptsOnOtherRecipes: attemptRows.filter((r) => !ownIds.has(r.recipeId)).map((r) => omit(r, ["userId"])),
    flagsOnOtherRecipes: flagRows
      .filter((r) => !ownIds.has(r.recipeId))
      .map((r) => ({ recipeId: r.recipeId, flag: r.flag, createdAt: r.createdAt })),
    books: bookRows.map((book) => ({
      ...omit(book, ["createdBy"]),
      recipeIds: (bookRecipesBy.get(book.id) ?? []).map((r) => r.recipeId),
    })),
    households: householdRows,
    mealPlans: mealPlanRows.map((r) => omit(r, ["userId"])),
    inventory: inventoryRows.map((r) => omit(r, ["userId"])),
    shoppingListItems: shoppingRows.map((r) => omit(r, ["userId", "tickedBy", "movedBy"])),
    feedback: feedbackRows.map((r) => omit(r, ["userId"])),
  };
}
