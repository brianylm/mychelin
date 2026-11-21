/**
 * Which usage events honestly mean a pilot checklist step happened.
 * Shared by /api/pilot/status and the admin analytics funnel.
 *
 * Capture is not event-based: it ticks on a live "active" recipe row,
 * because recipe_created also fires for blank drafts.
 */

export interface ChecklistEvent {
  eventName: string;
  properties: string | null;
}

function parseProperties(value: string | null): Record<string, unknown> {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function positive(value: unknown): boolean {
  return typeof value === "number" && value > 0;
}

/** A weekly goal was set, or an old-flow onboarding recorded a goal. */
export function isGoalEvent(event: ChecklistEvent): boolean {
  if (event.eventName === "weekly_goal_set") return true;
  if (event.eventName === "onboarding_completed") {
    return parseProperties(event.properties).has_goal === true;
  }
  return false;
}

/** A shopping list with something on it (the app-load prefetch of an empty list does not count). */
export function isShoppingEvent(event: ChecklistEvent): boolean {
  if (event.eventName !== "shopping_list_generated") return false;
  const properties = parseProperties(event.properties);
  return positive(properties.item_count) || positive(properties.meal_count);
}

export const GOAL_EVENT_NAMES = ["weekly_goal_set", "onboarding_completed"];
export const SHOPPING_EVENT_NAMES = ["shopping_list_generated"];
