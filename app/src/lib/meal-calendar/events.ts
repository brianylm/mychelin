import type {
  CalendarEventDraft,
  CalendarMealSource,
  GoogleCalendarEvent,
} from "./types";
import { getMealCookingDuration } from "@/lib/meal-cooking-duration";
import type { FreshMealDish, PreparedMealDish } from "@/lib/meal-pilot/types";

export class MissingMealTimingError extends Error {
  constructor(readonly mealGroupId: number) {
    super("Every fresh dish needs prep and cook timing before calendar sync");
    this.name = "MissingMealTimingError";
  }
}

function plural(value: number, singular: string, pluralValue = `${singular}s`): string {
  return `${value} ${value === 1 ? singular : pluralValue}`;
}

function activityProperties(
  source: CalendarMealSource,
  kind: "cooking" | "defrost"
): Record<string, string> {
  return {
    mychelinManaged: "true",
    mychelinMealGroupId: String(source.mealGroup.id),
    mychelinMealRevision: String(source.mealGroup.revision),
    mychelinActivityKind: kind,
  };
}

function formatLocalParts(date: Date, timezone: string): Record<string, string> {
  return Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value])
  );
}

export function localDateTimeToUtc(input: {
  date: string;
  time: string;
  timezone: string;
}): string {
  const [year, month, day] = input.date.split("-").map(Number);
  const [hour, minute] = input.time.split(":").map(Number);
  if (![year, month, day, hour, minute].every(Number.isFinite)) {
    throw new Error("Invalid local calendar date or time");
  }
  const desiredUtc = Date.UTC(year, month - 1, day, hour, minute, 0);
  let candidate = new Date(desiredUtc);
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = formatLocalParts(candidate, input.timezone);
    const representedUtc = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute),
      Number(parts.second)
    );
    candidate = new Date(candidate.getTime() + desiredUtc - representedUtc);
  }
  const verified = formatLocalParts(candidate, input.timezone);
  if (
    verified.year !== String(year).padStart(4, "0") ||
    verified.month !== String(month).padStart(2, "0") ||
    verified.day !== String(day).padStart(2, "0") ||
    verified.hour !== String(hour).padStart(2, "0") ||
    verified.minute !== String(minute).padStart(2, "0")
  ) {
    throw new Error("Local calendar time is invalid in this timezone");
  }
  return candidate.toISOString();
}

function priorLocalDate(serveAt: string, timezone: string): string {
  const parts = formatLocalParts(new Date(serveAt), timezone);
  const noonUtc = new Date(
    Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), 12)
  );
  noonUtc.setUTCDate(noonUtc.getUTCDate() - 1);
  return noonUtc.toISOString().slice(0, 10);
}

export function buildCalendarActivities(
  source: CalendarMealSource,
  options: {
    appBaseUrl: string;
    defrostTime?: string;
    defrostAtOverride?: string | null;
  }
): CalendarEventDraft[] {
  if (source.mealGroup.status !== "planned") return [];
  const fresh = source.dishes.filter(
    (dish): dish is FreshMealDish => dish.source === "fresh"
  );
  const fridge = source.dishes.filter(
    (dish): dish is PreparedMealDish => dish.source === "fridge"
  );
  const frozen = source.dishes.filter(
    (dish): dish is PreparedMealDish => dish.source === "frozen"
  );
  const drafts: CalendarEventDraft[] = [];

  if (fresh.length) {
    const timing = getMealCookingDuration(
      fresh.map((dish) => ({
        source: dish.source,
        prepTime: dish.prepTime,
        cookTime: dish.cookTime,
      })),
      source.mealGroup.durationOverrideMinutes
    );
    if (timing.missingTiming || timing.durationMinutes == null) {
      throw new MissingMealTimingError(source.mealGroup.id);
    }
    const durationMinutes = timing.durationMinutes;
    const endAt = new Date(source.mealGroup.serveAt);
    const startAt = new Date(endAt.getTime() - durationMinutes * 60_000);
    const lines = [
      `Serving ${source.mealGroup.dinerCount}.`,
      "",
      "Cook fresh:",
      ...fresh.map((dish) => `• ${dish.title} — ${dish.targetPortions} portions`),
    ];
    const prepared = [...fridge, ...frozen];
    if (prepared.length) {
      lines.push("", "Reheat / serve:");
      for (const dish of prepared) {
        const notes =
          dish.reheatNotes ||
          "Reheat using this dish’s saved recipe or storage instructions, then serve.";
        lines.push(
          `• ${dish.title} (${dish.source}, ${dish.plannedPortions} portions) — ${notes}`
        );
      }
    }
    lines.push(
      "",
      `Open grouped cook session: ${options.appBaseUrl.replace(/\/$/, "")}/app?view=planner&mealGroupId=${source.mealGroup.id}&cookTogether=1`
    );
    drafts.push({
      kind: "cooking",
      mealGroupId: source.mealGroup.id,
      mealRevision: source.mealGroup.revision,
      summary: `Prep & cook ${source.mealGroup.mealType} — ${plural(source.dishes.length, "dish", "dishes")}`,
      description: lines.join("\n"),
      startAt: startAt.toISOString(),
      endAt: endAt.toISOString(),
      timezone: source.mealGroup.timezone,
      extendedProperties: activityProperties(source, "cooking"),
    });
  }

  if (frozen.length) {
    const startAt = options.defrostAtOverride
      ? new Date(options.defrostAtOverride)
      : new Date(
          localDateTimeToUtc({
            date: priorLocalDate(source.mealGroup.serveAt, source.mealGroup.timezone),
            time: options.defrostTime || "18:00",
            timezone: source.mealGroup.timezone,
          })
        );
    const endAt = new Date(startAt.getTime() + 15 * 60_000);
    drafts.push({
      kind: "defrost",
      mealGroupId: source.mealGroup.id,
      mealRevision: source.mealGroup.revision,
      summary: `Defrost for ${source.mealGroup.mealType} — ${plural(frozen.length, "dish", "dishes")}`,
      description: [
        `For ${source.mealGroup.mealType} on ${source.mealGroup.date}:`,
        ...frozen.map((dish) => `• ${dish.title} — ${dish.plannedPortions} portions`),
        "",
        "Reminder to thaw ahead using each dish’s saved instructions. Adjust this reminder if needed.",
        "",
        `Review meal: ${options.appBaseUrl.replace(/\/$/, "")}/app?view=planner&mealGroupId=${source.mealGroup.id}`,
      ].join("\n"),
      startAt: startAt.toISOString(),
      endAt: endAt.toISOString(),
      timezone: source.mealGroup.timezone,
      extendedProperties: activityProperties(source, "defrost"),
    });
  }

  return drafts;
}

export function toGoogleEvent(
  draft: CalendarEventDraft,
  eventId?: string
): GoogleCalendarEvent {
  return {
    ...(eventId ? { id: eventId } : {}),
    summary: draft.summary,
    description: draft.description,
    start: { dateTime: draft.startAt, timeZone: draft.timezone },
    end: { dateTime: draft.endAt, timeZone: draft.timezone },
    extendedProperties: { private: draft.extendedProperties },
  };
}

export async function deterministicGoogleEventId(input: {
  connectionId: number;
  mealGroupId: number;
  kind: "cooking" | "defrost";
}): Promise<string> {
  const data = new TextEncoder().encode(
    `mychelin:${input.connectionId}:${input.mealGroupId}:${input.kind}:v1`
  );
  const buffer = new ArrayBuffer(data.byteLength);
  new Uint8Array(buffer).set(data);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", buffer));
  const hex = Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `c0${hex.slice(0, 40)}`;
}
