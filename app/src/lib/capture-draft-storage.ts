// localStorage backup for in-progress capture text, so an accidental
// modal close (or a failed save) never loses what the user pasted or
// typed. Every operation is try/catch — private-mode or full storage
// must never break the capture flow itself.

export interface CaptureDraft {
  text: string;
  title?: string;
  savedAt: string;
}

function storageOrNull(): Storage | null {
  try {
    if (typeof window === "undefined" || !window.localStorage) return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

export function saveCaptureDraft(key: string, draft: { text: string; title?: string }): void {
  const storage = storageOrNull();
  if (!storage) return;
  try {
    storage.setItem(key, JSON.stringify({ ...draft, savedAt: new Date().toISOString() }));
  } catch {
    /* storage full or unavailable — the flow continues without backup */
  }
}

export function loadCaptureDraft(key: string): CaptureDraft | null {
  const storage = storageOrNull();
  if (!storage) return null;
  try {
    const raw = storage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CaptureDraft>;
    if (typeof parsed.text !== "string" || !parsed.text.trim()) return null;
    return {
      text: parsed.text,
      title: typeof parsed.title === "string" ? parsed.title : undefined,
      savedAt: typeof parsed.savedAt === "string" ? parsed.savedAt : "",
    };
  } catch {
    // Corrupt entry — treat as no backup, and clean it up.
    try {
      storage.removeItem(key);
    } catch {
      /* ignore */
    }
    return null;
  }
}

export function clearCaptureDraft(key: string): void {
  const storage = storageOrNull();
  if (!storage) return;
  try {
    storage.removeItem(key);
  } catch {
    /* ignore */
  }
}
