import { describe, it, expect } from "vitest";
import {
  HOUSEHOLD_RECOVERY_DAYS,
  isPastRecoveryWindow,
  isWithinRecoveryWindow,
  recoveryDeadline,
} from "./household-lifecycle";

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = new Date("2026-08-08T12:00:00Z");

function daysAgo(days: number): string {
  return new Date(NOW.getTime() - days * DAY_MS).toISOString();
}

describe("household 30-day deletion window", () => {
  it("is a 30-day window", () => {
    expect(HOUSEHOLD_RECOVERY_DAYS).toBe(30);
  });

  it("reactivates within the window", () => {
    expect(isWithinRecoveryWindow(daysAgo(0), NOW)).toBe(true);
    expect(isWithinRecoveryWindow(daysAgo(15), NOW)).toBe(true);
    expect(isWithinRecoveryWindow(daysAgo(29.9), NOW)).toBe(true);
    expect(isPastRecoveryWindow(daysAgo(29.9), NOW)).toBe(false);
  });

  it("rejects reactivation after the window", () => {
    expect(isWithinRecoveryWindow(daysAgo(30), NOW)).toBe(false);
    expect(isWithinRecoveryWindow(daysAgo(45), NOW)).toBe(false);
  });

  it("purges at or after the window boundary", () => {
    expect(isPastRecoveryWindow(daysAgo(30), NOW)).toBe(true);
    expect(isPastRecoveryWindow(daysAgo(31), NOW)).toBe(true);
    expect(isPastRecoveryWindow(daysAgo(29), NOW)).toBe(false);
  });

  it("never purges a live household (null deletedAt)", () => {
    expect(isWithinRecoveryWindow(null, NOW)).toBe(false);
    expect(isPastRecoveryWindow(null, NOW)).toBe(false);
    expect(isWithinRecoveryWindow(undefined, NOW)).toBe(false);
    expect(isPastRecoveryWindow(undefined, NOW)).toBe(false);
  });

  it("treats an unparseable deletedAt as not-deleted rather than purging", () => {
    expect(isWithinRecoveryWindow("not-a-date", NOW)).toBe(false);
    expect(isPastRecoveryWindow("not-a-date", NOW)).toBe(false);
  });

  it("computes the recovery deadline", () => {
    const deletedAt = daysAgo(10);
    expect(recoveryDeadline(deletedAt).getTime()).toBe(
      NOW.getTime() + 20 * DAY_MS
    );
  });
});
