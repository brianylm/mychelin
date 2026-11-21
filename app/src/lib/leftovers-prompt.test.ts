import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type Mod = typeof import("./leftovers-prompt");

const request = { recipeId: 1, title: "Soup", mealPlanId: null };

describe("leftovers-prompt sequencing", () => {
  let mod: Mod;

  beforeEach(async () => {
    vi.useFakeTimers();
    // No jsdom in this repo: a minimal window backed by EventTarget.
    const target = new EventTarget();
    vi.stubGlobal("window", {
      addEventListener: target.addEventListener.bind(target),
      removeEventListener: target.removeEventListener.bind(target),
      dispatchEvent: target.dispatchEvent.bind(target),
      setTimeout: globalThis.setTimeout,
      clearTimeout: globalThis.clearTimeout,
    });
    vi.resetModules();
    mod = await import("./leftovers-prompt");
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("runs the callback immediately when idle", () => {
    const cb = vi.fn();
    mod.afterLeftovers(cb);
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it("waits while a request is pending and fires once on settle", () => {
    const cb = vi.fn();
    mod.requestLeftovers(request);
    mod.afterLeftovers(cb);
    expect(cb).not.toHaveBeenCalled();
    mod.settleLeftovers();
    expect(cb).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(60_000);
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it("waits for every pending request", () => {
    const cb = vi.fn();
    mod.requestLeftovers(request);
    mod.requestLeftovers({ ...request, recipeId: 2 });
    mod.afterLeftovers(cb);
    mod.settleLeftovers();
    expect(cb).not.toHaveBeenCalled();
    mod.settleLeftovers();
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it("falls back after 30 seconds if the prompt never settles", () => {
    const cb = vi.fn();
    mod.requestLeftovers(request);
    mod.afterLeftovers(cb);
    vi.advanceTimersByTime(29_999);
    expect(cb).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(cb).toHaveBeenCalledTimes(1);
    mod.settleLeftovers();
    expect(cb).toHaveBeenCalledTimes(1);
  });
});
