import { describe, expect, it } from "vitest";
import { currentWeekRange } from "./view-cache";

describe("currentWeekRange", () => {
  it("spans Monday to Sunday for a mid-week day", () => {
    expect(currentWeekRange(new Date(2026, 9, 15, 18, 30))).toEqual({
      start: "2026-10-12",
      end: "2026-10-18",
    });
  });

  it("crosses a month boundary", () => {
    expect(currentWeekRange(new Date(2026, 9, 1))).toEqual({
      start: "2026-09-28",
      end: "2026-10-04",
    });
  });

  // Matches the planner's getWeekDates(0): Sunday belongs to the week that
  // started the Monday before (it used to jump to next week on Sundays, so
  // Shopping hid Sunday's own meals).
  it("keeps Sunday in the current week, like the planner", () => {
    expect(currentWeekRange(new Date(2026, 9, 18))).toEqual({
      start: "2026-10-12",
      end: "2026-10-18",
    });
  });
});
