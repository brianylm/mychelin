// After a cook is saved, offer to put leftover portions into Ready meals.
// Callers fire a request; LeftoversPrompt (mounted once in the app shell)
// decides whether to ask and shows the dialog.
export interface LeftoversRequest {
  recipeId: number;
  title: string;
  // The plan slot this cook was for, if any. Cooks that belong to a planned
  // multi-dish meal are not prompted: that meal's confirmation records its
  // leftovers, and asking here too would count them twice.
  mealPlanId: number | null;
}

export const LEFTOVERS_EVENT = "mychelin:leftovers";
export const LEFTOVERS_IDLE = "mychelin:leftovers-idle";

// Requests that have been fired but not yet answered or dropped. Other
// dialogs wait for this to reach zero so only one opens at a time.
let pending = 0;
const IDLE_FALLBACK_MS = 30_000;

// Runs the callback now if no leftovers request is pending, otherwise once
// the prompt goes idle. A 30 s timeout stops a stuck prompt from blocking
// the callback forever.
export function afterLeftovers(callback: () => void): void {
  if (typeof window === "undefined" || pending === 0) {
    callback();
    return;
  }
  let done = false;
  let timeout = 0;
  const finish = () => {
    if (done) return;
    done = true;
    window.removeEventListener(LEFTOVERS_IDLE, finish);
    window.clearTimeout(timeout);
    callback();
  };
  timeout = window.setTimeout(finish, IDLE_FALLBACK_MS);
  window.addEventListener(LEFTOVERS_IDLE, finish);
}

// One request answered or dropped. Dispatches LEFTOVERS_IDLE at zero.
export function settleLeftovers(): void {
  pending = Math.max(0, pending - 1);
  if (pending === 0 && typeof window !== "undefined") {
    window.dispatchEvent(new Event(LEFTOVERS_IDLE));
  }
}

export function requestLeftovers(request: LeftoversRequest): void {
  if (typeof window === "undefined") return;
  pending += 1;
  window.dispatchEvent(new CustomEvent<LeftoversRequest>(LEFTOVERS_EVENT, { detail: request }));
}
