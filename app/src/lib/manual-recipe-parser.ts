import { encodeHeatInTip, type HeatLevel } from "@/lib/instruction-heat";

export interface ManualParsedIngredient {
  name: string;
  quantity?: number;
  unit?: string;
  approximate?: boolean;
  quantityText?: string;
  notes?: string;
  source: string;
}

export interface ManualParsedInstruction {
  content: string;
  tip?: string;
  heat: HeatLevel;
  timerText?: string;
  source: string;
}

export interface ManualRecipeParseResult {
  ingredients: ManualParsedIngredient[];
  instructions: ManualParsedInstruction[];
  unclassified: string[];
}

type ParseMode = "auto" | "ingredients" | "steps" | "notes";

const UNIT_ALIASES = new Map([
  ["g", "g"],
  ["gram", "g"],
  ["grams", "g"],
  ["kg", "kg"],
  ["kilogram", "kg"],
  ["kilograms", "kg"],
  ["ml", "ml"],
  ["l", "L"],
  ["litre", "L"],
  ["litres", "L"],
  ["liter", "L"],
  ["liters", "L"],
  ["tsp", "tsp"],
  ["teaspoon", "tsp"],
  ["teaspoons", "tsp"],
  ["tbsp", "tbsp"],
  ["tablespoon", "tbsp"],
  ["tablespoons", "tbsp"],
  ["cup", "cup"],
  ["cups", "cup"],
  ["pc", "pc"],
  ["pcs", "pcs"],
  ["piece", "pcs"],
  ["pieces", "pcs"],
  ["slice", "slice"],
  ["slices", "slice"],
  ["clove", "clove"],
  ["cloves", "clove"],
  ["sprig", "sprig"],
  ["sprigs", "sprig"],
  ["pinch", "pinch"],
  ["handful", "handful"],
  ["bunch", "bunch"],
  ["bunches", "bunch"],
  ["can", "can"],
  ["cans", "can"],
  ["packet", "packet"],
  ["packets", "packet"],
  ["block", "block"],
  ["blocks", "block"],
  ["stalk", "stalk"],
  ["stalks", "stalk"],
  ["head", "head"],
  ["heads", "head"],
]);

const STEP_VERBS = /\b(add|bake|beat|blend|boil|braise|bring|caramelise|caramelize|chop|combine|cook|cover|dice|drain|flip|fold|fry|grill|heat|knead|lower|marinate|mix|pan[- ]?fry|pour|preheat|reduce|remove|rest|rinse|roast|saute|sautee|season|serve|simmer|slice|steam|stir|stir[- ]?fry|taste|toss|turn|whisk)\b/i;
const TIME_RE = /\b\d+(?:\.\d+)?\s*(?:-|to)?\s*\d*\s*(?:seconds?|secs?|sec|minutes?|mins?|min|hours?|hrs?|hr)\b/i;

