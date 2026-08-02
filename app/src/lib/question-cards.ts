// Question card lifecycle for live conversation assist.
// The backend regenerates suggestions every poll, so answered cards
// vanish on their own; this lib handles the client side — dismissal,
// the ≤3 visible cap, and Show-more overflow.

export function normalizeCardText(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

export interface VisibleCards {
  visible: string[];
  overflowCount: number;
}

export function selectVisibleCards(input: {
  suggestions: string[];
  dismissed: string[];
  cap?: number;
}): VisibleCards {
  const { suggestions, dismissed } = input;
  const cap = input.cap ?? 3;
  const dismissedSet = new Set(dismissed.map(normalizeCardText));
  const active = suggestions.filter((s) => !dismissedSet.has(normalizeCardText(s)));
  return {
    visible: active.slice(0, cap),
    overflowCount: Math.max(0, active.length - cap),
  };
}
