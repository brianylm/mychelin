import { describe, expect, it } from "vitest";
import { getAuthenticatedEntryPath } from "./auth-entry";

describe("getAuthenticatedEntryPath", () => {
  it("preserves only shared-recipe return paths", () => {
    expect(getAuthenticatedEntryPath("/shared/family-recipe?from=invite")).toBe(
      "/shared/family-recipe?from=invite"
    );
  });

  it.each([
    undefined,
    "",
    "/",
    "/app?tab=profile",
    "//example.com/shared/recipe",
    "https://example.com/shared/recipe",
  ])("uses the app for %s", (returnTo) => {
    expect(getAuthenticatedEntryPath(returnTo)).toBe("/app");
  });
});