function stripLinePrefix(line: string): string {
  return line
    .trimStart()
    .replace(/^(?:[-*•‣◦▪▫‒–—])\s*/, "")
    .replace(/^(?:\(?\d{1,3}\)?[.)])\s*/, "")
    .replace(/^\d{1,3}\s*[-:]\s+/, "")
    .replace(/^[A-Za-z][.)]\s+/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function titleCase(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

function parseNumberToken(token: string): number | null {
  const clean = token.replace(/,/g, "").trim();
  if (/^\d+(?:\.\d+)?$/.test(clean)) return Number(clean);
  const fraction = clean.match(/^(\d+)\/(\d+)$/);
  if (fraction) {
    const denominator = Number(fraction[2]);
    if (denominator !== 0) return Number(fraction[1]) / denominator;
  }
  return null;
}

function normalizeUnit(token: string): string | undefined {
  return UNIT_ALIASES.get(token.toLowerCase().replace(/[.,]$/, ""));
}

function parseQuantityUnitToken(token: string): { quantity: number; unit?: string } | null {
  const compact = token.match(/^(\d+(?:\.\d+)?|\d+\/\d+)([a-zA-Z]+)$/);
  if (compact) {
    const quantity = parseNumberToken(compact[1]);
    const unit = normalizeUnit(compact[2]);
    if (quantity !== null && unit) return { quantity, unit };
  }
  const quantity = parseNumberToken(token);
  return quantity !== null ? { quantity } : null;
}

export function parseManualIngredientLine(rawLine: string): ManualParsedIngredient | null {
  let line = stripLinePrefix(rawLine);
  if (!line) return null;
  if (STEP_VERBS.test(line)) return null;

  let notes: string | undefined;
  const noteMatch = line.match(/\s+\(([^)]+)\)\s*$/);
  if (noteMatch) {
    notes = noteMatch[1].trim();
    line = line.slice(0, noteMatch.index).trim();
  }

  line = line.replace(/^(\d+\/\d+|\d+(?:\.\d+)?)([a-zA-Z]+)\b/, "$1 $2");
  const parts = line.split(" ").filter(Boolean);
  if (parts.length === 0) return null;

  const firstQuantity = parseNumberToken(parts[0]);
  if (firstQuantity !== null) {
    let quantity = firstQuantity;
    let index = 1;
    const secondQuantity = parts[index] ? parseNumberToken(parts[index]) : null;
    if (secondQuantity !== null && parts[index].includes("/")) {
      quantity += secondQuantity;
      index += 1;
    }

    let unit = parts[index] ? normalizeUnit(parts[index]) : undefined;
    if (unit) index += 1;

    if (!unit) {
      const trailingUnit = parts.at(-1) ? normalizeUnit(parts.at(-1)!) : undefined;
      if (trailingUnit && parts.length > index + 1) {
        unit = trailingUnit;
        const name = parts.slice(index, -1).join(" ").replace(/,$/, "").trim();
        if (name) return { name: titleCase(name), quantity, unit, notes, source: rawLine };
      }
    }

    const name = parts.slice(index).join(" ").replace(/,$/, "").trim();
    if (name) return { name: titleCase(name), quantity, unit, notes, source: rawLine };
  }

  const lastPart = parts.at(-1);
  const secondLastPart = parts.at(-2);
  const trailingUnit = lastPart ? normalizeUnit(lastPart) : undefined;
  const trailingQuantity = secondLastPart ? parseNumberToken(secondLastPart) : null;
  if (trailingUnit && trailingQuantity !== null && parts.length > 2) {
    const name = parts.slice(0, -2).join(" ").replace(/,$/, "").trim();
    if (name) return { name: titleCase(name), quantity: trailingQuantity, unit: trailingUnit, notes, source: rawLine };
  }

  const trailingAmount = lastPart ? parseQuantityUnitToken(lastPart) : null;
  if (trailingAmount && parts.length > 1) {
    const name = parts.slice(0, -1).join(" ").replace(/,$/, "").trim();
    if (name) {
      return {
        name: titleCase(name),
        quantity: trailingAmount.quantity,
        unit: trailingAmount.unit,
        notes,
        source: rawLine,
      };
    }
  }

  const approx = line.match(/^(a handful|handful|a pinch|pinch|some|a few|few|to taste)\s+(.+)$/i);
  if (approx) {
    return {
      name: titleCase(approx[2].trim().replace(/^of\s+/i, "")),
      approximate: true,
      quantityText: approx[1].trim(),
      notes,
      source: rawLine,
    };
  }

  return null;
}

function detectHeat(line: string): HeatLevel {
  const lower = line.toLowerCase();
  if (/\b(low|gentle|barely bubbling|small fire|low flame)\b/.test(lower)) return "low";
  if (/\b(high|smoking hot|very hot|wok hei|big fire|high flame)\b/.test(lower)) return "high";
  if (/\b(medium|moderate)\b/.test(lower)) return "medium";
  if (/\b(simmer|braise|stew)\b/.test(lower)) return "low";
  if (/\b(stir[- ]?fry|wok)\b/.test(lower)) return "high";
  if (/\b(fry|pan[- ]?fry|saute|sautee|sweat)\b/.test(lower)) return "medium";
  return null;
}

