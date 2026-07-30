import { describe, it, expect, beforeEach } from "vitest";
import {
  saveCaptureDraft,
  loadCaptureDraft,
  clearCaptureDraft,
} from "./capture-draft-storage";

// Minimal localStorage stub for the node test environment.
class MemoryStorage {
  private map = new Map<string, string>();
  getItem(key: string) {
    return this.map.has(key) ? this.map.get(key)! : null;
  }
  setItem(key: string, value: string) {
    this.map.set(key, String(value));
  }
  removeItem(key: string) {
    this.map.delete(key);
  }
}

const KEY = "mychelin:capture:test";

beforeEach(() => {
  (globalThis as Record<string, unknown>).window = { localStorage: new MemoryStorage() };
});

describe("capture-draft-storage", () => {
  it("round-trips a draft", () => {
    saveCaptureDraft(KEY, { text: "2 cloves garlic\n fry rice", title: "Fried rice" });
    const loaded = loadCaptureDraft(KEY);
    expect(loaded?.text).toBe("2 cloves garlic\n fry rice");
    expect(loaded?.title).toBe("Fried rice");
    expect(typeof loaded?.savedAt).toBe("string");
  });

  it("returns null for missing, empty, and corrupt entries", () => {
    expect(loadCaptureDraft(KEY)).toBeNull();

    saveCaptureDraft(KEY, { text: "   " });
    expect(loadCaptureDraft(KEY)).toBeNull();

    const storage = (globalThis as Record<string, unknown>).window as { localStorage: MemoryStorage };
    storage.localStorage.setItem(KEY, "{not json");
    expect(loadCaptureDraft(KEY)).toBeNull();
    // corrupt entry is cleaned up
    expect(storage.localStorage.getItem(KEY)).toBeNull();
  });

  it("clearCaptureDraft removes the entry", () => {
    saveCaptureDraft(KEY, { text: "something" });
    clearCaptureDraft(KEY);
    expect(loadCaptureDraft(KEY)).toBeNull();
  });

  it("never throws when storage is unavailable", () => {
    (globalThis as Record<string, unknown>).window = undefined;
    expect(() => saveCaptureDraft(KEY, { text: "x" })).not.toThrow();
    expect(loadCaptureDraft(KEY)).toBeNull();
    expect(() => clearCaptureDraft(KEY)).not.toThrow();
  });
});
