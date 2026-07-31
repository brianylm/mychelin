import { describe, it, expect } from "vitest";
import { extractStepAction, truncateStepTitle } from "./cooking-card-verbs";

describe("extractStepAction", () => {
  it("extracts a leading English verb, title-cased", () => {
    expect(extractStepAction("fry garlic until fragrant")).toEqual({
      action: "Fry",
      rest: "garlic until fragrant",
    });
    expect(extractStepAction("Simmer for 20 min until soft")).toEqual({
      action: "Simmer",
      rest: "for 20 min until soft",
    });
  });

  it("prefers longer verbs (stir-fry over stir)", () => {
    const { action } = extractStepAction("stir-fry the noodles on high heat");
    expect(action).toBe("Stir-fry");
  });

  it("extracts dialect verbs", () => {
    expect(extractStepAction("tumis the rempah until oil splits").action).toBe("Tumis");
    expect(extractStepAction("goreng until golden").action).toBe("Goreng");
  });

  it("strips leading punctuation after the verb", () => {
    expect(extractStepAction("Add: the onions").rest).toBe("the onions");
  });

  it("returns null action when no lexicon verb leads", () => {
    const { action, rest } = extractStepAction("The dough should rest overnight");
    expect(action).toBeNull();
    expect(rest).toBe("The dough should rest overnight");
  });

  it("does not match verb prefixes of longer words", () => {
    expect(extractStepAction("season with salt").action).toBe("Season");
    // "seasoned"/"seasoning" are not the verb "season"
    expect(extractStepAction("seasoned rice is ready").action).toBeNull();
    expect(extractStepAction("seasoning packet goes in").action).toBeNull();
  });
});

describe("truncateStepTitle", () => {
  it("keeps short first lines intact", () => {
    expect(truncateStepTitle("Mix everything")).toBe("Mix everything");
  });

  it("truncates long first lines with an ellipsis", () => {
    const long = "Combine all of the ingredients in a very large mixing bowl and stir";
    const result = truncateStepTitle(long, 40);
    expect(result.length).toBeLessThanOrEqual(40);
    expect(result.endsWith("…")).toBe(true);
  });

  it("uses only the first line of multi-line steps", () => {
    expect(truncateStepTitle("First line\nSecond line")).toBe("First line");
  });
});
