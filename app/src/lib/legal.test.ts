import { describe, expect, it } from "vitest";
import { SUPPORT_EMAIL } from "./legal";

describe("SUPPORT_EMAIL", () => {
  it("is a plain address (no spaces, one @) so mailto: links work", () => {
    expect(SUPPORT_EMAIL).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
  });
});
