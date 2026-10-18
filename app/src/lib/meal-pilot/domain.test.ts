import { describe, expect, it } from "vitest";
import {
  isDateKey,
  isIanaTimezone,
  localDateKey,
  preparedLotBalance,
  servingsMultiplierForTarget,
} from "./domain";

describe("meal pilot domain", () => {
  it("converts an absolute diner target into a recipe multiplier", () => {
    expect(servingsMultiplierForTarget("serves 4", 2)).toBe(0.5);
    expect(servingsMultiplierForTarget("family style", 2)).toBeNull();
  });

  it("keeps physical, reserved, and unallocated prepared portions distinct", () => {
    expect(preparedLotBalance(6, [2, 2, 2])).toEqual({
      physicalPortions: 6,
      reservedPortions: 6,
      unallocatedPortions: 0,
    });
  });

  it("never reports negative unallocated stock", () => {
    expect(preparedLotBalance(2, [3]).unallocatedPortions).toBe(0);
  });

  it("validates real calendar dates and IANA timezones", () => {
    expect(isDateKey("2026-02-28")).toBe(true);
    expect(isDateKey("2026-02-30")).toBe(false);
    expect(isIanaTimezone("Asia/Singapore")).toBe(true);
    expect(isIanaTimezone("Kitchen/StoveA")).toBe(false);
  });

  it("derives the local date across a UTC boundary", () => {
    expect(localDateKey("2026-10-15T16:30:00.000Z", "Asia/Singapore")).toBe(
      "2026-10-16"
    );
  });
});
