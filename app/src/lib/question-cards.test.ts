import { describe, it, expect } from "vitest";
import { selectVisibleCards, normalizeCardText } from "./question-cards";

describe("normalizeCardText", () => {
  it("normalizes case and whitespace", () => {
    expect(normalizeCardText("  Ask   HOW much? ")).toBe("ask how much?");
  });
});

describe("selectVisibleCards", () => {
  it("caps visible cards at 3 by default and reports overflow", () => {
    const { visible, overflowCount } = selectVisibleCards({
      suggestions: ["q1", "q2", "q3", "q4", "q5"],
      dismissed: [],
    });
    expect(visible).toEqual(["q1", "q2", "q3"]);
    expect(overflowCount).toBe(2);
  });

  it("filters dismissed cards with normalized matching", () => {
    const { visible, overflowCount } = selectVisibleCards({
      suggestions: ["Ask how much?", "q2", "q3", "q4"],
      dismissed: ["  ask   HOW much?"],
    });
    expect(visible).toEqual(["q2", "q3", "q4"]);
    expect(overflowCount).toBe(0);
  });

  it("honours a custom cap", () => {
    const { visible } = selectVisibleCards({
      suggestions: ["q1", "q2"],
      dismissed: [],
      cap: 1,
    });
    expect(visible).toEqual(["q1"]);
  });

  it("handles empty suggestions", () => {
    expect(selectVisibleCards({ suggestions: [], dismissed: [] })).toEqual({
      visible: [],
      overflowCount: 0,
    });
  });
});
