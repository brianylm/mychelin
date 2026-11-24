// Test-only synthetic data for the account deletion and export tests.
// User 1 (Owner) is the account under test. User 2 (Other) shares a
// household and books with them; user 3 is a Google-only account; user 4 is
// a third household member. All names, emails and URLs are synthetic.
import bcrypt from "bcryptjs";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import * as s from "@/db/schema";

export const BLOB = "https://fixture123.public.blob.vercel-storage.com";
export const OWNER = { id: 1, name: "Owner Cook", email: "owner@example.test", password: "right-password" };
export const OTHER = { id: 2, name: "Other Cook", email: "other@example.test" };
export const GOOGLE = { id: 3, name: "Google Cook", email: "google@example.test" };
export const FOURTH = { id: 4, name: "Fourth Cook", email: "fourth@example.test" };

export async function seedAccountFixture(db: LibSQLDatabase<typeof s>): Promise<void> {
  const hash = bcrypt.hashSync(OWNER.password, 4);
  await db.insert(s.users).values([
    { id: 1, name: OWNER.name, email: OWNER.email, passwordHash: hash, authProvider: "password", emailVerified: true, googleSub: "sub-owner-secret", tokenVersion: 7, cookingGoal: "family dishes", createdAt: "2026-01-01T00:00:00.000Z" },
    { id: 2, name: OTHER.name, email: OTHER.email, passwordHash: hash },
    { id: 3, name: GOOGLE.name, email: GOOGLE.email, passwordHash: bcrypt.hashSync("random-unknown", 4), authProvider: "google", googleSub: "sub-google" },
    { id: 4, name: FOURTH.name, email: FOURTH.email, passwordHash: hash },
  ]);

  // Recipes: 10 and 11 are the owner's, 20 belongs to Other.
  await db.insert(s.recipes).values([
    { id: 10, userId: 1, title: "Owner Laksa", imageUrl: `${BLOB}/cover-10.jpg`, story: "Synthetic story" },
    { id: 11, userId: 1, title: "Owner Kaya", sharedToHouseholdAt: "2026-02-01", sharedToHouseholdBy: 1 },
    { id: 20, userId: 2, title: "Other Rendang" },
  ]);
  await db.insert(s.ingredients).values([
    { recipeId: 10, name: "noodles", quantity: 200, unit: "g" },
    { recipeId: 20, name: "beef", quantity: 1, unit: "kg" },
  ]);
  await db.insert(s.instructions).values([
    { recipeId: 10, stepNumber: 1, content: "Boil the noodles" },
    { recipeId: 20, stepNumber: 1, content: "Brown the beef" },
  ]);
  await db.insert(s.recipePhotos).values([
    { recipeId: 10, blobUrl: `${BLOB}/upload-10.jpg`, source: "upload" },
    { recipeId: 10, blobUrl: `${BLOB}/generated-10.png`, source: "generated" },
    { recipeId: 20, blobUrl: `${BLOB}/upload-20.jpg`, source: "upload" },
  ]);
  await db.insert(s.voiceRecordings).values([
    { recipeId: 10, blobUrl: `${BLOB}/voice-10.webm`, duration: 30 },
    { recipeId: 20, blobUrl: `${BLOB}/voice-20.webm`, duration: 20 },
  ]);
  await db.insert(s.recipeVersions).values([
    { id: 500, recipeId: 10, versionNumber: 1, changedBy: 1 },
    { id: 501, recipeId: 20, versionNumber: 1, changedBy: 1 },
  ]);
  await db.insert(s.recipeAttempts).values([
    { recipeId: 10, userId: 1, notes: "Owner cooked laksa" },
    { recipeId: 20, userId: 1, notes: "Owner cooked Other's rendang" },
    { recipeId: 20, userId: 2, notes: "Other cooked rendang" },
  ]);
  await db.insert(s.recipeNextTries).values([{ recipeId: 10, userId: 1, notes: "Less salt" }]);
  await db.insert(s.recipeFlags).values([
    { recipeId: 10, userId: 1, flag: "favourite" },
    { recipeId: 20, userId: 1, flag: "favourite" },
    { recipeId: 20, userId: 2, flag: "favourite" },
  ]);
  await db.insert(s.shareLinks).values([
    { token: "share-owner-secret", resourceType: "recipe", resourceId: 10, permission: "view", createdBy: 1 },
    { token: "share-other", resourceType: "recipe", resourceId: 20, permission: "view", createdBy: 2 },
  ]);

  // Books: 100 is the owner's (Other is a member), 200 is Other's (owner is an editor).
  await db.insert(s.books).values([
    { id: 100, title: "Owner Family Book", createdBy: 1 },
    { id: 200, title: "Other Family Book", createdBy: 2 },
  ]);
  await db.insert(s.bookMembers).values([
    { bookId: 100, userId: 1, role: "owner" },
    { bookId: 100, userId: 2, role: "viewer" },
    { bookId: 200, userId: 2, role: "owner" },
    { bookId: 200, userId: 1, role: "editor" },
  ]);
  await db.insert(s.bookRecipes).values([
    { bookId: 100, recipeId: 10, addedBy: 1 },
    { bookId: 100, recipeId: 20, addedBy: 2 },
    { bookId: 200, recipeId: 20, addedBy: 1 },
    { bookId: 200, recipeId: 11, addedBy: 1 },
  ]);
  await db.insert(s.bookActivityLog).values([
    { bookId: 200, userId: 1, action: "added_recipe", targetName: "Other Rendang" },
    { bookId: 200, userId: 2, action: "created_book" },
  ]);

  // Household 300, created by the owner (admin, joined first); Other joined
  // before Fourth.
  await db.insert(s.households).values([{ id: 300, name: "Synthetic Home", joinCode: "ABCDEFGH", createdBy: 1 }]);
  await db.insert(s.householdMembers).values([
    { householdId: 300, userId: 1, role: "admin", joinedAt: "2026-01-01T00:00:00.000Z" },
    { householdId: 300, userId: 2, role: "member", joinedAt: "2026-01-02T00:00:00.000Z" },
    { householdId: 300, userId: 4, role: "member", joinedAt: "2026-01-03T00:00:00.000Z" },
  ]);
  await db.insert(s.householdActivityLog).values([
    { householdId: 300, userId: 1, action: "created_household" },
    { householdId: 300, userId: 2, action: "joined_household" },
  ]);
  await db.insert(s.mealPlans).values([
    { id: 700, userId: 1, householdId: 300, date: "2026-12-01", mealType: "dinner", recipeId: 20 },
    { id: 701, userId: 1, date: "2026-12-02", mealType: "dinner", recipeId: 10 },
    { id: 702, userId: 2, householdId: 300, date: "2026-12-03", mealType: "dinner", recipeId: 20 },
  ]);
  await db.insert(s.mealGroups).values([
    { id: 800, userId: 1, householdId: 300, date: "2026-12-01", mealType: "dinner", serveAt: "2026-12-01T19:00:00+08:00", timezone: "Asia/Singapore", dinerCount: 3 },
    { id: 801, userId: 1, date: "2026-12-02", mealType: "dinner", serveAt: "2026-12-02T19:00:00+08:00", timezone: "Asia/Singapore", dinerCount: 1 },
  ]);
  await db.insert(s.inventory).values([
    { userId: 1, householdId: 300, name: "Shared rice", quantity: 2, unit: "kg" },
    { userId: 1, name: "Owner chilli", quantity: 1, unit: "jar" },
    { userId: 2, name: "Other salt", quantity: 1, unit: "jar" },
  ]);
  await db.insert(s.shoppingListItems).values([
    { userId: 2, householdId: 300, itemKey: "manual_eggs_", name: "eggs", tickedBy: 1, movedBy: 1 },
    { userId: 1, householdId: 300, itemKey: "manual_milk_", name: "milk" },
    { userId: 1, itemKey: "manual_tofu_", name: "tofu" },
  ]);
  await db.insert(s.mealPlanBlocks).values([{ userId: 1, date: "2026-12-05", mealType: "lunch" }]);

  await db.insert(s.notificationPreferences).values([{ userId: 1, weeklyCookingGoal: 3 }]);
  await db.insert(s.pushSubscriptions).values([{ userId: 1, endpoint: "https://push.example.test/secret", p256dh: "p256dh-secret", auth: "auth-secret" }]);
  await db.insert(s.pilotFeedback).values([
    { userId: 1, stage: "first_cook", rating: 5, comment: "Owner feedback" },
    { userId: 2, stage: "first_cook", rating: 4, comment: "Other feedback" },
  ]);
  await db.insert(s.passwordResetTokens).values([{ userId: 1, tokenHash: "reset-hash", expiresAt: "2026-12-31T00:00:00.000Z" }]);
  await db.insert(s.emailVerificationTokens).values([{ userId: 1, tokenHash: "verify-hash", email: OWNER.email, expiresAt: "2026-12-31T00:00:00.000Z" }]);
  await db.insert(s.authRateLimits).values([
    { key: `forgot_password:${OWNER.email}`, count: 1, windowStart: new Date().toISOString() },
    { key: "change_password:1", count: 1, windowStart: new Date().toISOString() },
    { key: "ai:user:1", count: 3, windowStart: new Date().toISOString() },
    { key: "login:203.0.113.9", count: 1, windowStart: new Date().toISOString() },
    { key: `forgot_password:${OTHER.email}`, count: 1, windowStart: new Date().toISOString() },
    { key: "ai:user:11", count: 1, windowStart: new Date().toISOString() },
  ]);
  await db.insert(s.usageEvents).values([
    { userId: 1, eventName: "recipe_created", recipeId: 10 },
    { userId: 1, eventName: "app_opened" },
    { userId: 2, eventName: "app_opened" },
  ]);
  await db.insert(s.calendarConnections).values([{
    userId: 1,
    googleAccountEmail: "owner-cal@example.test",
    grantedScopes: "calendar",
    calendarId: "cal-1",
    calendarName: "Mychelin",
    calendarTimezone: "Asia/Singapore",
    refreshTokenCiphertext: "cipher-secret",
    refreshTokenIv: "iv",
  }]);
}
