const DEFAULT_TIMER_SECONDS = 5 * 60;

function numberFrom(value: string): number {
  return Number(value.replace(/,/g, ""));
}

function averageRange(first: number, second?: number): number {
  return typeof second === "number" && Number.isFinite(second)
    ? Math.round((first + second) / 2)
    : first;
}

function sideMultiplier(text: string): number {
  return /\b(each side|per side|both sides|on each side|flip|turn once)\b/i.test(text) ? 2 : 1;
}

export function detectStepTimerSeconds(text: string): number {
  const normalized = text.toLowerCase().replace(/–|—/g, "-");

  const multiplied = normalized.match(/\b(\d+(?:\.\d+)?)\s*(?:x|×)\s*(\d+(?:\.\d+)?)\s*(seconds?|secs?|sec|minutes?|mins?|min|hours?|hrs?|hr)\b/i);
  if (multiplied) {
    const multiplier = numberFrom(multiplied[1]);
    const amount = numberFrom(multiplied[2]);
    const unit = multiplied[3].toLowerCase();
    const seconds = unit.startsWith("hour") || unit.startsWith("hr")
      ? amount * 3600
      : unit.startsWith("sec")
        ? amount
        : amount * 60;
    return Math.max(30, Math.round(multiplier * seconds));
  }

  const explicit = normalized.match(/\b(\d+(?:\.\d+)?)(?:\s*-\s*(\d+(?:\.\d+)?))?\s*(seconds?|secs?|sec|minutes?|mins?|min|hours?|hrs?|hr)\b/i);
  if (explicit) {
    const amount = averageRange(numberFrom(explicit[1]), explicit[2] ? numberFrom(explicit[2]) : undefined);
    const unit = explicit[3].toLowerCase();
    const multiplier = sideMultiplier(normalized);
    if (unit.startsWith("hour") || unit.startsWith("hr")) return Math.max(60, Math.round(amount * 3600 * multiplier));
    if (unit.startsWith("sec")) return Math.max(30, Math.round(amount * multiplier));
    return Math.max(30, Math.round(amount * 60 * multiplier));
  }

  if (/\b(pan[-\s]?fry lightly|lightly pan[-\s]?fry|fry lightly|brown lightly)\b/i.test(normalized)) {
    return 4 * 60;
  }
  if (/\b(sear|brown)\b/i.test(normalized) && sideMultiplier(normalized) > 1) return 4 * 60;
  if (/\b(sear|brown)\b/i.test(normalized)) return 2 * 60;
  if (/\b(stir[-\s]?fry|saute|sauté)\b/i.test(normalized)) return 3 * 60;
  if (/\b(toast|bloom spices|fry aromatics|cook aromatics)\b/i.test(normalized)) return 2 * 60;
  if (/\b(simmer|braise)\b/i.test(normalized)) return 15 * 60;
  if (/\b(boil|steam)\b/i.test(normalized)) return 10 * 60;
  if (/\b(rest|marinate|marinade|soak)\b/i.test(normalized)) return 30 * 60;

  return DEFAULT_TIMER_SECONDS;
}
