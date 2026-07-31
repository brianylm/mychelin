import { formatScaledQuantity } from "@/components/recipes/ServingScaler";
import { parseHeatFromTip, type HeatLevel } from "@/lib/instruction-heat";
import { matchIngredientsForStep } from "@/lib/step-ingredient-amounts";
import { extractStepAction, truncateStepTitle } from "@/lib/cooking-card-verbs";

// Layout computation for the Cooking Card. Pure and unit-tested — the
// card component just renders what this returns.

export interface CardIngredientInput {
  name: string;
  quantity?: number | null;
  unit?: string | null;
  approximate?: boolean | null;
  quantityText?: string | null;
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
  // Indexes into rows[] this step touches (via matchIngredientsForStep).
  matchedRowIndexes: number[];
}

export interface CookingCardLayout {
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

export function buildCookingCardLayout(input: {
  ingredients: CardIngredientInput[];
  instructions: CardInstructionInput[];
  scale: number;
}): CookingCardLayout {
  const { ingredients, instructions, scale } = input;

  const rows: CardIngredientRow[] = ingredients.map((ingredient) => ({
    name: ingredient.name,
    amount: formatCardAmount(ingredient, scale),
  }));

  const rowIndexByName = new Map<string, number>();
  ingredients.forEach((ingredient, index) => {
    if (!rowIndexByName.has(ingredient.name)) {
      rowIndexByName.set(ingredient.name, index);
    }
  });

  const steps: CardStep[] = instructions.map((instruction, index) => {
    const content = instruction.content ?? "";
    const { action, rest } = extractStepAction(content);
    const matched = matchIngredientsForStep(content, ingredients);
    const matchedRowIndexes = matched
      .map((m) => rowIndexByName.get(m.name))
      .filter((i): i is number => i !== undefined);

    return {
      stepNumber: index + 1,
      title: action ?? truncateStepTitle(content),
      text: action ? rest : content,
      heat: parseHeatFromTip(instruction.tip ?? null).heat,
      timerText: explicitTimerText(content),
      matchedRowIndexes,
    };
  });

  return {
    rows,
    steps,
    hasIngredients: rows.length > 0,
    hasInstructions: steps.length > 0,
  };
}
