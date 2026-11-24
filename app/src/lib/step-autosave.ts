/**
 * Autosave queue for recipe step text: a single-field wrapper over the
 * generic queue in autosave-queue.ts (debounce, compare against the last
 * value sent, per-step serialized saves, keepalive flush, error + retry).
 * Empty step text is never sent: clearing a step deletes it only through
 * the explicit delete path in RecipeSteps.
 */

import {
  AUTOSAVE_DEBOUNCE_MS,
  createAutosaveQueue,
  type AutosaveSnapshot,
} from "./autosave-queue";

export interface StepSaveRequest {
  recipeId: number;
  stepId: number;
  content: string;
  keepalive: boolean;
}

export type StepSaveSender = (req: StepSaveRequest) => Promise<void>;

export type StepAutosaveSnapshot = AutosaveSnapshot;

export interface StepAutosaveOptions {
  send: StepSaveSender;
  debounceMs?: number;
  setTimer?: (fn: () => void, ms: number) => unknown;
  clearTimer?: (handle: unknown) => void;
  onChange?: (snapshot: StepAutosaveSnapshot) => void;
  onError?: (stepId: number, error: unknown) => void;
}

export const STEP_AUTOSAVE_DEBOUNCE_MS = AUTOSAVE_DEBOUNCE_MS;

const FIELD = "content";

export function createStepAutosave(options: StepAutosaveOptions) {
  const { send, ...rest } = options;
  const queue = createAutosaveQueue({
    ...rest,
    send: ({ recipeId, id, patch, keepalive }) =>
      send({ recipeId, stepId: id, content: patch[FIELD] as string, keepalive }),
    isSendable: (_field, value) => value !== "",
  });

  return {
    /** Register a step with its current server content. No-op if known. */
    track: (stepId: number, recipeId: number, serverContent: string) =>
      queue.track(stepId, recipeId, { [FIELD]: serverContent }),
    /** Record typed text and (re)start the debounce timer. */
    edit: (stepId: number, recipeId: number, value: string) =>
      queue.edit(stepId, recipeId, FIELD, value),
    /** Blur: record the value and save immediately. */
    blur: (stepId: number, recipeId: number, value: string) =>
      queue.blur(stepId, recipeId, FIELD, value),
    retry: queue.retry,
    flush: queue.flush,
    discard: queue.discard,
    isDirty: queue.isDirty,
    snapshot: queue.snapshot,
    dispose: queue.dispose,
  };
}

export type StepAutosave = ReturnType<typeof createStepAutosave>;
