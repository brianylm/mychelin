// Permanent self-serve account deletion (POST /api/account/delete).
//
// Every step is idempotent and the users row goes last, so a request that
// fails part-way can simply be retried by the same signed-in user and will
// finish the job. Foreign keys are enforced on Turso, so rows that point at
// the user without ON DELETE CASCADE (or SET NULL) are handled explicitly
// first; otherwise the final DELETE would be refused. Rows that would
// cascade away from OTHER people (shared household plans, inventory, meal
// groups, households the user created) are handed over or detached first.
//
// Table audit (2026-11-24, against the production schema dump):
//   cascade, deleted explicitly here: password_reset_tokens,
//     email_verification_tokens, notification_preferences, push_subscriptions,
//     notification_jobs, pilot_feedback, recipes (+ children), recipe_flags,
//     recipe_attempts, recipe_next_tries, meal_plan_blocks, books,
//     book_members, book_activity_log, household_members,
//     household_activity_log, household_member_blocks, calendar_connections,
//     calendar_shares, meal_confirmation_commands, share_links, personal
//     meal_groups / meal_plans / prepared_batches / inventory /
//     shopping_list_items.
//   cascade, handed over instead (household rows others still use):
//     households.created_by, meal_groups.user_id, prepared_batches.user_id
//     → successor member; meal_plans / inventory / shopping_list_items
//     user_id → NULL.
//   NO ACTION (would block the delete): recipes.shared_to_household_by,
//     recipe_versions.changed_by, shopping_list_items.ticked_by / moved_by
//     → NULL; book_recipes.added_by → the book's owner; book_tips.added_by
//     (legacy table, unwritable in prod) → best-effort delete.
//   SET NULL (kept, anonymised): usage_events.user_id, meal_groups.confirmed_by.
//   Not keyed by user id: auth_rate_limits (email or user-id keys) and
//     waitlist (email) are deleted by key.
import { and, eq, inArray, isNotNull, isNull, or, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  authRateLimits,
  bookActivityLog,
  bookMembers,
  bookRecipes,
  books,
  calendarActivities,
  calendarConnections,
  calendarShares,
  calendarSyncJobs,
  emailVerificationTokens,
  householdActivityLog,
  householdMemberBlocks,
  householdMembers,
  households,
  ingredients,
  instructions,
  inventory,
  mealConfirmationCommands,
  mealGroups,
  mealPlanBlocks,
  mealPlans,
  notificationJobs,
  notificationPreferences,
  passwordResetTokens,
  pilotFeedback,
  preparedBatches,
  preparedLots,
  preparedReservations,
  pushSubscriptions,
  recipeAttempts,
  recipeDishTypes,
  recipeFlags,
  recipeNextTries,
  recipePhotos,
  recipes,
  recipeVersions,
  shareLinks,
  shoppingListItems,
  usageEvents,
  users,
  voiceRecordings,
} from "@/db/schema";
import { collectRecipeBlobUrls, deleteRecipeBlobs, type BlobCleanupResult } from "@/lib/blob-cleanup";
import {
  handleMemberDeparture,
  otherHouseholdMembers,
  promoteSuccessorAdmin,
  purgeHousehold,
} from "@/lib/households";
import { getMealCalendarConfig, mealCalendarSetup } from "@/lib/meal-calendar/config";
import { teardownCalendarConnection } from "@/lib/meal-calendar/connection-service";
import { RATE_LIMITS } from "@/lib/rateLimit";

const CHUNK = 200;

export interface AccountDeletionSummary {
  recipes: number;
  booksDeleted: number;
  householdsLeft: number;
  householdsPurged: number;
  blobs: BlobCleanupResult;
}

function chunk<T>(items: T[], size = CHUNK): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

// Runtime-created or legacy tables may be missing in some databases; a
// missing table means there is nothing to delete.
async function ifTableExists(work: () => Promise<unknown>): Promise<void> {
  try {
    await work();
  } catch (error) {
    if (/no such table/i.test(errorMessage(error))) return;
    throw error;
  }
}

// ─── Calendar ──────────────────────────────────────────────
async function deleteCalendarData(userId: number): Promise<void> {
  await ifTableExists(async () => {
    const connections = await db
      .select()
      .from(calendarConnections)
      .where(eq(calendarConnections.userId, userId));
    if (connections.length > 0 && mealCalendarSetup().configured) {
      const config = getMealCalendarConfig();
      for (const connection of connections) {
        if (connection.disconnectedAt) continue;
        try {
          // Revokes calendar shares and stops the watch channel on Google.
          await teardownCalendarConnection({ connection, config });
        } catch (error) {
          console.warn("account delete: calendar teardown failed", { connectionId: connection.id, error: errorMessage(error) });
        }
      }
    }
    const ids = connections.map((c) => c.id);
    for (const part of chunk(ids)) {
      await db.delete(calendarSyncJobs).where(inArray(calendarSyncJobs.connectionId, part));
      await db.delete(calendarActivities).where(inArray(calendarActivities.connectionId, part));
      await db.delete(calendarShares).where(inArray(calendarShares.connectionId, part));
    }
    await db.delete(calendarShares).where(eq(calendarShares.userId, userId));
    await db.delete(calendarConnections).where(eq(calendarConnections.userId, userId));
  });
}

