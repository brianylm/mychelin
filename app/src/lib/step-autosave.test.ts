import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createStepAutosave, type StepSaveRequest } from "./step-autosave";

function setup(sendImpl?: (req: StepSaveRequest) => Promise<void>) {
  const calls: StepSaveRequest[] = [];
  const send = vi.fn(async (req: StepSaveRequest) => {
    calls.push(req);
    if (sendImpl) await sendImpl(req);
  });
  const onChange = vi.fn();
  const autosave = createStepAutosave({ send, debounceMs: 800, onChange });
  return { autosave, send, calls, onChange };
}

describe("createStepAutosave", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("debounces typing into a single save", async () => {
    const { autosave, calls } = setup();
    autosave.track(1, 10, "Boil");
    autosave.edit(1, 10, "Boil w");
    vi.advanceTimersByTime(300);
    autosave.edit(1, 10, "Boil wa");
    vi.advanceTimersByTime(300);
    autosave.edit(1, 10, "Boil water");
    expect(calls).toHaveLength(0);
    expect(autosave.snapshot().pending).toBe(1);
    await vi.advanceTimersByTimeAsync(800);
    expect(calls).toEqual([
      { recipeId: 10, stepId: 1, content: "Boil water", keepalive: false },
    ]);
    expect(autosave.isDirty(1)).toBe(false);
    expect(autosave.snapshot()).toEqual({ pending: 0, hasUnsaved: false, errorIds: [] });
  });

  it("sends A -> B -> A in order (compares against last sent, not server)", async () => {
    let release: (() => void) | null = null;
    const { autosave, calls } = setup(
      (req) =>
        req.content === "B"
          ? new Promise<void>((r) => {
              release = r;
            })
          : Promise.resolve()
    );
    autosave.track(1, 10, "A");
    autosave.blur(1, 10, "B");
    autosave.blur(1, 10, "A");
    await vi.advanceTimersByTimeAsync(0);
    // Second save waits for the first (serialized per step).
    expect(calls.map((c) => c.content)).toEqual(["B"]);
    release!();
    await vi.advanceTimersByTimeAsync(0);
    expect(calls.map((c) => c.content)).toEqual(["B", "A"]);
    expect(autosave.isDirty(1)).toBe(false);
  });

  it("does not send when the value equals the last sent value", async () => {
    const { autosave, send } = setup();
    autosave.track(1, 10, "Stir");
    autosave.edit(1, 10, "Stir");
    await vi.advanceTimersByTimeAsync(1000);
    await autosave.blur(1, 10, "Stir");
    expect(send).not.toHaveBeenCalled();

    await autosave.blur(1, 10, "Stir well");
    await autosave.blur(1, 10, "Stir well");
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("flush sends keepalive PATCHes for all dirty steps and skips empty ones", async () => {
    const { autosave, calls } = setup();
    autosave.track(1, 10, "One");
    autosave.track(2, 10, "Two");
    autosave.track(3, 10, "Three");
    autosave.track(4, 10, "Four");
    autosave.edit(1, 10, "One edited");
    autosave.edit(2, 10, "Two edited");
    autosave.edit(3, 10, ""); // cleared: never deleted or sent by a flush
    expect(autosave.snapshot().hasUnsaved).toBe(true);
    await autosave.flush();
    expect(calls).toEqual([
      { recipeId: 10, stepId: 1, content: "One edited", keepalive: true },
      { recipeId: 10, stepId: 2, content: "Two edited", keepalive: true },
    ]);
    // Debounce timers were cancelled: nothing more goes out.
    await vi.advanceTimersByTimeAsync(2000);
    expect(calls).toHaveLength(2);
    expect(autosave.snapshot().hasUnsaved).toBe(false);
  });

  it("keeps a step dirty after a failed save and retries on the next edit", async () => {
    let fail = true;
    const onError = vi.fn();
    const calls: string[] = [];
    const autosave = createStepAutosave({
      send: async (req) => {
        calls.push(req.content);
        if (fail) throw new Error("offline");
      },
      onError,
    });
    autosave.track(1, 10, "Fry");
    await autosave.blur(1, 10, "Fry garlic");
    expect(onError).toHaveBeenCalledWith(1, expect.any(Error));
    expect(autosave.isDirty(1)).toBe(true);
    expect(autosave.snapshot().errorIds).toEqual([1]);
    expect(autosave.snapshot().hasUnsaved).toBe(true);

    fail = false;
    // Same value again still retries because the failed send is not "sent".
    await autosave.blur(1, 10, "Fry garlic");
    expect(calls).toEqual(["Fry garlic", "Fry garlic"]);
    expect(autosave.isDirty(1)).toBe(false);
    expect(autosave.snapshot().errorIds).toEqual([]);
  });

  it("a late older response does not overwrite a newer confirmation", async () => {
    let releaseOld: (() => void) | null = null;
    const { autosave } = setup((req) =>
      req.content === "old" && !req.keepalive
        ? new Promise<void>((r) => {
            releaseOld = r;
          })
        : Promise.resolve()
    );
    autosave.track(1, 10, "orig");
    void autosave.blur(1, 10, "old");
    await vi.advanceTimersByTimeAsync(0);
    autosave.edit(1, 10, "new");
    await autosave.flush();
    expect(autosave.isDirty(1)).toBe(true); // "old" still in flight
    releaseOld!();
    await vi.advanceTimersByTimeAsync(0);
    expect(autosave.isDirty(1)).toBe(false);
  });
});
