import { encodeHeatInTip, type HeatLevel } from "@/lib/instruction-heat";
import { vocabularyTerms } from "@/lib/ingredient-vocabulary";

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
  // True when no ingredient list was written and ingredients (if any)
  // were picked out of the steps — the list is likely incomplete.
  ingredientsFromSteps: boolean;
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

const STEP_VERBS = /\b(add|bake|beat|blanch|blend|boil|braise|bring|caramelise|caramelize|chop|combine|cook|cover|dice|deglaze|drain|drizzle|emulsify|flip|fold|fry|grill|heat|knead|lower|marinate|mix|pan[- ]?fry|poach|pour|preheat|reduce|remove|rest|rinse|roast|saute|sautee|season|sear|serve|simmer|slice|sprinkle|steam|stir|stir[- ]?fry|taste|thicken|toss|turn|whisk)\b/i;
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

function parseQuantityExpression(
  content: string,
): { quantity?: number; unit?: string; quantityText?: string; approximate?: boolean } | null {
  const trimmed = content.trim();
  if (!trimmed) return null;

  const approxMatch = trimmed.match(/^(a handful|handful|a pinch|pinch|some|a few|few|to taste)$/i);
  if (approxMatch) {
    return { quantityText: approxMatch[1], approximate: true };
  }

  const compact = trimmed.match(/^(\d+(?:\.\d+)?|\d+\/\d+)([a-zA-Z]+)$/);
  if (compact) {
    const quantity = parseNumberToken(compact[1]);
    const unit = normalizeUnit(compact[2]);
    if (quantity !== null) return { quantity, unit };
  }

  const parts = trimmed.split(/\s+/).filter(Boolean);
  const quantity = parseNumberToken(parts[0]);
  if (quantity !== null) {
    const unit = parts[1] ? normalizeUnit(parts[1]) : undefined;
    return { quantity, unit };
  }

  return null;
}