// ─── Households ────────────────────────────────────────────
// For each household the user touches: if nobody else is in it, purge it
// now (nobody is left who could restore it). Otherwise run the normal
// departure, make sure an admin remains, hand over rows that would
// otherwise cascade away from the others, then drop the membership.
async function leaveHouseholds(userId: number): Promise<{ left: number; purged: number }> {
  const memberships = await db
    .select({ householdId: householdMembers.householdId, deletedAt: households.deletedAt })
    .from(householdMembers)
    .innerJoin(households, eq(householdMembers.householdId, households.id))
    .where(eq(householdMembers.userId, userId));

  const ids = new Set<number>(memberships.map((m) => m.householdId));
  const created = await db
    .select({ id: households.id })
    .from(households)
    .where(eq(households.createdBy, userId));
  for (const row of created) ids.add(row.id);
  // Household rows the user added after which they left: user_id cascades,
  // so these would vanish from the household when the user row goes.
  const scoped = await Promise.all([
    db.selectDistinct({ id: mealPlans.householdId }).from(mealPlans)
      .where(and(eq(mealPlans.userId, userId), isNotNull(mealPlans.householdId))),
    db.selectDistinct({ id: inventory.householdId }).from(inventory)
      .where(and(eq(inventory.userId, userId), isNotNull(inventory.householdId))),
    db.selectDistinct({ id: shoppingListItems.householdId }).from(shoppingListItems)
      .where(and(eq(shoppingListItems.userId, userId), isNotNull(shoppingListItems.householdId))),
  ]);
  for (const rows of scoped) for (const row of rows) if (row.id != null) ids.add(row.id);
  await ifTableExists(async () => {
    const pilot = await Promise.all([
      db.selectDistinct({ id: mealGroups.householdId }).from(mealGroups)
        .where(and(eq(mealGroups.userId, userId), isNotNull(mealGroups.householdId))),
      db.selectDistinct({ id: preparedBatches.householdId }).from(preparedBatches)
        .where(and(eq(preparedBatches.userId, userId), isNotNull(preparedBatches.householdId))),
    ]);
    for (const rows of pilot) for (const row of rows) if (row.id != null) ids.add(row.id);
  });

  let left = 0;
  let purged = 0;
  for (const householdId of ids) {
    const [household] = await db
      .select({ id: households.id, deletedAt: households.deletedAt })
      .from(households)
      .where(eq(households.id, householdId))
      .limit(1);
    const others = await otherHouseholdMembers(householdId, userId);
    if (!household || others.length === 0) {
      // Missing household row: purge still clears any orphaned scoped rows.
      await purgeHousehold(householdId);
      purged += 1;
      continue;
    }

    const live = !household.deletedAt;
    const isMember = memberships.some((m) => m.householdId === householdId);
    let successor = others.find((m) => m.role === "admin")?.userId ?? others[0].userId;
    if (isMember && live) {
      // Ghost copies of their planned recipes, calendar access, blocks.
      await handleMemberDeparture(householdId, userId);
      successor = (await promoteSuccessorAdmin(householdId, userId)) ?? successor;
    }

    await db.update(households).set({ createdBy: successor })
      .where(and(eq(households.id, householdId), eq(households.createdBy, userId)));
    await db.update(mealPlans).set({ userId: null })
      .where(and(eq(mealPlans.householdId, householdId), eq(mealPlans.userId, userId)));
    await db.update(inventory).set({ userId: null })
      .where(and(eq(inventory.householdId, householdId), eq(inventory.userId, userId)));
    await db.update(shoppingListItems).set({ userId: null })
      .where(and(eq(shoppingListItems.householdId, householdId), eq(shoppingListItems.userId, userId)));
    await ifTableExists(async () => {
      await db.update(mealGroups).set({ userId: successor })
        .where(and(eq(mealGroups.householdId, householdId), eq(mealGroups.userId, userId)));
      await db.update(preparedBatches).set({ userId: successor })
        .where(and(eq(preparedBatches.householdId, householdId), eq(preparedBatches.userId, userId)));
    });
    await db.delete(householdMemberBlocks)
      .where(and(eq(householdMemberBlocks.householdId, householdId), eq(householdMemberBlocks.userId, userId)));
    await db.delete(householdActivityLog)
      .where(and(eq(householdActivityLog.householdId, householdId), eq(householdActivityLog.userId, userId)));
    await db.delete(householdMembers)
      .where(and(eq(householdMembers.householdId, householdId), eq(householdMembers.userId, userId)));
    if (isMember) left += 1;
  }
  return { left, purged };
}

