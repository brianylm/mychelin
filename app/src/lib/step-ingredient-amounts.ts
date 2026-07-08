type IngredientLike = {
  name: string;
  quantity?: number | null;
  unit?: string | null;
  approximate?: boolean | null;
  quantityText?: string | null;
};

export type StepIngredientAmount = {
  name: string;
  amount: string;
};

const STOP_WORDS = new Set([
  "and",
  "the",
  "fresh",
  "chopped",
  "sliced",
  "minced",
  "diced",
  "roughly",
  "thinly",
  "large",
  "small",
  "medium",
  "optional",
  "garnish",
  "piece",
  "pieces",
  "slice",
  "slices",
]);

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function significantTokens(value: string): string[] {
  return normalizeText(value)
    .split(" ")
    .filter((token) => token.length >= 3 && !STOP_WORDS.has(token));
}

function singularize(token: string): string {
  if (token.endsWith("ies") && token.length > 4) return token.slice(0, -3) + "y";
  if (token.endsWith("oes") || token.endsWith("xes") || token.endsWith("ches") || token.endsWith("shes")) {
    return token.slice(0, -2);
  }
  if (token.endsWith("s") && token.length > 3) return token.slice(0, -1);
  return token;
}

function tokenVariants(token: string): string[] {
  const base = singularize(token);
  const variants = new Set([token, base, base + "s"]);
  if (base.endsWith("y")) variants.add(base.slice(0, -1) + "ies");
  if (base.endsWith("o") || base.endsWith("x") || base.endsWith("ch") || base.endsWith("sh")) variants.add(base + "es");
  return Array.from(variants).filter((item) => item.length >= 3);
}

function tokenAppears(stepTokens: Set<string>, token: string): boolean {
  return tokenVariants(token).some((variant) => stepTokens.has(variant));
}

export function formatIngredientAmount(ingredient: IngredientLike): string {
  const quantityText = ingredient.quantityText?.trim();
  if (quantityText) return quantityText;

  const quantity =
    ingredient.quantity === null || ingredient.quantity === undefined
      ? ""
      : String(ingredient.quantity);
  const unit = ingredient.unit?.trim() ?? "";
  const prefix = ingredient.approximate && quantity ? "about " : "";
  const amount = [prefix + quantity, unit].filter(Boolean).join(" ").trim();

  return amount || "agak-agak";
}

export function matchIngredientsForStep(
  stepContent: string,
  ingredients: IngredientLike[],
  limit = 5
): StepIngredientAmount[] {
  const step = normalizeText(stepContent);
  if (!step) return [];

  const paddedStep = " " + step + " ";
  const stepTokens = new Set(step.split(" ").filter(Boolean));
  const matches: StepIngredientAmount[] = [];

  for (const ingredient of ingredients) {
    const name = ingredient.name?.trim();
    if (!name) continue;

    const normalizedName = normalizeText(name);
    const phraseMatches = normalizedName && paddedStep.includes(" " + normalizedName + " ");
    const tokenMatches =
      !phraseMatches &&
      significantTokens(name).some((token) => tokenAppears(stepTokens, token));

    if (phraseMatches || tokenMatches) {
      matches.push({
        name,
        amount: formatIngredientAmount(ingredient),
      });
    }

    if (matches.length >= limit) break;
  }

  return matches;
}
