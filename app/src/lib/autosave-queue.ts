/**
 * Generic autosave queue for per-record field edits (recipe steps,
 * ingredients). See step-autosave.ts / ingredient-autosave.ts.
 *
 * - Debounced save after typing stops (one timer per record), plus an
 *   immediate save on blur. Several fields of one record edited within the
 *   debounce window go out as one PATCH.
 * - Each save sends only the fields whose latest value differs from the
 *   last value queued/sent (not stale server data), so A -> B -> A sends
 *   both B and A.
 * - Saves for one record are serialized (promise chain per record) so the
 *   last write wins on the server.
 * - flush() sends every unsaved record right away with keepalive, for
 *   pagehide / visibilitychange / unmount. Values rejected by isSendable
 *   (e.g. an empty step or ingredient name) are never sent, so a flush
 *   never deletes or blanks a record.
 * - A failed save keeps the record dirty and marks it errored; the next
 *   edit, blur, retry() or flush() sends it again.
 *
 * Pure: fetch and timers are injected so this is unit-testable in node.
 */

export type AutosaveValue = string | number | boolean | null;
export type AutosaveFields = Record<string, AutosaveValue>;

export interface AutosaveSaveRequest {
  recipeId: number;
  id: number;
  patch: AutosaveFields;
  keepalive: boolean;
}

export interface AutosaveSnapshot {
  /** Saves in flight plus debounce timers waiting to fire. */
  pending: number;
  /** True when any record has unsaved fields or a save in flight. */
  hasUnsaved: boolean;
  /** Record ids whose last save failed. */
  errorIds: number[];
}

export interface AutosaveQueueOptions {
  send: (req: AutosaveSaveRequest) => Promise<void>;
  debounceMs?: number;
  setTimer?: (fn: () => void, ms: number) => unknown;
  clearTimer?: (handle: unknown) => void;
  onChange?: (snapshot: AutosaveSnapshot) => void;
  onError?: (id: number, error: unknown) => void;
  /** False for values that must never be autosaved (default: all sendable). */
  isSendable?: (field: string, value: AutosaveValue) => boolean;
}

interface Entry {
  recipeId: number;
  /** Latest values typed by the user (already normalized by the caller). */
  latest: AutosaveFields;
  /** Last values the server confirmed. */
  confirmed: AutosaveFields;
  /** Last values handed to the queue (in flight or confirmed). */
  queued: AutosaveFields;
  timer: unknown;
  inFlight: number;
  chain: Promise<void>;
  error: boolean;
  /** Sequence of the newest send issued / confirmed, so a late older
   *  response never overwrites a newer confirmation. */
  seq: number;
  confirmedSeq: number;
  fieldConfirmedSeq: Record<string, number>;
}

export const AUTOSAVE_DEBOUNCE_MS = 800;

const same = (a: AutosaveValue | undefined, b: AutosaveValue | undefined) =>
  Object.is(a, b);

