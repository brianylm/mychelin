// Household access helpers — the server-side gate for every
// household-scoped query. Mirrors the recipe-access.ts discipline:
// nothing household-related is read or written without going through a
// membership check here first. Multi-user isolation is the highest-risk
// surface of the feature; keep all household queries scoped by the
// membership row, never by a client-supplied household id alone.

import { db } from "@/db";
import {
  households,
  householdMembers,
  householdActivityLog,
  householdMemberBlocks,
  inventory,
  mealPlans,
  recipes,
  shoppingListItems,
  type Household,
} from "@/db/schema";
import { and, eq, isNull, lt, sql } from "drizzle-orm";
import { HOUSEHOLDS_ENABLED } from "@/lib/feature-flags";
import {
  HOUSEHOLD_RECOVERY_DAYS,
  isPastRecoveryWindow,
} from "@/lib/household-lifecycle";

export type HouseholdRole = "admin" | "member";

export interface HouseholdMembership {
  household: Household;
  role: HouseholdRole;
}

// Returns the user's (first) live household membership, or null.
// Returns null when the kill switch is off, which makes every household
// code path unreachable without touching call sites.
//
// Slice 1 UI allows one household per user; the schema allows many, so
// "first live membership" is the documented resolution rule until a
// household switcher exists.
//
// Slice 2: this is also the membership-load purge path — a membership in
// a household whose deleted_at is past the 30-day recovery window
// triggers the lazy permanent purge and reads as "no household".
export async function getUserHousehold(
  userId: number
): Promise<HouseholdMembership | null> {
  if (!HOUSEHOLDS_ENABLED) return null;

  // Live memberships first (deleted_at IS NULL sorts ahead), then by
  // join order. One round trip in the common case; deleted memberships
  // only cost extra work when there is no live household to return.
  const rows = await db
    .select({ household: households, role: householdMembers.role })
    .from(householdMembers)
    .innerJoin(households, eq(householdMembers.householdId, households.id))
    .where(eq(householdMembers.userId, userId))
    .orderBy(sql`${households.deletedAt} IS NOT NULL`, householdMembers.joinedAt)
    .limit(5);

  for (const row of rows) {
    if (!row.household.deletedAt) {
      return { household: row.household, role: row.role as HouseholdRole };
    }
  }
  // No live household. Lazily purge any memberships past the window so
  // expired households disappear from the DB, not just from the UI.
  for (const row of rows) {
    if (row.household.deletedAt && isPastRecoveryWindow(row.household.deletedAt)) {
      await purgeHousehold(row.household.id);
    }
  }
  return null;
}

// True iff the user is a member (any role) of the given household.
// Used to authorize reads/writes of household-scoped plan rows.
export async function isHouseholdMember(
  userId: number,
  householdId: number
): Promise<boolean> {
  const [row] = await db
    .select({ id: householdMembers.id })
    .from(householdMembers)
    .where(
      and(
        eq(householdMembers.householdId, householdId),
        eq(householdMembers.userId, userId)
      )
    )
    .limit(1);
  return !!row;
}

export async function isHouseholdAdmin(
  userId: number,
  householdId: number
): Promise<boolean> {
  const [row] = await db
    .select({ id: householdMembers.id })
    .from(householdMembers)
    .where(
      and(
        eq(householdMembers.householdId, householdId),
        eq(householdMembers.userId, userId),
        eq(householdMembers.role, "admin")
      )
    )
    .limit(1);
  return !!row;
}

// In-app activity feed only — never wire these events into push.
export async function logHouseholdActivity(
  householdId: number,
  userId: number,
  action: string,
  targetName?: string | null
): Promise<void> {
  await db.insert(householdActivityLog).values({
    householdId,
    userId,
    action,
    targetName: targetName ?? null,
  });
}

// 6-char join code from an unambiguous alphabet (no 0/O, 1/I/L).
// Edge-safe: uses the Web Crypto API available in both runtimes.
export function generateJoinCode(): string {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  let code = "";
  for (const byte of bytes) {
    code += alphabet[byte % alphabet.length];
  }
  return code;
}

