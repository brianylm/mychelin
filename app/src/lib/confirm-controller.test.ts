import { describe, expect, it, vi } from "vitest";
import { createConfirmController } from "./confirm-controller";

describe("createConfirmController", () => {
  it("resolves true on confirm and clears the pending request", async () => {
    const onChange = vi.fn();
    const { confirm, settle } = createConfirmController(onChange);
    const result = confirm({ title: "Delete?", destructive: true });
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ title: "Delete?", destructive: true })
    );
    settle(true);
    await expect(result).resolves.toBe(true);
    expect(onChange).toHaveBeenLastCalledWith(null);
  });

  it("resolves false on cancel", async () => {
    const { confirm, settle } = createConfirmController(() => {});
    const result = confirm({ title: "Close?" });
    settle(false);
    await expect(result).resolves.toBe(false);
  });

  it("cancels an older pending request when a new one opens", async () => {
    const { confirm, settle } = createConfirmController(() => {});
    const first = confirm({ title: "First" });
    const second = confirm({ title: "Second" });
    await expect(first).resolves.toBe(false);
    settle(true);
    await expect(second).resolves.toBe(true);
  });

  it("ignores settle with nothing pending", () => {
    const onChange = vi.fn();
    createConfirmController(onChange).settle(true);
    expect(onChange).not.toHaveBeenCalled();
  });
});