export function parseManualIngredientLine(rawLine: string): ManualParsedIngredient | null {
  let line = stripLinePrefix(rawLine);
  if (!line) return null;

  let notes: string | undefined;
  let foundQuantity: number | undefined;
  let foundUnit: string | undefined;
  let foundQuantityText: string | undefined;
  let foundApproximate: boolean | undefined;

  // Pull trailing parentheticals from the end inward. If a paren content
  // parses as a quantity expression, treat it as the amount; otherwise it
  // is a note (e.g. "Garlic (grinded) (1 tablespoon)").
  while (true) {
    const parenMatch = line.match(/\s*\(([^()]*)\)\s*$/);
    if (!parenMatch) break;
    const content = parenMatch[1].trim();
    const before = line.slice(0, parenMatch.index).trim();
    const qty = parseQuantityExpression(content);
    if (qty && foundQuantity === undefined && foundQuantityText === undefined) {
      foundQuantity = qty.quantity;
      foundUnit = qty.unit;
      foundQuantityText = qty.quantityText;
      foundApproximate = qty.approximate;
    } else {
      notes = notes ? `${content}; ${notes}` : content;
    }
    line = before;
  }

  // Reject step-like lines after parens are removed, so "Salt (to taste)"
  // isn't discarded just because the paren contains "taste".
  if (STEP_VERBS.test(line)) return null;

  if (foundQuantity !== undefined || foundQuantityText !== undefined) {
    const name = line.replace(/,$/, "").trim();
    if (name) {
      return {
        name: titleCase(name),
        quantity: foundQuantity,
        unit: foundUnit,
        quantityText: foundQuantityText,
        approximate: foundApproximate,
        notes,
        source: rawLine,
      };
    }
  }

  const strippedLine = line;
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

  const fallbackName = strippedLine.replace(/,$/, "").trim();
  if (fallbackName) {
    return { name: titleCase(fallbackName), notes, source: rawLine };
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
  const items: string[] = [];
  let depth = 0;
  let current = "";
  for (const char of line) {
    if (char === "(") depth += 1;
    if (char === ")") depth -= 1;
    if (char === "," && depth === 0) {
      if (current.trim()) items.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  if (current.trim()) items.push(current.trim());
  return items.length ? items : [line];
}

// A typed or dictated method often arrives as one paragraph. Split it into
// sentences so each becomes a step instead of being read as one ingredient.
function splitProseSentences(line: string): string[] {
  const sentences = line
    .split(/(?<=[.!?])\s+(?=[A-Z])/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
  return sentences.length >= 2 ? sentences : [line];
}

// A name-only ingredient longer than a few words is prose, not an ingredient.
function isConfidentIngredient(ingredient: ManualParsedIngredient): boolean {
  // "Cut the chicken into 4 pieces" reads as name + amount; a name that
  // ends in a preposition is half a sentence, not an ingredient.
  if (/\s(into|in|to|with|for|on|onto|over|until)$/i.test(ingredient.name)) return false;
  if (ingredient.quantity !== undefined || ingredient.quantityText !== undefined) return true;
  return ingredient.name.split(/\s+/).filter(Boolean).length <= 4 && !/[.!?]$/.test(ingredient.name);
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

// ─── Ingredients mentioned inside prose steps ──────────────────────────
// Dictated or typed paragraphs name ingredients inside the method ("fry
// three cloves of chopped garlic"). Only measured mentions — a number and
// a unit followed by a name — are taken, so "35 minutes" or "into 4
// pieces" never become ingredients. Unmeasured items ("some shallots")
// are left for the AI "Sort with AI" pass.
const WORD_NUMBERS = new Map<string, number>([
  ["a", 1], ["an", 1], ["one", 1], ["two", 2], ["three", 3], ["four", 4], ["five", 5],
  ["six", 6], ["seven", 7], ["eight", 8], ["nine", 9], ["ten", 10], ["eleven", 11],
  ["twelve", 12], ["half", 0.5], ["quarter", 0.25],
]);
const MENTION_STOP_WORDS = new Set([
  "and", "or", "in", "into", "until", "with", "then", "for", "to", "on", "onto", "over",
  "at", "from", "about", "so", "till", "while", "before", "after", "each", "per", "if",
  "but", "as", "again", "together", "first", "next",
]);
const PREP_WORDS = new Set([
  "chopped", "minced", "sliced", "diced", "crushed", "washed", "grated", "peeled",
  "smashed", "julienned", "shredded", "pounded", "soaked", "rinsed", "cut", "fresh",
  "dried", "finely", "roughly", "thinly", "cold", "warm", "hot",
]);
const MAX_MENTION_NAME_WORDS = 4;

function mentionNumber(token: string): number | null {
  return parseNumberToken(token) ?? WORD_NUMBERS.get(token.toLowerCase()) ?? null;
}

export function extractIngredientMentions(sentence: string): ManualParsedIngredient[] {
  const tokens = sentence.split(/\s+/).filter(Boolean);
  const found: ManualParsedIngredient[] = [];
  for (let i = 0; i < tokens.length; i += 1) {
    const clean = tokens[i].replace(/^[("]+/, "");
    let quantity: number | null = null;
    let unit: string | undefined;
    let next = i + 1;

    const compact = clean.replace(/[.,;:!?)]+$/, "").match(/^(\d+(?:\.\d+)?|\d+\/\d+)([a-zA-Z]+)$/);
    if (compact && normalizeUnit(compact[2])) {
      quantity = parseNumberToken(compact[1]);
      unit = normalizeUnit(compact[2]);
      if (/[.,;:!?)]$/.test(clean)) continue; // "about 1.5kg," — amount with no name after it
    } else {
      quantity = mentionNumber(clean);
      if (quantity === null || /[.,;:!?)]$/.test(clean)) continue;
      // "half a cup": the article after "half" is part of the amount.
      if (quantity === 0.5 && /^(a|an)$/i.test(tokens[next] ?? "")) next += 1;
      const unitToken = tokens[next] ?? "";
      unit = normalizeUnit(unitToken.replace(/[.,;:!?)]+$/, ""));
      if (!unit || /[.,;:!?)]$/.test(unitToken)) continue;
      next += 1;
    }
    if (quantity === null || !unit) continue;

    if ((tokens[next] ?? "").toLowerCase() === "of") next += 1;
    if (/^(the|your|my)$/i.test(tokens[next] ?? "")) next += 1;

    const notes: string[] = [];
    const nameWords: string[] = [];
    for (let j = next; j < tokens.length && nameWords.length < MAX_MENTION_NAME_WORDS; j += 1) {
      const raw = tokens[j];
      const word = raw.replace(/[.,;:!?)"]+$/, "");
      const lower = word.toLowerCase();
      if (!word || MENTION_STOP_WORDS.has(lower) || /^\d/.test(word)) break;
      if (nameWords.length === 0 && PREP_WORDS.has(lower)) notes.push(lower);
      else nameWords.push(word);
      if (word !== raw) break; // punctuation ends the name
    }
    const name = nameWords.join(" ").trim();
    if (!name || STEP_VERBS.test(name) || TIME_RE.test(`1 ${name}`)) continue;

    found.push({
      name: titleCase(name),
      quantity,
      unit,
      notes: notes.length ? notes.join(", ") : undefined,
      source: sentence,
    });
    i = next - 1;
  }
  return found;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const NUMBER_WORD_RE = /^(\d+(?:\.\d+)?|\d+\/\d+|a|an|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|half|quarter|few|several|some)$/i;

// Known ingredient names mentioned in a sentence, in order. Longest terms
// claim text first ("jasmine rice" before "rice"). A term that is also a
// unit ("cloves", "slices") is skipped when it is used as one: "three
// cloves of garlic" names garlic, not the spice.
export function vocabularyMentions(sentence: string): Array<{ name: string; index: number }> {
  const lower = sentence.toLowerCase();
  const taken: Array<[number, number]> = [];
  const found: Array<{ name: string; index: number }> = [];
  for (const { term, name } of vocabularyTerms()) {
    if (!lower.includes(term)) continue;
    const re = new RegExp("(?<![\\p{L}'])" + escapeRegExp(term) + "(?![\\p{L}])", "gu");
    for (const match of lower.matchAll(re)) {
      const start = match.index ?? 0;
      const end = start + term.length;
      if (taken.some(([s, e]) => start < e && end > s)) continue;
      if (normalizeUnit(term)) {
        const before = lower.slice(0, start).trim().split(/\s+/).at(-1) ?? "";
        const after = lower.slice(end).trim().split(/\s+/)[0] ?? "";
        if (NUMBER_WORD_RE.test(before) || after === "of") continue;
      }
      taken.push([start, end]);
      found.push({ name, index: start });
    }
  }
  return found.sort((a, b) => a.index - b.index);
}

function displayName(name: string): string {
  return name.replace(/\s*\([^)]*\)/g, "").trim();
}

// No ingredient list was written: build one from the steps. Measured
// mentions keep their amounts; every other known ingredient is added
// without an amount. Order follows first mention in the text; repeats of
// the same name merge, keeping the amount.
function ingredientsFromSteps(instructions: ManualParsedInstruction[]): ManualParsedIngredient[] {
  const ordered: Array<{ ingredient: ManualParsedIngredient; order: number }> = [];
  instructions.forEach((instruction, stepIndex) => {
    const base = stepIndex * 100000;
    const lowerSource = instruction.source.toLowerCase();
    const measuredSpans: Array<[number, number]> = [];
    let searchFrom = 0;
    for (const mention of extractIngredientMentions(instruction.source)) {
      const at = lowerSource.indexOf(mention.name.toLowerCase(), searchFrom);
      const start = at < 0 ? 0 : at;
      if (at >= 0) {
        measuredSpans.push([at, at + mention.name.length]);
        searchFrom = at + mention.name.length;
      }
      ordered.push({ ingredient: mention, order: base + start });
    }
    for (const hit of vocabularyMentions(instruction.source)) {
      if (measuredSpans.some(([s, e]) => hit.index >= s && hit.index < e)) continue;
      ordered.push({
        ingredient: { name: displayName(hit.name), source: instruction.source },
        order: base + hit.index + 0.5,
      });
    }
  });
  ordered.sort((a, b) => a.order - b.order);

  const result: ManualParsedIngredient[] = [];
  for (const { ingredient } of ordered) {
    const key = ingredient.name.toLowerCase();
    const existing = result.findIndex((item) => item.name.toLowerCase() === key);
    if (existing < 0) result.push(ingredient);
    else if (result[existing].quantity === undefined && ingredient.quantity !== undefined) {
      result[existing] = ingredient;
    }
  }
  // Drop a bare generic name when a more specific one names the same
  // thing: "Rice" beside "Jasmine rice", "Chicken" beside "Whole chicken".
  return result.filter((item) => {
    if (item.quantity !== undefined) return true;
    const generic = " " + item.name.toLowerCase();
    return !result.some((other) => other !== item && other.name.toLowerCase().endsWith(generic));
  });
}

export interface ScratchpadRecipeInput {
  ingredients?: Array<{ name?: string | null; quantity?: number | null; unit?: string | null; notes?: string | null }>;
  instructions?: Array<{ content?: string | null; stepNumber?: number }>;
}

// Writes a structured (AI) recipe back as scratchpad text with explicit
// Ingredients / Steps headings, so the user can keep editing and this
// parser stays the single source of truth for the preview.
export function recipeToScratchpadText(recipe: ScratchpadRecipeInput): string {
  const ingredientLines = (recipe.ingredients ?? [])
    .map((ingredient) => {
      const name = (ingredient.name ?? "").trim();
      if (!name) return "";
      const notes = (ingredient.notes ?? "").trim();
      const amount = [ingredient.quantity ?? "", (ingredient.unit ?? "").trim()].filter((p) => p !== "").join(" ");
      // "Garlic (3 cloves) (chopped)": the parser reads a trailing amount
      // paren as the quantity and any other paren as a note.
      return [name, notes ? `(${notes})` : "", amount ? `(${amount})` : ""].filter(Boolean).join(" ");
    })
    .filter(Boolean);
  const stepLines = (recipe.instructions ?? [])
    .map((step) => (step.content ?? "").trim().replace(/\s+/g, " "))
    .filter(Boolean);
  const sections: string[] = [];
  if (ingredientLines.length) sections.push(["Ingredients", ...ingredientLines].join("\n"));
  if (stepLines.length) sections.push(["Steps", ...stepLines].join("\n"));
  return sections.join("\n\n");
}

export function parseManualRecipeScratchpad(text: string): ManualRecipeParseResult {
  const ingredients: ManualParsedIngredient[] = [];
  const instructions: ManualParsedInstruction[] = [];
  const unclassified: string[] = [];
  let mode: ParseMode = "auto";

  for (const raw of text.split(/\r?\n/)) {
    const stripped = stripLinePrefix(raw);
    if (!stripped) continue;
    const sentences = mode === "auto" || mode === "steps" ? splitProseSentences(stripped) : [stripped];
    const fromProse = sentences.length > 1;
    for (const line of sentences) {
      const nextMode = headingMode(line);
      if (nextMode) {
        mode = nextMode;
        continue;
      }
      if (mode === "auto" && isLikelySectionHeading(line)) {
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

      const parsedCandidates = splitIngredientCandidates(line).map(parseManualIngredientLine);
      const allConfident = parsedCandidates.every(
        (item): item is ManualParsedIngredient => item !== null && isConfidentIngredient(item),
      );
      if (allConfident) {
        ingredients.push(...parsedCandidates);
        continue;
      }

      if (fromProse || STEP_VERBS.test(line) || TIME_RE.test(line)) {
        const instruction = parseInstructionLine(line);
        if (instruction) instructions.push(instruction);
        continue;
      }

      unclassified.push(line);
    }
  }

  // Nothing listed as an ingredient: take measured mentions from the steps.
  const fromSteps = ingredients.length === 0;
  if (fromSteps) ingredients.push(...ingredientsFromSteps(instructions));

  return { ingredients, instructions, unclassified, ingredientsFromSteps: fromSteps };
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
