import { formatScaledQuantity } from "@/components/recipes/ServingScaler";
import { parseHeatFromTip, type HeatLevel } from "@/lib/instruction-heat";
import { matchIngredientsForStep, stepEncompassesAll } from "@/lib/step-ingredient-amounts";
import { extractStepAction, truncateStepTitle } from "@/lib/cooking-card-verbs";

// Re-exported for callers/tests that relied on it living here.
export { stepEncompassesAll };

// Layout computation for the Cooking Card. Pure and unit-tested — the
// card component just renders what this returns.
//
// The card is a row-spanning block grid: steps across the top,
// ingredients down the rail, and each step column shows one merged block
// spanning the ingredient rows that step references. The ingredient rows
// are REORDERED here into contiguous bands — one band per step (the
// ingredients that step is the first to reference), then any ingredients
// no step references — so each step's block is a single contiguous run.
// The Recipe view keeps the original stored order; only the card groups
// them.

export interface CardIngredientInput {
  name: string;
  quantity?: number | null;
  unit?: string | null;
  approximate?: boolean | null;
  quantityText?: string | null;
  notes?: string | null;
}

export interface CardInstructionInput {
  content: string;
  tip?: string | null;
}

export interface CardIngredientRow {
  name: string;
  amount: string;
}

export interface CardStep {
  stepNumber: number;
  // Verb-extracted action title, or truncated first line as fallback.
  title: string;
  // Step text shown on the card (leading verb stripped when extracted).
  text: string;
  heat: HeatLevel;
  // Explicit duration stated in the step text ("20 min"), or null.
  // Deliberately NOT detectStepTimerSeconds — that helper guesses from
  // keywords and defaults to 5 min; the card shows chips only when the
  // recipe actually says a time.
  timerText: string | null;
  // Indexes into rows[] (the reordered rail) of every ingredient this
  // step references — the filled dots in the matrix.
  matchedRowIndexes: number[];
  // Indexes into rows[] that this step's MERGED block spans. Contiguous
  // by construction: a step's own band (ingredients it first references),
  // or — for whole-pot steps — every ingredient introduced so far.
  blockRowIndexes: number[];
}

export interface CookingCardLayout {
  // Ingredient rows reordered into per-step bands (see header comment).
  rows: CardIngredientRow[];
  steps: CardStep[];
  hasIngredients: boolean;
  hasInstructions: boolean;
}

function displayUnit(unit: string | null | undefined, quantity: number | null | undefined): string | undefined {
  if (!unit) return undefined;
  if (unit === "clove" && quantity !== 1) return "cloves";
  return unit;
}

// Mirrors IngredientList's read-only amount formatting, with ServingScaler
// math — switching between Recipe and Card views must not change amounts.
export function formatCardAmount(ingredient: CardIngredientInput, scale: number): string {
  const quantity = ingredient.quantity && scale !== 1
    ? formatScaledQuantity(ingredient.quantity, scale)
    : ingredient.quantity;
  const hasQuantity = quantity !== null && quantity !== undefined && String(quantity) !== "";
  const unit = ingredient.unit
    ? displayUnit(ingredient.unit, ingredient.quantity ?? undefined)
    : hasQuantity ? "units" : undefined;

  if (ingredient.approximate) {
    const quantityText = ingredient.quantityText?.trim();
    if (quantityText) return quantityText;
    return ["agak-agak", hasQuantity ? quantity : null, unit]
      .filter((part) => part !== null && part !== undefined && part !== "")
      .join(" ");
  }

  if (hasQuantity) {
    return [quantity, unit]
      .filter((part) => part !== null && part !== undefined && part !== "")
      .join(" ");
  }

  return unit ?? "";
}

