import { describe, expect, it } from "vitest";
import { buildMissionSlots, firstFreeSlotDate } from "./mission-slots";

const NOW = new Date(2026, 10, 30, 19, 0); // 30 Nov, local

describe("mission slots", () => {
  it("offers tonight and tomorrow, rolling over the month", () => {
    const slots = buildMissionSlots([], [], NOW);
    expect(slots.map((s) => s.date)).toEqual(["2026-11-30", "2026-12-01"]);
    expect(firstFreeSlotDate(slots)).toBe("2026-11-30");
  });

  it("marks occupied dinners and skips to the first free one", () => {
    const slots = buildMissionSlots(
      [
        { date: "2026-11-30", mealType: "dinner" },
        { date: "2026-12-01", mealType: "lunch" },
      ],
      [],
      NOW
    );
    expect(slots.map((s) => s.taken)).toEqual([true, false]);
    expect(firstFreeSlotDate(slots)).toBe("2026-12-01");
  });

  it("treats blocks as taken and returns null when both are", () => {
    const slots = buildMissionSlots(
      [{ date: "2026-11-30", mealType: "dinner" }],
      [{ date: "2026-12-01", mealType: "dinner" }],
      NOW
    );
    expect(firstFreeSlotDate(slots)).toBeNull();
  });
});
