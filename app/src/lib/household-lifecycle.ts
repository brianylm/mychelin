// 30-day household deletion flow. Pure and unit-testable
// (household-lifecycle.test.ts); the DB-touching callers live in
// lib/households.ts.
//
// Semantics (work packet, decision 9): when a household dies (last
// member leaves or an admin deletes it) deleted_at is set and the
// household is dead-but-recoverable for 30 days — gone from all UI/APIs
// except the join-code reactivation path. After the window the next
// access purges it permanently.

export const HOUSEHOLD_RECOVERY_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

// Parses a stored ISO timestamp; null/invalid → null (callers treat an
// unparseable deleted_at as "not deleted" rather than purging live data
// on a bad read).
export function parseDeletedAt(deletedAt: string | null | undefined): number | null {
  if (!deletedAt) return null;
  const time = new Date(deletedAt).getTime();
  return Number.isNaN(time) ? null : time;
}

// The moment after which reactivation stops working and purge may run.
export function recoveryDeadline(deletedAt: string): Date {
  const deleted = parseDeletedAt(deletedAt);
  if (deleted === null) throw new Error("Invalid deletedAt timestamp");
  return new Date(deleted + HOUSEHOLD_RECOVERY_DAYS * DAY_MS);
}

// True while the join code can still reactivate the household.
export function isWithinRecoveryWindow(
  deletedAt: string | null | undefined,
  now: Date = new Date()
): boolean {
  const deleted = parseDeletedAt(deletedAt);
  if (deleted === null) return false;
  return now.getTime() - deleted < HOUSEHOLD_RECOVERY_DAYS * DAY_MS;
}

// True once the household should be permanently purged and the join
// code must fail with "permanently deleted".
export function isPastRecoveryWindow(
  deletedAt: string | null | undefined,
  now: Date = new Date()
): boolean {
  const deleted = parseDeletedAt(deletedAt);
  if (deleted === null) return false;
  return now.getTime() - deleted >= HOUSEHOLD_RECOVERY_DAYS * DAY_MS;
}
