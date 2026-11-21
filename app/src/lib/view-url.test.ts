import { describe, expect, it } from "vitest";
import { parseView, serializeView } from "./view-url";

const loc = (search: string, hash = "") => ({ pathname: "/app", search, hash });

describe("parseView", () => {
  it("reads valid views", () => {
    expect(parseView("?view=plan")).toBe("plan");
    expect(parseView("?view=fridge&x=1")).toBe("fridge");
  });
  it("ignores unknown or missing views", () => {
    expect(parseView("?view=bogus")).toBe("recipes");
    expect(parseView("?view=recipes")).toBe("recipes");
    expect(parseView("")).toBe("recipes");
  });
  it("lets a selected recipe win", () => {
    expect(parseView("?recipe=4&view=plan")).toBe("recipes");
  });
});

describe("serializeView", () => {
  it("sets the view and keeps other params and hash", () => {
    expect(serializeView("shopping", loc("?start=next-meal", "#a"))).toBe(
      "/app?start=next-meal&view=shopping#a",
    );
  });
  it("replaces an existing view", () => {
    expect(serializeView("plan", loc("?view=fridge"))).toBe("/app?view=plan");
  });
  it("omits recipes and keeps the rest", () => {
    expect(serializeView("recipes", loc("?view=plan&x=1"))).toBe("/app?x=1");
    expect(serializeView("recipes", loc("?view=plan"))).toBe("/app");
  });
});
