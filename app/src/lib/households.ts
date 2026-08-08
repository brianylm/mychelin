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
  type Household,
} from "@/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { HOUSEHOLDS_ENABLED } from "@/lib/feature-flags";

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
export async function getUserHousehold(
  userId: number
): Promise<HouseholdMembership | null> {
  if (!HOUSEHOLDS_ENABLED) return null;

  const [row] = await db
    .select({ household: households, role: householdMembers.role })
    .from(householdMembers)
    .innerJoin(households, eq(householdMembers.householdId, households.id))
    .where(
      and(eq(householdMembers.userId, userId), isNull(households.deletedAt))
    )
    .orderBy(householdMembers.joinedAt)
    .limit(1);

  if (!row) return null;
  return { household: row.household, role: row.role as HouseholdRole };
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
