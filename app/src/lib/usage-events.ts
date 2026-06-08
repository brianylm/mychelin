import { db } from "@/db";
import { usageEvents } from "@/db/schema";
import { ensureUsageEventsTable } from "@/db/ensure-schema";

export type UsageEventName =
  | "user_signed_up"
  | "onboarding_completed"
  | "recipe_created"
  | "recipe_capture_completed"
  | "ai_draft_completed"
  | "photo_uploaded"
  | "meal_planned"
  | "shopping_list_generated"
  | "cook_attempt_created"
  | "attempt_promoted_to_version"
  | "transcription_completed"
  | "conversation_assist_completed";

type Primitive = string | number | boolean | null;
export type UsageEventProperties = Record<string, Primitive | Primitive[]>;

interface TrackUsageEventInput {
  userId?: number | null;
  eventName: UsageEventName;
  source?: string | null;
  recipeId?: number | null;
  bookId?: number | null;
  mealPlanId?: number | null;
  properties?: UsageEventProperties;
  path?: string | null;
}

const MAX_PROPERTY_KEYS = 24;
const MAX_STRING_LENGTH = 120;

function cleanValue(value: Primitive | Primitive[]): Primitive | Primitive[] | undefined {
  if (Array.isArray(value)) {
    return value.slice(0, 12).map((item) => cleanValue(item) as Primitive);
  }
  if (typeof value === "string") return value.slice(0, MAX_STRING_LENGTH);
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "boolean" || value === null) return value;
  return undefined;
}

function sanitizeProperties(properties?: UsageEventProperties): string | null {
  if (!properties) return null;
  const entries = Object.entries(properties).slice(0, MAX_PROPERTY_KEYS);
  const cleaned: UsageEventProperties = {};
  for (const [key, value] of entries) {
    const safeKey = key.replace(/[^a-zA-Z0-9_:-]/g, "_").slice(0, 64);
    const safeValue = cleanValue(value);
    if (safeKey && safeValue !== undefined) cleaned[safeKey] = safeValue;
  }
  return Object.keys(cleaned).length > 0 ? JSON.stringify(cleaned) : null;
}

export async function trackUsageEvent(input: TrackUsageEventInput): Promise<void> {
  try {
    await ensureUsageEventsTable();
    await db.insert(usageEvents).values({
      userId: input.userId ?? null,
      eventName: input.eventName,
      source: input.source ?? null,
      recipeId: input.recipeId ?? null,
      bookId: input.bookId ?? null,
      mealPlanId: input.mealPlanId ?? null,
      properties: sanitizeProperties(input.properties),
      path: input.path ?? null,
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    console.warn("usage event skipped:", error);
  }
}

export function requestPath(request: Request): string {
  try {
    return new URL(request.url).pathname;
  } catch {
    return "";
  }
}
