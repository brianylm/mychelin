// Display-side portion scaling for the household shared plan. Pure and
// unit-tested (household-portions.test.ts). The stored recipe quantities
// are never rewritten — this only computes what the planner slot shows.
//
// Semantic (work packet, decision 3): the recipe's own yield is the base
// for the FULL household; blocking scales it down by the share of
// members still eating. Recipe yields 4, household of 4, one member out
// → slot shows "serves 3 of 4". A fully blocked slot shows "nobody
// eating" rather than a serves-0 weirdness.

// Parses a recipe yield string ("4 servings", "serves 2", "Makes 6
// pieces") into a serving count. Returns null when no leading/embedded
// number is found — callers then show nothing rather than guess.
export function parseYieldServings(yieldText: string | null | undefined): number | null {
  if (!yieldText) return null;
  const match = yieldText.match(/(\d+(?:\.\d+)?)/);
  if (!match) return null;
  const value = Number(match[1]);
  if (!Number.isFinite(value) || value <= 0) return null;
  return value;
}

export interface ServingScale {
  memberCount: number;
  blockedCount: number;
  eaters: number; // members still eating = memberCount - blockedCount
  baseServings: number; // recipe yield (× plan multiplier) for the full household
  scaledServings: number; // baseServings scaled to the eaters
  anyoneEating: boolean;
}

export function scaleServingsForEaters(input: {
  baseServings: number;
  memberCount: number;
  blockedCount: number;
}): ServingScale {
  const memberCount = Math.max(0, Math.floor(input.memberCount));
  const blockedCount = Math.min(memberCount, Math.max(0, Math.floor(input.blockedCount)));
  const eaters = memberCount - blockedCount;
  const baseServings = input.baseServings;

  // Half-serving granularity reads like a recipe, not a spreadsheet
  // (4 × 3/4 = 3 exactly; 2 × 1/2 = 1; 3 × 1/2 = 1.5).
  const raw = memberCount > 0 ? (baseServings * eaters) / memberCount : 0;
  const scaledServings = Math.round(raw * 2) / 2;

  return {
    memberCount,
    blockedCount,
    eaters,
    baseServings,
    scaledServings,
    anyoneEating: eaters > 0,
  };
}

// "serves 3 of 4" while anyone is still eating; "nobody eating" when
// every member blocked the slot.
export function formatServingLabel(scale: ServingScale): string {
  if (!scale.anyoneEating) return "nobody eating";
  return `serves ${formatServings(scale.scaledServings)} of ${formatServings(scale.baseServings)}`;
}

// Multiplier for quantity-side scaling (shopping list generation and
// cook-time deduction): the share of members still eating. Returns 1
// when there is no household context, 0 when everyone blocked the slot —
// callers skip fully-blocked slots rather than emitting zero-quantity
// rows.
export function blockingScaleFactor(memberCount: number, blockedCount: number): number {
  const members = Math.max(0, Math.floor(memberCount));
  if (members <= 0) return 1;
  const blocked = Math.min(members, Math.max(0, Math.floor(blockedCount)));
  return (members - blocked) / members;
}

function formatServings(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
