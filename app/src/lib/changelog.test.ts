import { describe, expect, it } from "vitest";
import { changelogEntries, changelogVersion } from "./changelog";

describe("changelogVersion", () => {
  it("numbers the newest entry from the full changelog length", () => {
    expect(changelogVersion(changelogEntries[0])).toBe(`v1.${changelogEntries.length}`);
  });

  it("numbers the oldest entry as v1.1", () => {
    expect(changelogVersion(changelogEntries[changelogEntries.length - 1])).toBe("v1.1");
  });
});
