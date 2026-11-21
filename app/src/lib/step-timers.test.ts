import { describe, expect, it } from "vitest";
import { detectAllStepTimerSeconds, detectStepTimerSeconds } from "./step-timers";

describe("multiple step timers", () => {
  it("lists every explicit duration and defaults to the first", () => {
    const text = "Simmer 10 min, then rest 5 min";
    expect(detectAllStepTimerSeconds(text)).toEqual([600, 300]);
    expect(detectStepTimerSeconds(text)).toBe(600);
  });
  it("returns nothing when no duration is stated", () => {
    expect(detectAllStepTimerSeconds("Fry until golden")).toEqual([]);
  });
});
