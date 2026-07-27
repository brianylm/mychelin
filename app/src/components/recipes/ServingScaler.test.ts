import { describe, it, expect } from "vitest";
import {
  parseBaseServings,
  getYieldLabel,
  formatScaledQuantity,
} from "./ServingScaler";

describe("parseBaseServings", () => {
  it("extracts the leading number from a yield string", () => {
    expect(parseBaseServings("4 servings")).toBe(4);
    expect(parseBaseServings("8")).toBe(8);
    expect(parseBaseServings("2 portions")).toBe(2);
    expect(parseBaseServings("12 cupcakes")).toBe(12);
  });

  it("handles decimals", () => {
    expect(parseBaseServings("2.5 cups")).toBe(2.5);
  });

  it("returns null when there is no number", () => {
    expect(parseBaseServings("")).toBeNull();
    expect(parseBaseServings("a handful")).toBeNull();
  });
});

describe("getYieldLabel", () => {
  it("extracts the unit label after the number", () => {
    expect(getYieldLabel("4 servings")).toBe("servings");
    expect(getYieldLabel("6 pax")).toBe("pax");
  });

  it("falls back to 'servings' when there is no label", () => {
    expect(getYieldLabel("8")).toBe("servings");
    expect(getYieldLabel("")).toBe("servings");
  });
});

describe("formatScaledQuantity", () => {
  it("returns empty string for null and zero", () => {
    expect(formatScaledQuantity(null, 2)).toBe("");
    expect(formatScaledQuantity(0, 2)).toBe("");
  });

  it("scales whole numbers", () => {
    expect(formatScaledQuantity(2, 2)).toBe("4");
    expect(formatScaledQuantity(1, 0.5)).toBe("½");
  });

  it("renders common cooking fractions", () => {
    expect(formatScaledQuantity(1, 0.25)).toBe("¼");
    expect(formatScaledQuantity(1, 0.333)).toBe("⅓");
    expect(formatScaledQuantity(3, 0.5)).toBe("1½");
    expect(formatScaledQuantity(1, 0.75)).toBe("¾");
  });

  it("snaps near-fractions within tolerance", () => {
    // 0.4 is within 0.05 of ⅜, so it renders as the fraction
    expect(formatScaledQuantity(1, 0.4)).toBe("⅜");
  });

  it("falls back to one decimal for awkward values", () => {
    // 2.07: fractional part 0.07 is outside every fraction's 0.05 band
    expect(formatScaledQuantity(1, 2.07)).toBe("2.1");
  });
});