export function createAutosaveQueue(options: AutosaveQueueOptions) {
  const {
    send,
    debounceMs = AUTOSAVE_DEBOUNCE_MS,
    setTimer = (fn, ms) => setTimeout(fn, ms),
    clearTimer = (h) => clearTimeout(h as ReturnType<typeof setTimeout>),
    onChange,
    onError,
    isSendable = () => true,
  } = options;

  const entries = new Map<number, Entry>();

  /** Fields whose latest value is sendable and differs from `base`. */
  function diff(e: Entry, base: AutosaveFields): AutosaveFields | null {
    let patch: AutosaveFields | null = null;
    for (const field of Object.keys(e.latest)) {
      const value = e.latest[field];
      if (!isSendable(field, value) || same(value, base[field])) continue;
      (patch ??= {})[field] = value;
    }
    return patch;
  }

  const isDirtyEntry = (e: Entry) => diff(e, e.confirmed) !== null;

  function snapshot(): AutosaveSnapshot {
    let pending = 0;
    let hasUnsaved = false;
    const errorIds: number[] = [];
    for (const [id, e] of entries) {
      pending += e.inFlight + (e.timer !== null ? 1 : 0);
      if (e.inFlight > 0 || isDirtyEntry(e)) hasUnsaved = true;
      if (e.error) errorIds.push(id);
    }
    return { pending, hasUnsaved, errorIds };
  }

  function emit() {
    onChange?.(snapshot());
  }

  /**
   * Register a record with its current server values. Fields already known
   * keep their tracked state; new fields start from the given value.
   */
  function track(id: number, recipeId: number, serverValues: AutosaveFields) {
    let e = entries.get(id);
    if (!e) {
      e = {
        recipeId,
        latest: {},
        confirmed: {},
        queued: {},
        timer: null,
        inFlight: 0,
        chain: Promise.resolve(),
        error: false,
        seq: 0,
        confirmedSeq: 0,
        fieldConfirmedSeq: {},
      };
      entries.set(id, e);
    }
    for (const [field, value] of Object.entries(serverValues)) {
      if (field in e.latest) continue;
      e.latest[field] = value;
      e.confirmed[field] = value;
      e.queued[field] = value;
    }
  }

  function cancelTimer(e: Entry) {
    if (e.timer !== null) {
      clearTimer(e.timer);
      e.timer = null;
    }
  }

  function runSend(id: number, e: Entry, patch: AutosaveFields, keepalive: boolean) {
    e.inFlight += 1;
    const seq = ++e.seq;
    return send({ recipeId: e.recipeId, id, patch, keepalive }).then(
      () => {
        e.inFlight -= 1;
        for (const [field, value] of Object.entries(patch)) {
          if (seq > (e.fieldConfirmedSeq[field] ?? 0)) {
            e.fieldConfirmedSeq[field] = seq;
            e.confirmed[field] = value;
          }
        }
        if (seq > e.confirmedSeq) {
          e.confirmedSeq = seq;
          e.error = false;
        }
        emit();
      },
      (err) => {
        e.inFlight -= 1;
        e.error = true;
        // Let the next edit/blur/flush resend the latest values.
        for (const field of Object.keys(patch)) e.queued[field] = e.confirmed[field];
        onError?.(id, err);
        emit();
      }
    );
  }

  /** Queue a save of the latest changed fields now (serialized per record). */
  function saveNow(id: number) {
    const e = entries.get(id);
    if (!e) return Promise.resolve();
    cancelTimer(e);
    const patch = diff(e, e.queued);
    if (!patch) {
      emit();
      return e.chain;
    }
    Object.assign(e.queued, patch);
    e.chain = e.chain.then(() => runSend(id, e, patch, false));
    emit();
    return e.chain;
  }

  function setLatest(id: number, recipeId: number, field: string, value: AutosaveValue) {
    track(id, recipeId, { [field]: value });
    const e = entries.get(id)!;
    e.latest[field] = value;
    return e;
  }

  /** Record a typed value and (re)start the record's debounce timer. */
  function edit(id: number, recipeId: number, field: string, value: AutosaveValue) {
    const e = setLatest(id, recipeId, field, value);
    cancelTimer(e);
    if (diff(e, e.queued)) {
      e.timer = setTimer(() => {
        e.timer = null;
        void saveNow(id);
      }, debounceMs);
    }
    emit();
  }

  /** Blur (or a discrete change): record the value and save immediately. */
  function blur(id: number, recipeId: number, field: string, value: AutosaveValue) {
    setLatest(id, recipeId, field, value);
    return saveNow(id);
  }

  /**
   * Send every unsaved record now with keepalive so the request survives a
   * reload or tab close. Skips unsendable values (never deletes).
   */
  function flush() {
    const sends: Promise<void>[] = [];
    for (const [id, e] of entries) {
      cancelTimer(e);
      const patch = diff(e, e.confirmed);
      if (!patch) continue;
      // Already queued and in flight with these exact values: a normal fetch
      // may be cancelled on unload, so resend with keepalive anyway.
      Object.assign(e.queued, patch);
      sends.push(runSend(id, e, patch, true));
    }
    emit();
    return Promise.all(sends).then(() => undefined);
  }

  /** Forget a record (e.g. after the user deletes it). */
  function discard(id: number) {
    const e = entries.get(id);
    if (!e) return;
    cancelTimer(e);
    entries.delete(id);
    emit();
  }

  function isDirty(id: number) {
    const e = entries.get(id);
    return !!e && (isDirtyEntry(e) || e.inFlight > 0);
  }

  function dispose() {
    for (const e of entries.values()) cancelTimer(e);
  }

  return {
    track,
    edit,
    blur,
    retry: saveNow,
    flush,
    discard,
    isDirty,
    snapshot,
    dispose,
  };
}

export type AutosaveQueue = ReturnType<typeof createAutosaveQueue>;
