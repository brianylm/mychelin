import { describe, expect, it } from "vitest";
import { mondayOf } from "./week-start";

const key = (d: Date) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

describe("mondayOf", () => {
  it("keeps Sunday in the week that started the previous Monday", () => {
    expect(key(mondayOf(new Date(2026, 10, 22, 1, 13)))).toBe("2026-11-16");
  });
  it("returns the same day on a Monday", () => {
    expect(key(mondayOf(new Date(2026, 10, 16, 9)))).toBe("2026-11-16");
  });
  it("handles mid-week and month boundaries", () => {
    expect(key(mondayOf(new Date(2026, 10, 21)))).toBe("2026-11-16");
    expect(key(mondayOf(new Date(2026, 11, 2)))).toBe("2026-11-30");
  });
});