// First explicit duration stated in the text ("20 min", "1.5 hrs",
// "10-15 min"), or null. Strict on purpose — no inferred times.
export function explicitTimerText(text: string): string | null {
  const match = text.match(
    /\b(\d+(?:\.\d+)?(?:\s*(?:-|–|to)\s*\d+(?:\.\d+)?)?\s*(?:secs?|seconds?|mins?|minutes?|hrs?|hours?))\b/i
  );
  return match ? match[1].replace(/\s+/g, " ") : null;
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

export function buildCookingCardLayout(input: {
  ingredients: CardIngredientInput[];
  instructions: CardInstructionInput[];
  scale: number;
}): CookingCardLayout {
  const { ingredients, instructions, scale } = input;

  // Which ingredients does each step explicitly reference?
  // (matchIngredientsForStep returns names, up to a 5-ingredient cap.)
  const stepExplicitNames: string[][] = instructions.map((instruction) => {
    const content = instruction.content ?? "";
    return matchIngredientsForStep(content, ingredients).map((m) => m.name);
  });

  // Effective references: a step that handles the whole dish also covers
  // every ingredient an earlier step introduced (the pot so far). This is
  // what makes a "pressure cook everything" step's column encompass all
  // of the prepped ingredients. Accumulation is explicit-only so
  // whole-pot steps don't cascade into ever-larger columns.
  const introduced = new Set<string>();
  const stepEffectiveNames: string[][] = instructions.map((instruction, index) => {
    const explicit = stepExplicitNames[index];
    const names = new Set(explicit);
    if (stepEncompassesAll(instruction.content ?? "")) {
      for (const name of introduced) names.add(name);
    }
    for (const name of explicit) introduced.add(name);
    return Array.from(names);
  });

  // Assign each ingredient to the FIRST step that explicitly references
  // it, so its band groups together and the step's dots read as one block.
  const assignedStep: number[] = ingredients.map((ingredient) => {
    const key = normalizeName(ingredient.name ?? "");
    for (let stepIndex = 0; stepIndex < stepExplicitNames.length; stepIndex++) {
      if (stepExplicitNames[stepIndex].some((name) => normalizeName(name) === key)) {
        return stepIndex;
      }
    }
    return -1; // referenced by no step
  });

  // Reorder: band for step 0, band for step 1, …, then unreferenced rows.
  const orderedOriginalIndexes: number[] = [];
  for (let stepIndex = 0; stepIndex < instructions.length; stepIndex++) {
    ingredients.forEach((_, idx) => {
      if (assignedStep[idx] === stepIndex) orderedOriginalIndexes.push(idx);
    });
  }
  ingredients.forEach((_, idx) => {
    if (assignedStep[idx] === -1) orderedOriginalIndexes.push(idx);
  });

  const rows: CardIngredientRow[] = orderedOriginalIndexes.map((idx) => ({
    name: ingredients[idx].name,
    amount: formatCardAmount(ingredients[idx], scale),
  }));

  const rowIndexByName = new Map<string, number>();
  orderedOriginalIndexes.forEach((origIdx, newIdx) => {
    const key = normalizeName(ingredients[origIdx].name ?? "");
    if (!rowIndexByName.has(key)) rowIndexByName.set(key, newIdx);
  });

  // Per step, the rows of the ingredients it is the FIRST to reference —
  // its band. Bands are contiguous by construction (rows are ordered band
  // by band), so a merged block over a band is a clean solid run.
  const bandRows: number[][] = instructions.map((_, stepIndex) =>
    orderedOriginalIndexes
      .map((origIdx, rowIndex) => ({ origIdx, rowIndex }))
      .filter(({ origIdx }) => assignedStep[origIdx] === stepIndex)
      .map(({ rowIndex }) => rowIndex)
  );

  // Per step, the rows its merged block spans. A whole-pot step
  // ("pressure cook", "add everything", "mix well"…) carries forward
  // every ingredient introduced so far — the leading run of rows — plus
  // anything this step itself introduces.
  let introducedRowCount = 0;
  const blockRowIndexes: number[][] = instructions.map((instruction, stepIndex) => {
    introducedRowCount += bandRows[stepIndex].length;
    if (stepEncompassesAll(instruction.content ?? "")) {
      return Array.from({ length: introducedRowCount }, (_, i) => i);
    }
    return bandRows[stepIndex];
  });

  const steps: CardStep[] = instructions.map((instruction, index) => {
    const content = instruction.content ?? "";
    const { action, rest } = extractStepAction(content);

    const matchedRowIndexes = stepEffectiveNames[index]
      .map((name) => rowIndexByName.get(normalizeName(name)))
      .filter((i): i is number => i !== undefined)
      .sort((a, b) => a - b);

    return {
      stepNumber: index + 1,
      title: action ?? truncateStepTitle(content),
      text: action ? rest : content,
      heat: parseHeatFromTip(instruction.tip ?? null).heat,
      timerText: explicitTimerText(content),
      matchedRowIndexes,
      blockRowIndexes: blockRowIndexes[index],
    };
  });

  return {
    rows,
    steps,
    hasIngredients: rows.length > 0,
    hasInstructions: steps.length > 0,
  };
}
