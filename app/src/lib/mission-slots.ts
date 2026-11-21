// Dinner slots offered by the first-cook mission's "Plan it" step.
// Dates are the browser's local calendar days, matching NextMealCard and
// MealPlanView (the app has no shared date helper).

export interface MissionSlot {
  date: string;
  label: string;
  taken: boolean;
}

interface SlotPlan {
  date: string;
  mealType: string;
}

function toLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Tonight and tomorrow's dinner. A slot is taken when a plan or a block
// already occupies dinner that day.
export function buildMissionSlots(
  plans: SlotPlan[],
  blocks: SlotPlan[],
  now: Date = new Date()
): MissionSlot[] {
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const occupied = new Set(
    [...plans, ...blocks]
      .filter((entry) => entry.mealType === "dinner")
      .map((entry) => entry.date)
  );
  return [
    { date: toLocalDateKey(now), label: "Tonight's dinner" },
    { date: toLocalDateKey(tomorrow), label: "Tomorrow's dinner" },
  ].map((slot) => ({ ...slot, taken: occupied.has(slot.date) }));
}

export function firstFreeSlotDate(slots: MissionSlot[]): string | null {
  return slots.find((slot) => !slot.taken)?.date ?? null;
}
