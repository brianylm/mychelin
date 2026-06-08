export type OnboardingGoal = "learn" | "regular" | "family" | "plan" | "waste";
export type CookingFrequency = "daily" | "most_weekdays" | "weekly" | "occasional";

const SG_OFFSET_MS = 8 * 60 * 60 * 1000;

export function parseOnboardingGoals(value: string | null | undefined): OnboardingGoal[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is OnboardingGoal =>
        ["learn", "regular", "family", "plan", "waste"].includes(String(item))
      );
    }
  } catch {
    // Older rows may store a single plain goal string.
  }
  return ["learn", "regular", "family", "plan", "waste"].includes(value)
    ? [value as OnboardingGoal]
    : [];
}

export function weeklyGoalFromOnboarding(input: {
  cookingFrequency?: string | null;
  cookingGoal?: string | null;
}): number {
  const goals = parseOnboardingGoals(input.cookingGoal);
  let target = 2;

  switch (input.cookingFrequency) {
    case "daily":
      target = 5;
      break;
    case "most_weekdays":
      target = 4;
      break;
    case "weekly":
      target = 1;
      break;
    case "occasional":
      target = 1;
      break;
  }

  if (goals.includes("regular")) target = Math.max(target, 3);
  if (goals.includes("plan")) target = Math.max(target, 2);
  if (goals.includes("learn") || goals.includes("family")) target = Math.max(target, 1);

  return Math.max(1, Math.min(6, target));
}

export function dateKeyFromSgDate(date: Date): string {
  const sg = new Date(date.getTime() + SG_OFFSET_MS);
  const year = sg.getUTCFullYear();
  const month = String(sg.getUTCMonth() + 1).padStart(2, "0");
  const day = String(sg.getUTCDate()).padStart(2, "0");
  return year + "-" + month + "-" + day;
}

export function getSingaporeWeekWindow(now = new Date()) {
  const sg = new Date(now.getTime() + SG_OFFSET_MS);
  const sgYear = sg.getUTCFullYear();
  const sgMonth = sg.getUTCMonth();
  const sgDate = sg.getUTCDate();
  const mondayOffset = (sg.getUTCDay() + 6) % 7;
  const startSgUtc = Date.UTC(sgYear, sgMonth, sgDate - mondayOffset, 0, 0, 0, 0);
  const endSgUtc = Date.UTC(sgYear, sgMonth, sgDate - mondayOffset + 7, 0, 0, 0, 0) - 1;
  const startUtc = new Date(startSgUtc - SG_OFFSET_MS);
  const endUtc = new Date(endSgUtc - SG_OFFSET_MS);

  return {
    startDate: dateKeyFromSgDate(startUtc),
    endDate: dateKeyFromSgDate(endUtc),
    startIso: startUtc.toISOString(),
    endIso: endUtc.toISOString(),
  };
}

export function clampWeeklyGoal(value: unknown, fallback = 2): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.min(6, Math.round(parsed)));
}
