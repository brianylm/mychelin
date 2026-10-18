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

export function requestLeftovers(request: LeftoversRequest): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<LeftoversRequest>(LEFTOVERS_EVENT, { detail: request }));
}
