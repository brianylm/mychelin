import { describe, it, expect } from "vitest";
import {
  mondayOfWeek,
  normalizeBlockDate,
  blockCoversSlot,
  blockedMembersForSlot,
  expandBlocksToSlots,
  isHouseholdBlockScope,
  blockActivityLabel,
  type HouseholdMemberBlockView,
} from "./household-blocking";

function block(
  overrides: Partial<HouseholdMemberBlockView>
): HouseholdMemberBlockView {
  return {
    id: 1,
    userId: 7,
    userName: "Kim",
    scope: "slot",
    date: "2026-08-10",
    mealType: "dinner",
    ...overrides,
  };
}

describe("mondayOfWeek", () => {
  it("returns the same day for a Monday", () => {
    expect(mondayOfWeek("2026-08-10")).toBe("2026-08-10"); // Monday
  });
  it("rolls back to Monday from mid-week and weekend", () => {
    expect(mondayOfWeek("2026-08-12")).toBe("2026-08-10"); // Wednesday
    expect(mondayOfWeek("2026-08-16")).toBe("2026-08-10"); // Sunday
  });
  it("crosses month boundaries", () => {
    expect(mondayOfWeek("2026-09-01")).toBe("2026-08-31"); // Tuesday
  });
});

describe("normalizeBlockDate", () => {
  it("keeps slot/day dates as-is", () => {
    expect(normalizeBlockDate("slot", "2026-08-12")).toBe("2026-08-12");
    expect(normalizeBlockDate("day", "2026-08-12")).toBe("2026-08-12");
  });
  it("normalizes week to Monday and month to the first", () => {
    expect(normalizeBlockDate("week", "2026-08-12")).toBe("2026-08-10");
    expect(normalizeBlockDate("month", "2026-08-12")).toBe("2026-08-01");
  });
  it("rejects malformed dates", () => {
    expect(() => normalizeBlockDate("day", "12/08/2026")).toThrow();
    expect(() => normalizeBlockDate("day", "not-a-date")).toThrow();
  });
});

describe("blockCoversSlot", () => {
  it("slot blocks match only the exact slot", () => {
    const b = block({});
    expect(blockCoversSlot(b, "2026-08-10", "dinner")).toBe(true);
    expect(blockCoversSlot(b, "2026-08-10", "lunch")).toBe(false);
    expect(blockCoversSlot(b, "2026-08-11", "dinner")).toBe(false);
  });
  it("day blocks cover every meal type that day only", () => {
    const b = block({ scope: "day", mealType: "" });
    expect(blockCoversSlot(b, "2026-08-10", "breakfast")).toBe(true);
    expect(blockCoversSlot(b, "2026-08-10", "dinner")).toBe(true);
    expect(blockCoversSlot(b, "2026-08-11", "dinner")).toBe(false);
  });
  it("week blocks cover the whole Monday–Sunday week", () => {
    const b = block({ scope: "week", date: "2026-08-10", mealType: "" });
    expect(blockCoversSlot(b, "2026-08-10", "lunch")).toBe(true);
    expect(blockCoversSlot(b, "2026-08-16", "dinner")).toBe(true);
    expect(blockCoversSlot(b, "2026-08-17", "dinner")).toBe(false);
    expect(blockCoversSlot(b, "2026-08-09", "dinner")).toBe(false);
  });
  it("month blocks cover the whole calendar month", () => {
    const b = block({ scope: "month", date: "2026-08-01", mealType: "" });
    expect(blockCoversSlot(b, "2026-08-01", "breakfast")).toBe(true);
    expect(blockCoversSlot(b, "2026-08-31", "snack")).toBe(true);
    expect(blockCoversSlot(b, "2026-09-01", "dinner")).toBe(false);
  });
});

describe("blockedMembersForSlot", () => {
  it("attributes every blocked member once, across overlapping scopes", () => {
    const blocks = [
      block({ id: 1, userId: 7, userName: "Kim" }),
      block({ id: 2, userId: 7, userName: "Kim", scope: "day", mealType: "" }),
      block({ id: 3, userId: 8, userName: "Ravi", scope: "week", mealType: "" }),
      block({ id: 4, userId: 9, userName: "Mei", date: "2026-08-11" }),
    ];
    const blocked = blockedMembersForSlot(blocks, "2026-08-10", "dinner");
    expect(blocked).toEqual([
      { userId: 7, userName: "Kim" },
      { userId: 8, userName: "Ravi" },
    ]);
  });

  it("two members blocking different slots scale independently", () => {
    const blocks = [
      block({ id: 1, userId: 7, date: "2026-08-10", mealType: "dinner" }),
      block({ id: 2, userId: 8, date: "2026-08-10", mealType: "lunch" }),
    ];
    expect(blockedMembersForSlot(blocks, "2026-08-10", "dinner").map((b) => b.userId)).toEqual([7]);
    expect(blockedMembersForSlot(blocks, "2026-08-10", "lunch").map((b) => b.userId)).toEqual([8]);
    expect(blockedMembersForSlot(blocks, "2026-08-10", "breakfast")).toEqual([]);
  });
});

describe("expandBlocksToSlots", () => {
  it("expands only the given user's blocks into covered slots", () => {
    const blocks = [
      block({ id: 1, userId: 7, scope: "day", date: "2026-08-10", mealType: "" }),
      block({ id: 2, userId: 8, date: "2026-08-11", mealType: "dinner" }),
    ];
    const slots = expandBlocksToSlots(blocks, 7, ["2026-08-10", "2026-08-11"], ["lunch", "dinner"]);
    expect(slots).toEqual([
      { date: "2026-08-10", mealType: "lunch" },
      { date: "2026-08-10", mealType: "dinner" },
    ]);
  });
});

describe("isHouseholdBlockScope / blockActivityLabel", () => {
  it("validates scopes", () => {
    expect(isHouseholdBlockScope("slot")).toBe(true);
    expect(isHouseholdBlockScope("year")).toBe(false);
    expect(isHouseholdBlockScope(undefined)).toBe(false);
  });
  it("labels activity entries", () => {
    expect(blockActivityLabel("slot", "2026-08-10", "dinner")).toBe("dinner on 2026-08-10");
    expect(blockActivityLabel("week", "2026-08-10")).toBe("week of 2026-08-10");
  });
});
