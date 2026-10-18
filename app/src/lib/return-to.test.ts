import { describe, expect, it } from "vitest";
import { safeReturnTo } from "./return-to";

describe("safeReturnTo", () => {
  it("allows shared recipe and household invite paths", () => {
    expect(safeReturnTo("/shared/abc123")).toBe("/shared/abc123");
    expect(safeReturnTo("/join/XNDEHZ")).toBe("/join/XNDEHZ");
  });

  it("rejects everything else", () => {
    expect(safeReturnTo(null)).toBeNull();
    expect(safeReturnTo("")).toBeNull();
    expect(safeReturnTo("/app")).toBeNull();
    expect(safeReturnTo("https://evil.example/join/x")).toBeNull();
    expect(safeReturnTo("//evil.example/join/x")).toBeNull();
    expect(safeReturnTo("/join\\..\\evil")).toBeNull();
  });
});
