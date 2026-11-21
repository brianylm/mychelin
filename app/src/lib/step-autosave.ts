/**
 * Autosave queue for recipe step text.
 *
 * - Debounced save after typing stops, plus an immediate save on blur.
 * - Compares against the last value queued/sent, not stale server content,
 *   so A -> B -> A sends both B and A.
 * - Saves for one step are serialized (promise chain per step) so the last
 *   write wins on the server.
 * - flush() sends every unsaved step right away with keepalive, for
 *   pagehide / visibilitychange / unmount. It never deletes steps: empty
 *   values are skipped (deleting stays an explicit user action).
 * - A failed save keeps the step dirty and marks it errored; the next edit,
 *   blur, retry() or flush() sends it again.
 *
 * Pure: fetch and timers are injected so this is unit-testable in node.
 */

export interface StepSaveRequest {
  recipeId: number;
  stepId: number;
  content: string;
  keepalive: boolean;
}

export type StepSaveSender = (req: StepSaveRequest) => Promise<void>;

export interface StepAutosaveSnapshot {
  /** Saves in flight plus debounce timers waiting to fire. */
  pending: number;
  /** True when any step has unsaved text or a save in flight. */
  hasUnsaved: boolean;
  /** Step ids whose last save failed. */
  errorIds: number[];
}

export interface StepAutosaveOptions {
  send: StepSaveSender;
  debounceMs?: number;
  setTimer?: (fn: () => void, ms: number) => unknown;
  clearTimer?: (handle: unknown) => void;
  onChange?: (snapshot: StepAutosaveSnapshot) => void;
  onError?: (stepId: number, error: unknown) => void;
}

interface Entry {
  recipeId: number;
  /** Latest value typed by the user (already normalized by the caller). */
  latest: string;
  /** Last value the server confirmed. */
  confirmed: string;
  /** Last value handed to the queue (in flight or confirmed). */
  queued: string;
  timer: unknown;
  inFlight: number;
  chain: Promise<void>;
  error: boolean;
  /** Sequence of the newest send issued / confirmed, so a late older
   *  response never overwrites a newer confirmation. */
  seq: number;
  confirmedSeq: number;
}

export const STEP_AUTOSAVE_DEBOUNCE_MS = 800;

export function createStepAutosave(options: StepAutosaveOptions) {
  const {
    send,
    debounceMs = STEP_AUTOSAVE_DEBOUNCE_MS,
    setTimer = (fn, ms) => setTimeout(fn, ms),
    clearTimer = (h) => clearTimeout(h as ReturnType<typeof setTimeout>),
    onChange,
    onError,
  } = options;

  const entries = new Map<number, Entry>();

  function snapshot(): StepAutosaveSnapshot {
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

  function isDirtyEntry(e: Entry) {
    return e.latest !== "" && e.latest !== e.confirmed;
  }

  /** Register a step with its current server content. No-op if known. */
  function track(stepId: number, recipeId: number, serverContent: string) {
    if (entries.has(stepId)) return;
    entries.set(stepId, {
      recipeId,
      latest: serverContent,
      confirmed: serverContent,
      queued: serverContent,
      timer: null,
      inFlight: 0,
      chain: Promise.resolve(),
      error: false,
      seq: 0,
      confirmedSeq: 0,
    });
  }

  function cancelTimer(e: Entry) {
    if (e.timer !== null) {
      clearTimer(e.timer);
      e.timer = null;
    }
  }

  function runSend(stepId: number, e: Entry, value: string, keepalive: boolean) {
    e.inFlight += 1;
    const seq = ++e.seq;
    return send({ recipeId: e.recipeId, stepId, content: value, keepalive }).then(
      () => {
        e.inFlight -= 1;
        if (seq > e.confirmedSeq) {
          e.confirmedSeq = seq;
          e.confirmed = value;
          e.error = false;
        }
        emit();
      },
      (err) => {
        e.inFlight -= 1;
        e.error = true;
        // Let the next edit/blur/flush resend the latest value.
        e.queued = e.confirmed;
        onError?.(stepId, err);
        emit();
      }
    );
  }

  /** Queue a save of the latest value now (serialized per step). */
  function saveNow(stepId: number) {
    const e = entries.get(stepId);
    if (!e) return Promise.resolve();
    cancelTimer(e);
    const value = e.latest;
    if (value === "" || value === e.queued) {
      emit();
      return e.chain;
    }
    e.queued = value;
    e.chain = e.chain.then(() => runSend(stepId, e, value, false));
    emit();
    return e.chain;
  }

  /** Record typed text and (re)start the debounce timer. */
  function edit(stepId: number, recipeId: number, value: string) {
    track(stepId, recipeId, value);
    const e = entries.get(stepId)!;
    e.latest = value;
    cancelTimer(e);
    if (value !== "" && value !== e.queued) {
      e.timer = setTimer(() => {
        e.timer = null;
        void saveNow(stepId);
      }, debounceMs);
    }
    emit();
  }

  /** Blur: record the value and save immediately. */
  function blur(stepId: number, recipeId: number, value: string) {
    track(stepId, recipeId, value);
    entries.get(stepId)!.latest = value;
    return saveNow(stepId);
  }

  /**
   * Send every unsaved step now with keepalive so the request survives a
   * reload or tab close. Skips empty values (never deletes).
   */
  function flush() {
    const sends: Promise<void>[] = [];
    for (const [stepId, e] of entries) {
      cancelTimer(e);
      if (!isDirtyEntry(e)) continue;
      // Already queued and in flight with this exact value: a normal fetch
      // may be cancelled on unload, so resend with keepalive anyway.
      e.queued = e.latest;
      sends.push(runSend(stepId, e, e.latest, true));
    }
    emit();
    return Promise.all(sends).then(() => undefined);
  }

  /** Forget a step (e.g. after the user deletes it). */
  function discard(stepId: number) {
    const e = entries.get(stepId);
    if (!e) return;
    cancelTimer(e);
    entries.delete(stepId);
    emit();
  }

  function isDirty(stepId: number) {
    const e = entries.get(stepId);
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

export type StepAutosave = ReturnType<typeof createStepAutosave>;
