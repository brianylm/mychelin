// Deterministic ingredient de-duplication, shared by the local scratchpad
// parser and the AI capture routes (prompts are not guarantees).
//
// Two entries merge only when the normalized name matches AND the unit is
// compatible (same normalized unit, or both without one). Different units
// are kept apart: no conversions are guessed. Approximate entries ("to
// taste", "a handful") merge only with identical text. First-seen order
// is kept.

export interface DedupableIngredient {
  name?: string | null;
  quantity?: number | null;
  unit?: string | null;
  notes?: string | null;
  approximate?: boolean | null;
  quantityText?: string | null;
}

const UNIT_SYNONYMS: Record<string, string> = {
  gram: "g",
  gm: "g",
  kilogram: "kg",
  milliliter: "ml",
  millilitre: "ml",
  litre: "l",
  liter: "l",
  teaspoon: "tsp",
  tablespoon: "tbsp",
  tbs: "tbsp",
  pc: "piece",
  pcs: "piece",
  ounce: "oz",
  pound: "lb",
  lbs: "lb",
};

function normalizeUnitKey(unit: string | null | undefined): string {
  let key = (unit ?? "").toLowerCase().replace(/[.\s]+/g, " ").trim();
  if (key.length > 3 && key.endsWith("s") && !key.endsWith("ss")) key = key.slice(0, -1);
  if (key.endsWith("pcs")) key = "piece";
  return UNIT_SYNONYMS[key] ?? key;
}

function singularWord(word: string): string {
  if (word.length <= 3) return word;
  if (/(ss|us|is)$/.test(word)) return word;
  if (word.endsWith("ies")) return word.slice(0, -3) + "y";
  if (word.endsWith("leaves")) return word.slice(0, -6) + "leaf";
  if (/(oes|ches|shes|xes)$/.test(word)) return word.slice(0, -2);
  if (word.endsWith("s")) return word.slice(0, -1);
  return word;
}

export function normalizeIngredientName(name: string | null | undefined): string {
  const words = (name ?? "")
    .toLowerCase()
    .replace(/\s*\([^)]*\)/g, " ")
    .replace(/[^\p{L}\p{N}\s'-]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return "";
  words[words.length - 1] = singularWord(words[words.length - 1]);
  return words.join(" ");
}

function hasQuantity(item: DedupableIngredient): boolean {
  return typeof item.quantity === "number" && Number.isFinite(item.quantity);
}

function isApproximate(item: DedupableIngredient): boolean {
  return Boolean(item.approximate) || Boolean(item.quantityText && item.quantityText.trim());
}

// Identity of an entry for merging; null when it must never merge.
function mergeKey(item: DedupableIngredient): string | null {
  const name = normalizeIngredientName(item.name);
  if (!name) return null;
  if (isApproximate(item)) {
    return `${name}|approx|${(item.quantityText ?? "").toLowerCase().replace(/\s+/g, " ").trim()}`;
  }
  if (!hasQuantity(item)) {
    // A bare "Salt" only equals another bare "Salt" with no unit.
    return normalizeUnitKey(item.unit) ? null : `${name}|bare`;
  }
  return `${name}|qty|${normalizeUnitKey(item.unit)}`;
}

function splitNotes(notes: string): string[] {
  return notes.split(/\s*[;,]\s*/).map((part) => part.trim()).filter(Boolean);
}

function combineNotes(a: string | null | undefined, b: string | null | undefined): string | undefined {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of [...splitNotes(a ?? ""), ...splitNotes(b ?? "")]) {
    const key = part.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(part);
  }
  return out.length ? out.join(", ") : undefined;
}

export function dedupeIngredients<T extends DedupableIngredient>(items: T[]): T[] {
  const result: T[] = [];
  const indexByKey = new Map<string, number>();
  for (const item of items) {
    const key = mergeKey(item);
    const at = key === null ? undefined : indexByKey.get(key);
    if (key === null || at === undefined) {
      if (key !== null) indexByKey.set(key, result.length);
      result.push(item);
      continue;
    }
    const first = result[at];
    const merged: T = { ...first };
    if (hasQuantity(first) && hasQuantity(item)) {
      merged.quantity = Math.round(((first.quantity as number) + (item.quantity as number)) * 1000) / 1000;
    }
    const notes = combineNotes(first.notes, item.notes);
    if (notes !== undefined) merged.notes = notes;
    result[at] = merged;
  }
  return result;
}

// AI results arrive as loosely-typed JSON; touch only a real ingredients array.
export function dedupeRecipeIngredients<R>(recipe: R): R {
  if (!recipe || typeof recipe !== "object") return recipe;
  const record = recipe as { ingredients?: unknown };
  if (!Array.isArray(record.ingredients)) return recipe;
  const clean = record.ingredients.filter((item) => item && typeof item === "object") as DedupableIngredient[];
  if (clean.length !== record.ingredients.length) return recipe;
  return { ...recipe, ingredients: dedupeIngredients(clean) };
}
