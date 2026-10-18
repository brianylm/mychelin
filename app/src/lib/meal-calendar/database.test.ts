import { describe, expect, it } from "vitest";
import { calendarConnectionOwnsMealGroup } from "./database";

describe("calendar connection meal scope", () => {
  it("rejects stale or corrupt jobs from another user or household", () => {
    expect(
      calendarConnectionOwnsMealGroup(
        { userId: 1, householdId: 10 },
        { userId: 99, householdId: 10 }
      )
    ).toBe(true);
    expect(
      calendarConnectionOwnsMealGroup(
        { userId: 1, householdId: 10 },
        { userId: 1, householdId: 11 }
      )
    ).toBe(false);
    expect(
      calendarConnectionOwnsMealGroup(
        { userId: 1, householdId: null },
        { userId: 2, householdId: null }
      )
    ).toBe(false);
    expect(
      calendarConnectionOwnsMealGroup(
        { userId: 1, householdId: null },
        { userId: 1, householdId: 10 }
      )
    ).toBe(false);
  });
});
