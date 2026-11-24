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
  mealGroups,
  mealPlans,
  preparedBatches,
  preparedLots,
  preparedReservations,
  recipes,
  shoppingListItems,
  type Household,
} from "@/db/schema";
import { and, eq, inArray, isNull, lt, ne, or, sql } from "drizzle-orm";
import { HOUSEHOLDS_ENABLED } from "@/lib/feature-flags";
import { ensureMealPilotTables } from "@/db/ensure-schema";
import {
  queueCalendarHouseholdDeletion,
  queueCalendarMemberDeparture,
} from "@/lib/meal-calendar/store";
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

// Join codes use an unambiguous alphabet (no 0/O, 1/I/L). New codes are
// 8 characters (31^8 ≈ 2^39.6); households created before the change keep
// their 6-character code until it next rotates, so both lengths are valid
// input. Edge-safe: uses the Web Crypto API available in both runtimes.
export const JOIN_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const JOIN_CODE_LENGTH = 8;
export const LEGACY_JOIN_CODE_LENGTH = 6;

export function generateJoinCode(): string {
  const alphabet = JOIN_CODE_ALPHABET;
  // Rejection sampling keeps every character equally likely: 256 is not a
  // multiple of 31, so bytes at or above the largest multiple are skipped.
  const ceiling = 256 - (256 % alphabet.length);
  let code = "";
  while (code.length < JOIN_CODE_LENGTH) {
    const bytes = crypto.getRandomValues(new Uint8Array(JOIN_CODE_LENGTH * 2));
    for (const byte of bytes) {
      if (byte >= ceiling) continue;
      code += alphabet[byte % alphabet.length];
      if (code.length === JOIN_CODE_LENGTH) break;
    }
  }
  return code;
}

// Input check for the join route: an upper-cased code of either length,
// made only of alphabet characters. Anything else cannot match a row.
export function isWellFormedJoinCode(code: string): boolean {
  if (code.length !== JOIN_CODE_LENGTH && code.length !== LEGACY_JOIN_CODE_LENGTH) {
    return false;
  }
  for (const ch of code) {
    if (!JOIN_CODE_ALPHABET.includes(ch)) return false;
  }
  return true;
}

// Replaces a household's join code with a fresh one, so a code held by a
// departed or removed member stops working. join_code is UNIQUE; retry on
// the (astronomically unlikely) collision exactly like creation does.
export async function rotateJoinCode(householdId: number): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const joinCode = generateJoinCode();
    try {
      await db
        .update(households)
        .set({ joinCode })
        .where(eq(households.id, householdId));
      return joinCode;
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      if (!message.toLowerCase().includes("unique")) throw e;
    }
  }
  throw new Error("Could not generate a unique join code");
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
  await queueCalendarDeparture(householdId, userId);

  await db
    .delete(householdMemberBlocks)
    .where(
      and(
        eq(householdMemberBlocks.householdId, householdId),
        eq(householdMemberBlocks.userId, userId)
      )
    );

  // Count everyone except the departing user: the last member to leave
  // keeps their membership row (see the leave route) so a former admin can
  // reactivate the dead household; that row must not count as "remaining".
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(householdMembers)
    .where(
      and(
        eq(householdMembers.householdId, householdId),
        ne(householdMembers.userId, userId)
      )
    );

  if (Number(count) === 0) {
    await db
      .update(households)
      .set({ deletedAt: new Date().toISOString() })
      .where(and(eq(households.id, householdId), isNull(households.deletedAt)));
    await queueCalendarHouseholdRemoval(householdId);
    return true;
  }
  return false;
}

// Remaining members of a household other than `userId`, earliest joined
// first. Used to pick who takes over when a member leaves for good.
export async function otherHouseholdMembers(
  householdId: number,
  userId: number
): Promise<{ userId: number; role: string }[]> {
  return db
    .select({ userId: householdMembers.userId, role: householdMembers.role })
    .from(householdMembers)
    .where(
      and(
        eq(householdMembers.householdId, householdId),
        ne(householdMembers.userId, userId)
      )
    )
    .orderBy(householdMembers.joinedAt, householdMembers.id);
}

// Call before removing a departing member's row. If no other admin would
// remain, the earliest-joined remaining member becomes admin so a live
// household is never left without one. Returns that member's id, or null
// when nobody was promoted (another admin remains, or nobody remains).
export async function promoteSuccessorAdmin(
  householdId: number,
  departingUserId: number
): Promise<number | null> {
  const others = await otherHouseholdMembers(householdId, departingUserId);
  if (others.length === 0 || others.some((m) => m.role === "admin")) return null;
  const successor = others[0].userId;
  await db
    .update(householdMembers)
    .set({ role: "admin" })
    .where(
      and(
        eq(householdMembers.householdId, householdId),
        eq(householdMembers.userId, successor)
      )
    );
  return successor;
}

// Membership changes have already committed when these run, so a calendar
// failure is logged rather than failing the request. The runner separately
// pauses a connection whose owner is no longer a member.
async function queueCalendarDeparture(householdId: number, userId: number): Promise<void> {
  try {
    await ensureMealPilotTables();
    await queueCalendarMemberDeparture({ householdId, userId });
  } catch (error) {
    console.error("Calendar access revocation could not be queued", { householdId, userId, error });
  }
}

export async function queueCalendarHouseholdRemoval(householdId: number): Promise<void> {
  try {
    await ensureMealPilotTables();
    await queueCalendarHouseholdDeletion(householdId);
  } catch (error) {
    console.error("Calendar teardown could not be queued", { householdId, error });
  }
}

// Permanent deletion of a household and every household-scoped row.
// Explicit deletes instead of relying on FK cascades — SQLite foreign
// key enforcement is connection-dependent, so the purge does not assume
// it. Share links are user-owned (share_links.created_by → users), never
// household-owned, so there is nothing to decommission here.
export async function purgeHousehold(householdId: number): Promise<void> {
  // Meal pilot rows first. Reservations hold their lot with ON DELETE
  // restrict, so they must go before the lots and batches; otherwise the
  // household delete's cascade order decides whether the purge throws.
  await ensureMealPilotTables();
  const groupIds = db
    .select({ id: mealGroups.id })
    .from(mealGroups)
    .where(eq(mealGroups.householdId, householdId));
  const batchIds = db
    .select({ id: preparedBatches.id })
    .from(preparedBatches)
    .where(eq(preparedBatches.householdId, householdId));
  const lotIds = db
    .select({ id: preparedLots.id })
    .from(preparedLots)
    .where(inArray(preparedLots.batchId, batchIds));
  await db
    .delete(preparedReservations)
    .where(
      or(
        inArray(preparedReservations.mealGroupId, groupIds),
        inArray(preparedReservations.lotId, lotIds)
      )
    );
  await db.delete(mealGroups).where(eq(mealGroups.householdId, householdId));
  await db.delete(preparedLots).where(inArray(preparedLots.batchId, batchIds));
  await db.delete(preparedBatches).where(eq(preparedBatches.householdId, householdId));
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
