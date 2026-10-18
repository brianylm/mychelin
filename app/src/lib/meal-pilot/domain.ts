import { parseYieldServings } from "@/lib/household-portions";
import type { MealType, PreparedStorage } from "./types";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MEAL_TYPES = new Set<MealType>(["breakfast", "lunch", "dinner", "snack"]);
const STORAGES = new Set<PreparedStorage>(["fridge", "freezer"]);

export function isMealType(value: unknown): value is MealType {
  return typeof value === "string" && MEAL_TYPES.has(value as MealType);
}

export function isPreparedStorage(value: unknown): value is PreparedStorage {
  return typeof value === "string" && STORAGES.has(value as PreparedStorage);
}

export function isDateKey(value: unknown): value is string {
  if (typeof value !== "string" || !DATE_RE.test(value)) return false;
  const parsed = new Date(value + "T00:00:00Z");
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function isIsoInstant(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "" && !Number.isNaN(Date.parse(value));
}

export function isIanaTimezone(value: unknown): value is string {
  if (typeof value !== "string" || !value.trim()) return false;
  try {
    new Intl.DateTimeFormat("en", { timeZone: value }).format(0);
    return true;
  } catch {
    return false;
  }
}

export function positiveNumber(value: unknown): number | null {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

export function positiveInteger(value: unknown): number | null {
  const number = positiveNumber(value);
  return number != null && Number.isInteger(number) ? number : null;
}

export function optionalPositiveInteger(value: unknown): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  return positiveInteger(value) ?? undefined;
}

export function localDateKey(instant: string, timezone: string): string | null {
  if (!isIsoInstant(instant) || !isIanaTimezone(timezone)) return null;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(instant));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return values.year && values.month && values.day
    ? `${values.year}-${values.month}-${values.day}`
    : null;
}

export function servingsMultiplierForTarget(
  yieldText: string | null | undefined,
  targetPortions: number
): number | null {
  const baseYield = parseYieldServings(yieldText);
  if (baseYield == null || !Number.isFinite(targetPortions) || targetPortions <= 0) return null;
  return targetPortions / baseYield;
}

export interface PreparedLotBalance {
  physicalPortions: number;
  reservedPortions: number;
  unallocatedPortions: number;
}

export function preparedLotBalance(
  physicalPortions: number,
  activeReservations: readonly number[]
): PreparedLotBalance {
  const physical = Number.isFinite(physicalPortions) ? Math.max(0, physicalPortions) : 0;
  const reserved = activeReservations.reduce(
    (total, value) => total + (Number.isFinite(value) ? Math.max(0, value) : 0),
    0
  );
  return {
    physicalPortions: physical,
    reservedPortions: reserved,
    unallocatedPortions: Math.max(0, physical - reserved),
  };
}

export function parseJsonObject(value: string | null): Record<string, unknown> | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed != null && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}