// ─── Books ─────────────────────────────────────────────────
async function deleteBooks(userId: number): Promise<number> {
  const owned = await db.select({ id: books.id }).from(books).where(eq(books.createdBy, userId));
  const ids = owned.map((b) => b.id);
  for (const part of chunk(ids)) {
    await db.delete(shareLinks)
      .where(and(eq(shareLinks.resourceType, "book"), inArray(shareLinks.resourceId, part)));
    await db.delete(bookRecipes).where(inArray(bookRecipes.bookId, part));
    await db.delete(bookMembers).where(inArray(bookMembers.bookId, part));
    await db.delete(bookActivityLog).where(inArray(bookActivityLog.bookId, part));
    // Legacy single-book pointer on other people's recipes.
    await db.update(recipes).set({ bookId: null }).where(inArray(recipes.bookId, part));
    await ifTableExists(() =>
      db.update(usageEvents).set({ bookId: null }).where(inArray(usageEvents.bookId, part))
    );
    await deleteBookTips(sql`book_id IN (${sql.join(part.map((id) => sql`${String(id)}`), sql`, `)})`);
    await db.delete(books).where(inArray(books.id, part));
  }

  // Other people's books: leave them, keep their contents.
  await db.delete(bookMembers).where(eq(bookMembers.userId, userId));
  await db.delete(bookActivityLog).where(eq(bookActivityLog.userId, userId));
  // added_by has no ON DELETE action: credit the book's owner instead.
  await db.run(sql`UPDATE book_recipes
    SET added_by = (SELECT created_by FROM books WHERE books.id = book_recipes.book_id)
    WHERE added_by = ${userId}`);
  await deleteBookTips(sql`added_by = ${String(userId)}`);
  return ids.length;
}

// book_tips still references a legacy recipe_books table in production, so
// any write to it fails while foreign keys are on. Nothing can be stored
// there today; try, and log instead of failing the deletion.
async function deleteBookTips(where: ReturnType<typeof sql>): Promise<void> {
  try {
    await db.run(sql`DELETE FROM book_tips WHERE ${where}`);
  } catch (error) {
    console.warn("account delete: book_tips cleanup skipped", errorMessage(error));
  }
}

// ─── Recipes ───────────────────────────────────────────────
async function deleteRecipes(userId: number): Promise<{ count: number; blobs: BlobCleanupResult }> {
  const rows = await db.select({ id: recipes.id }).from(recipes).where(eq(recipes.userId, userId));
  const ids = rows.map((r) => r.id);
  const blobUrls = await collectRecipeBlobUrls(ids);
  for (const part of chunk(ids)) {
    await db.delete(shareLinks)
      .where(and(eq(shareLinks.resourceType, "recipe"), inArray(shareLinks.resourceId, part)));
    await db.delete(ingredients).where(inArray(ingredients.recipeId, part));
    await db.delete(instructions).where(inArray(instructions.recipeId, part));
    await db.delete(recipePhotos).where(inArray(recipePhotos.recipeId, part));
    await db.delete(voiceRecordings).where(inArray(voiceRecordings.recipeId, part));
    await db.delete(recipeFlags).where(inArray(recipeFlags.recipeId, part));
    await db.delete(recipeNextTries).where(inArray(recipeNextTries.recipeId, part));
    await db.delete(recipeAttempts).where(inArray(recipeAttempts.recipeId, part));
    await db.delete(recipeVersions).where(inArray(recipeVersions.recipeId, part));
    await db.delete(bookRecipes).where(inArray(bookRecipes.recipeId, part));
    await ifTableExists(() => db.delete(recipeDishTypes).where(inArray(recipeDishTypes.recipeId, part)));
    // Other cascades (household plan slots of these recipes) run here.
    await db.delete(recipes).where(inArray(recipes.id, part));
  }
  const blobs = await deleteRecipeBlobs(blobUrls);

  // The user's marks on other people's recipes.
  await db.delete(recipeFlags).where(eq(recipeFlags.userId, userId));
  await db.delete(recipeNextTries).where(eq(recipeNextTries.userId, userId));
  await db.delete(recipeAttempts).where(eq(recipeAttempts.userId, userId));
  await db.update(recipeVersions).set({ changedBy: null }).where(eq(recipeVersions.changedBy, userId));
  await db.update(recipes).set({ sharedToHouseholdBy: null }).where(eq(recipes.sharedToHouseholdBy, userId));
  return { count: ids.length, blobs };
}

