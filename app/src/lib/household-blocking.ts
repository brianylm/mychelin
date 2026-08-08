// Per-member blocking on the household shared plan. Pure functions so
// the scope math is unit-testable (household-blocking.test.ts); both the
// API routes and the planner UI normalize dates through here so a "week"
// block always means the same Monday everywhere.
//
// Scopes:
//   slot  — one meal on one day (date + mealType)
//   day   — every slot on one date
//   week  — every slot in the Monday–Sunday week containing the date
//   month — every slot in the calendar month containing the date
//
// Storage convention (see schema.ts): week rows store the week's Monday,
// month rows store the month's first day, and meal_type is "" for
// non-slot scopes.

export type HouseholdBlockScope = "slot" | "day" | "week" | "month";

export const HOUSEHOLD_BLOCK_SCOPES: readonly HouseholdBlockScope[] = [
  "slot",
  "day",
  "week",
  "month",
];

export interface HouseholdMemberBlockView {
  id: number;
  userId: number;
  userName?: string;
  scope: HouseholdBlockScope;
  date: string; // normalized: week → Monday, month → YYYY-MM-01
  mealType: string; // "" unless scope === "slot"
  note?: string | null;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isHouseholdBlockScope(value: unknown): value is HouseholdBlockScope {
  return (
    typeof value === "string" &&
    (HOUSEHOLD_BLOCK_SCOPES as readonly string[]).includes(value)
  );
}

// Monday of the week containing the given local date key. Done with
// UTC math so DST never shifts the result (same trick as
// planner-logged-meals.shiftDateKey).
export function mondayOfWeek(dateKey: string): string {
  const d = new Date(dateKey + "T00:00:00Z");
  const day = d.getUTCDay(); // 0 = Sunday
  const shift = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + shift);
  return d.toISOString().slice(0, 10);
}

export function monthStart(dateKey: string): string {
  return dateKey.slice(0, 7) + "-01";
}

// Normalizes a user-picked date to the canonical storage key for the
// scope. Throws on malformed input so callers can 400.
export function normalizeBlockDate(
  scope: HouseholdBlockScope,
  dateKey: string
): string {
  if (!DATE_RE.test(dateKey) || Number.isNaN(new Date(dateKey + "T00:00:00Z").getTime())) {
    throw new Error("Invalid date format. Use YYYY-MM-DD");
  }
  if (scope === "week") return mondayOfWeek(dateKey);
  if (scope === "month") return monthStart(dateKey);
  return dateKey;
}

// True iff the block covers the given plan slot.
export function blockCoversSlot(
  block: Pick<HouseholdMemberBlockView, "scope" | "date" | "mealType">,
  dateKey: string,
  mealType: string
): boolean {
  switch (block.scope) {
    case "slot":
      return block.date === dateKey && block.mealType === mealType;
    case "day":
      return block.date === dateKey;
    case "week":
      return block.date === mondayOfWeek(dateKey);
    case "month":
      return block.date === monthStart(dateKey);
  }
}

// Everyone blocked on this slot, deduped by user (a member can cover the
// same slot with overlapping scopes, e.g. a day block and a slot block).
export function blockedMembersForSlot(
  blocks: HouseholdMemberBlockView[],
  dateKey: string,
  mealType: string
): Array<{ userId: number; userName?: string }> {
  const seen = new Map<number, { userId: number; userName?: string }>();
  for (const block of blocks) {
    if (seen.has(block.userId)) continue;
    if (blockCoversSlot(block, dateKey, mealType)) {
      seen.set(block.userId, { userId: block.userId, userName: block.userName });
    }
  }
  return [...seen.values()];
}

// Expands one user's blocks into explicit slot refs over the given
// dates/meal types — used to feed the randomizer's fillable-slot logic
// so slots the current member blocked stay untouched.
export function expandBlocksToSlots(
  blocks: HouseholdMemberBlockView[],
  userId: number,
  dates: string[],
  mealTypes: readonly string[]
): Array<{ date: string; mealType: string }> {
  const mine = blocks.filter((b) => b.userId === userId);
  const slots: Array<{ date: string; mealType: string }> = [];
  for (const date of dates) {
    for (const mealType of mealTypes) {
      if (mine.some((b) => blockCoversSlot(b, date, mealType))) {
        slots.push({ date, mealType });
      }
    }
  }
  return slots;
}

// Human-readable label for the activity feed, e.g. "dinner on
// 2026-08-10", "day of 2026-08-10", "week of 2026-08-10".
export function blockActivityLabel(
  scope: HouseholdBlockScope,
  normalizedDate: string,
  mealType?: string
): string {
  if (scope === "slot") return `${mealType} on ${normalizedDate}`;
  return `${scope} of ${normalizedDate}`;
}