function detectTimerText(line: string): string | undefined {
  const multiplied = line.match(/\b\d+(?:\.\d+)?\s*(?:x|by)\s*\d+(?:\.\d+)?\s*(?:seconds?|secs?|sec|minutes?|mins?|min|hours?|hrs?|hr)\b/i);
  if (multiplied) return multiplied[0];
  const explicit = line.match(/\b\d+(?:\.\d+)?(?:\s*-\s*\d+(?:\.\d+)?)?\s*(?:seconds?|secs?|sec|minutes?|mins?|min|hours?|hrs?|hr)(?:\s+(?:each side|per side|on each side))?\b/i);
  return explicit?.[0];
}

function parseInstructionLine(rawLine: string): ManualParsedInstruction | null {
  const line = stripLinePrefix(rawLine);
  if (!line) return null;
  const heat = detectHeat(line);
  const timerText = detectTimerText(line);
  const tip = encodeHeatInTip(heat, "") ?? undefined;
  return {
    content: titleCase(line.replace(/\.$/, "")) + ".",
    tip,
    heat,
    timerText,
    source: rawLine,
  };
}

function splitIngredientCandidates(line: string): string[] {
  if (!line.includes(",")) return [line];
  return line
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function headingMode(line: string): ParseMode | null {
  const clean = line.replace(/[:：]$/, "").trim().toLowerCase();
  if (["ingredient", "ingredients", "what goes in"].includes(clean)) return "ingredients";
  if (["step", "steps", "method", "instructions", "direction", "directions"].includes(clean)) return "steps";
  if (["note", "notes", "story"].includes(clean)) return "notes";
  return null;
}

function isLikelySectionHeading(line: string): boolean {
  const clean = line.trim();
  if (!clean || clean.length > 64) return false;
  if (STEP_VERBS.test(clean) || TIME_RE.test(clean)) return false;
  if (/[.!?]$/.test(clean)) return false;
  if (/[:：]$/.test(clean)) return true;
  if (/^(for|to make|marinade|sauce|filling|garnish|base|paste|broth|stock|seasoning)\b/i.test(clean)) return true;
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length > 5) return false;
  if (words.length === 1 && normalizeUnit(words[0])) return false;
  if (/\d/.test(clean) && parseManualIngredientLine(clean)) return false;
  return /^[A-Z0-9]/.test(clean);
}

export function parseManualRecipeScratchpad(text: string): ManualRecipeParseResult {
  const ingredients: ManualParsedIngredient[] = [];
  const instructions: ManualParsedInstruction[] = [];
  const unclassified: string[] = [];
  let mode: ParseMode = "auto";

  for (const raw of text.split(/\r?\n/)) {
    const line = stripLinePrefix(raw);
    if (!line) continue;

    const nextMode = headingMode(line);
    if (nextMode) {
      mode = nextMode;
      continue;
    }
    if (isLikelySectionHeading(line)) {
      continue;
    }
    if (mode === "notes") {
      unclassified.push(line);
      continue;
    }

    if (mode === "ingredients") {
      for (const candidate of splitIngredientCandidates(line)) {
        const ingredient = parseManualIngredientLine(candidate);
        if (ingredient) ingredients.push(ingredient);
        else unclassified.push(candidate);
      }
      continue;
    }

    if (mode === "steps") {
      const instruction = parseInstructionLine(line);
      if (instruction) instructions.push(instruction);
      continue;
    }

    const candidateIngredients = splitIngredientCandidates(line)
      .map(parseManualIngredientLine)
      .filter((item): item is ManualParsedIngredient => Boolean(item));
    if (candidateIngredients.length > 0) {
      ingredients.push(...candidateIngredients);
      continue;
    }

    if (STEP_VERBS.test(line) || TIME_RE.test(line)) {
      const instruction = parseInstructionLine(line);
      if (instruction) instructions.push(instruction);
      continue;
    }

    unclassified.push(line);
  }

  return { ingredients, instructions, unclassified };
}

export function formatManualIngredientPreview(ingredient: ManualParsedIngredient): string {
  const unit = ingredient.unit === "clove" && ingredient.quantity !== 1 ? "cloves" : ingredient.unit;
  if (ingredient.approximate) {
    return [ingredient.quantityText, ingredient.name].filter(Boolean).join(" ");
  }
  return [ingredient.quantity, unit, ingredient.name]
    .filter((part) => part !== undefined && part !== "")
    .join(" ");
}