// ─── Slice 2: ghosts, departure cleanup, deletion ──────────

// Snapshots minimal recipe display data onto household plan slots whose
// recipe belongs to the departing user, so the slots keep rendering for
// the remaining members even if the recipe later becomes inaccessible
// (ghost copies, packet decision 9). Only fills slots not already
// ghosted. Slots referencing already-inaccessible recipes stay
// selectable for nothing new — planner pickers are gated by
// canUserAccessRecipe, so ghosts can never be added to NEW plans.
export async function snapshotGhostSlots(
  householdId: number,
  ownerUserId: number | null
): Promise<void> {
  const conditions = [
    eq(mealPlans.householdId, householdId),
    isNull(mealPlans.ghostTitle),
  ];
  if (ownerUserId != null) {
    conditions.push(eq(recipes.userId, ownerUserId));
  }
  const slots = await db
    .select({
      id: mealPlans.id,
      title: recipes.title,
      yield: recipes.yield,
    })
    .from(mealPlans)
    .innerJoin(recipes, eq(mealPlans.recipeId, recipes.id))
    .where(and(...conditions));

  if (slots.length === 0) return;
  const now = new Date().toISOString();
  for (const slot of slots) {
    await db
      .update(mealPlans)
      .set({ ghostTitle: slot.title, ghostYield: slot.yield, ghostedAt: now })
      .where(eq(mealPlans.id, slot.id));
  }
}

// Everything that must happen when a member leaves or is removed:
// ghost their on-plan recipes, delete their per-member block rows
// (Slice 1 punt, done in Slice 2), and start the 30-day deletion flow
// when they were the last member. Returns true when the household went
// empty (and is now dead/recoverable).
export async function handleMemberDeparture(
  householdId: number,
  userId: number
): Promise<boolean> {
  await snapshotGhostSlots(householdId, userId);

  await db
    .delete(householdMemberBlocks)
    .where(
      and(
        eq(householdMemberBlocks.householdId, householdId),
        eq(householdMemberBlocks.userId, userId)
      )
    );

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(householdMembers)
    .where(eq(householdMembers.householdId, householdId));

  if (Number(count) === 0) {
    await db
      .update(households)
      .set({ deletedAt: new Date().toISOString() })
      .where(and(eq(households.id, householdId), isNull(households.deletedAt)));
    return true;
  }
  return false;
}

// Permanent deletion of a household and every household-scoped row.
// Explicit deletes instead of relying on FK cascades — SQLite foreign
// key enforcement is connection-dependent, so the purge does not assume
// it. Share links are user-owned (share_links.created_by → users), never
// household-owned, so there is nothing to decommission here.
export async function purgeHousehold(householdId: number): Promise<void> {
  await db.delete(shoppingListItems).where(eq(shoppingListItems.householdId, householdId));
  await db.delete(inventory).where(eq(inventory.householdId, householdId));
  await db.delete(mealPlans).where(eq(mealPlans.householdId, householdId));
  await db.delete(householdMemberBlocks).where(eq(householdMemberBlocks.householdId, householdId));
  await db.delete(householdActivityLog).where(eq(householdActivityLog.householdId, householdId));
  await db.delete(householdMembers).where(eq(householdMembers.householdId, householdId));
  await db.delete(households).where(eq(households.id, householdId));
}

// Sweeps every household whose 30-day recovery window has elapsed.
// Called from the existing notifications cron route; the per-access
// lazy purge lives in getUserHousehold and the join route.
export async function purgeExpiredHouseholds(now: Date = new Date()): Promise<number> {
  if (!HOUSEHOLDS_ENABLED) return 0;
  const cutoff = new Date(
    now.getTime() - HOUSEHOLD_RECOVERY_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();
  const expired = await db
    .select({ id: households.id })
    .from(households)
    .where(lt(households.deletedAt, cutoff));
  for (const row of expired) {
    await purgeHousehold(row.id);
  }
  return expired.length;
}
