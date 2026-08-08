import { describe, it, expect } from "vitest";
import {
  parseYieldServings,
  scaleServingsForEaters,
  formatServingLabel,
} from "./household-portions";

describe("parseYieldServings", () => {
  it("parses common yield formats", () => {
    expect(parseYieldServings("4 servings")).toBe(4);
    expect(parseYieldServings("serves 2")).toBe(2);
    expect(parseYieldServings("Makes 6 pieces")).toBe(6);
    expect(parseYieldServings("2.5")).toBe(2.5);
  });
  it("returns null when there is no usable number", () => {
    expect(parseYieldServings(null)).toBeNull();
    expect(parseYieldServings("")).toBeNull();
    expect(parseYieldServings("a big pot")).toBeNull();
    expect(parseYieldServings("0 servings")).toBeNull();
  });
});

describe("scaleServingsForEaters", () => {
  it("scales the recipe yield by the share of members still eating", () => {
    // Packet example: yields 4, household of 4, one blocked → serves 3.
    const scale = scaleServingsForEaters({ baseServings: 4, memberCount: 4, blockedCount: 1 });
    expect(scale.eaters).toBe(3);
    expect(scale.scaledServings).toBe(3);
    expect(scale.anyoneEating).toBe(true);
  });

  it("keeps the full yield when nobody is blocked", () => {
    const scale = scaleServingsForEaters({ baseServings: 4, memberCount: 4, blockedCount: 0 });
    expect(scale.scaledServings).toBe(4);
  });

  it("rounds to half-serving granularity", () => {
    const scale = scaleServingsForEaters({ baseServings: 2, memberCount: 4, blockedCount: 3 });
    expect(scale.scaledServings).toBe(0.5);
  });

  it("handles a fully blocked slot without serves-0 weirdness", () => {
    const scale = scaleServingsForEaters({ baseServings: 4, memberCount: 2, blockedCount: 2 });
    expect(scale.eaters).toBe(0);
    expect(scale.anyoneEating).toBe(false);
    expect(formatServingLabel(scale)).toBe("nobody eating");
  });

  it("clamps blockedCount to the member count", () => {
    const scale = scaleServingsForEaters({ baseServings: 4, memberCount: 2, blockedCount: 5 });
    expect(scale.blockedCount).toBe(2);
    expect(scale.anyoneEating).toBe(false);
  });
});

describe("formatServingLabel", () => {
  it("shows scaled vs base servings", () => {
    const scale = scaleServingsForEaters({ baseServings: 4, memberCount: 4, blockedCount: 1 });
    expect(formatServingLabel(scale)).toBe("serves 3 of 4");
  });
  it("formats half servings with one decimal", () => {
    const scale = scaleServingsForEaters({ baseServings: 3, memberCount: 2, blockedCount: 1 });
    expect(formatServingLabel(scale)).toBe("serves 1.5 of 3");
  });
});