// ─── Personal planning, stock and settings ─────────────────
async function deletePersonalRows(userId: number, email: string): Promise<void> {
  await ifTableExists(async () => {
    const groupIds = db.select({ id: mealGroups.id }).from(mealGroups)
      .where(and(eq(mealGroups.userId, userId), isNull(mealGroups.householdId)));
    const batchIds = db.select({ id: preparedBatches.id }).from(preparedBatches)
      .where(and(eq(preparedBatches.userId, userId), isNull(preparedBatches.householdId)));
    const lotIds = db.select({ id: preparedLots.id }).from(preparedLots)
      .where(inArray(preparedLots.batchId, batchIds));
    // Reservations hold lots with ON DELETE RESTRICT: they go first.
    await db.delete(preparedReservations).where(
      or(inArray(preparedReservations.mealGroupId, groupIds), inArray(preparedReservations.lotId, lotIds))
    );
    await db.delete(mealConfirmationCommands).where(eq(mealConfirmationCommands.userId, userId));
    await db.delete(mealGroups)
      .where(and(eq(mealGroups.userId, userId), isNull(mealGroups.householdId)));
    await db.delete(preparedLots).where(inArray(preparedLots.batchId, batchIds));
    await db.delete(preparedBatches)
      .where(and(eq(preparedBatches.userId, userId), isNull(preparedBatches.householdId)));
    await db.update(mealGroups).set({ confirmedBy: null }).where(eq(mealGroups.confirmedBy, userId));
  });
  await db.delete(mealPlans).where(and(eq(mealPlans.userId, userId), isNull(mealPlans.householdId)));
  await db.delete(mealPlanBlocks).where(eq(mealPlanBlocks.userId, userId));
  await db.delete(inventory).where(and(eq(inventory.userId, userId), isNull(inventory.householdId)));
  await db.delete(shoppingListItems)
    .where(and(eq(shoppingListItems.userId, userId), isNull(shoppingListItems.householdId)));
  await db.update(shoppingListItems).set({ tickedBy: null }).where(eq(shoppingListItems.tickedBy, userId));
  await db.update(shoppingListItems).set({ movedBy: null }).where(eq(shoppingListItems.movedBy, userId));

  await ifTableExists(() => db.delete(notificationJobs).where(eq(notificationJobs.userId, userId)));
  await ifTableExists(() => db.delete(pushSubscriptions).where(eq(pushSubscriptions.userId, userId)));
  await ifTableExists(() =>
    db.delete(notificationPreferences).where(eq(notificationPreferences.userId, userId))
  );
  await ifTableExists(() => db.delete(pilotFeedback).where(eq(pilotFeedback.userId, userId)));
  await db.delete(shareLinks).where(eq(shareLinks.createdBy, userId));
  await db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, userId));
  await ifTableExists(() =>
    db.delete(emailVerificationTokens).where(eq(emailVerificationTokens.userId, userId))
  );
  // Product analytics stay, without the person.
  await ifTableExists(() =>
    db.update(usageEvents).set({ userId: null }).where(eq(usageEvents.userId, userId))
  );

  await db.delete(authRateLimits).where(inArray(authRateLimits.key, rateLimitKeysFor(userId, email)));
  // Any other limiter scoped by email ("<name>:<email>").
  const suffix = `:${email.toLowerCase()}`;
  await db.run(
    sql`DELETE FROM auth_rate_limits WHERE substr(lower(key), -${suffix.length}) = ${suffix}`
  );
  await ifTableExists(() => db.run(sql`DELETE FROM waitlist WHERE lower(email) = ${email.toLowerCase()}`));
}

// Rate-limit rows keyed by this user's id (the scopes the routes use).
export function rateLimitKeysFor(userId: number, email: string): string[] {
  const id = String(userId);
  const keys = new Set<string>();
  for (const config of Object.values(RATE_LIMITS)) {
    keys.add(`${config.name}:${id}`);
    keys.add(`${config.name}:user:${id}`);
    keys.add(`${config.name}:${email.toLowerCase()}`);
  }
  return [...keys];
}

/**
 * Deletes the account and everything it owns. Safe to call again after a
 * partial failure. Throws if a database step fails (the caller returns 500
 * and the user can retry); blob and Google calendar failures are only
 * logged.
 */
export async function deleteAccountData(user: { id: number; email: string }): Promise<AccountDeletionSummary> {
  const userId = user.id;
  await deleteCalendarData(userId);
  const householdResult = await leaveHouseholds(userId);
  const booksDeleted = await deleteBooks(userId);
  const recipeResult = await deleteRecipes(userId);
  await deletePersonalRows(userId, user.email);
  await db.delete(users).where(eq(users.id, userId));
  return {
    recipes: recipeResult.count,
    booksDeleted,
    householdsLeft: householdResult.left,
    householdsPurged: householdResult.purged,
    blobs: recipeResult.blobs,
  };
}
