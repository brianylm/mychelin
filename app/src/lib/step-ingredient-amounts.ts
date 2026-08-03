type IngredientLike = {
  name: string;
  quantity?: number | null;
  unit?: string | null;
  approximate?: boolean | null;
  quantityText?: string | null;
  notes?: string | null;
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

const GENERIC_SINGLE_TOKEN_MATCHES = new Set([
  "oil",
  "sauce",
  "stock",
  "water",
]);

// ─── Whole-dish detection ──────────────────────────────────────────────
// Steps that handle the whole dish — "add everything", "pressure cook",
// "mix well", "stir-fried ingredients" — implicitly touch every
// ingredient already in the pot, even when the text names none of them.
// Conservative on purpose: only strong whole-mixture phrases fire, so a
// step that names specific ingredients doesn't accidentally cover all.
const ENCOMPASS_ALL_PATTERNS: RegExp[] = [
  /\beverything\b/,
  /\b(?:all|everything)\s+(?:of\s+)?(?:it|them)\b/,
  /\bthe\s+whole\s+(?:thing|pot|dish|batch|lot|contents|mixture)\b/,
  /\bpressure\s*[- ]?cook(?:er|ed|ing)?\b/,
  /\bstir\s*[- ]?fried\b/,
  /\b(?:cook|simmer|boil|stew|braise|saute|sauté|fry)\s+(?:everything|them\s+together|all\s+together|it\s+all)\b/,
  /\badd\s+(?:everything|it\s+all|them\s+all|all\s+of\s+it)\b/,
  /\bmix(?:ed|ing)?\s+well\b/,
  /\bcombine(?:d|ing)?\s+(?:everything|the\s+whole|all\s+of\s+it|it\s+all)\b/,
];

// Whether this step handles the whole dish (see ENCOMPASS_ALL_PATTERNS).
export function stepEncompassesAll(text: string): boolean {
  const t = text.toLowerCase();
  return ENCOMPASS_ALL_PATTERNS.some((pattern) => pattern.test(t));
}

// ─── Semantic ingredient categories ────────────────────────────────────
// Lets a step say "add the aromatics / vegetables / meat / sauces" and have
// that resolve to the actual ingredients, even though none are named.
// An ingredient belongs to a category when its name contains any of the
// category's keywords. A step triggers a category via CATEGORY_TRIGGERS.
const INGREDIENT_CATEGORY_KEYWORDS: Array<[string, string[]]> = [
  ["aromatics", ["garlic", "onion", "shallot", "ginger", "scallion", "lemongrass", "galangal", "chili", "chilli"]],
  ["vegetables", ["cai", "chard", "cabbage", "greens", "spinach", "lettuce", "kale", "eggplant", "carrot", "broccoli", "potato", "tomato", "cucumber", "beansprout", "mushroom", "corn", "vegetable"]],
  ["meat", ["pork", "beef", "chicken", "duck", "lamb", "fish", "shrimp", "prawn", "sausage", "bacon", "tofu"]],
  ["sauces", ["soy sauce", "oyster sauce", "fish sauce", "hoisin", "vinegar", "sesame oil", "chili oil"]],
  ["liquids", ["water", "stock", "broth", "milk", "coconut milk", "juice"]],
  ["starch", ["rice", "noodle", "noodles", "pasta", "vermicelli", "flour"]],
  ["herbs", ["coriander", "cilantro", "parsley", "basil", "mint", "chives", "spring onion"]],
];

// Triggers are deliberately collective (plural or group words) — "add the
// sauces" resolves to all sauces, but the ambiguous singular "add the
// sauce" is left to name-based matching, which stays silent rather than
// guessing a specific one.
const CATEGORY_TRIGGERS: Array<[string, string[]]> = [
  ["aromatics", ["aromatics"]],
  ["vegetables", ["vegetables", "veggies", "greens", "leafy", "veg"]],
  ["meat", ["meat", "meats", "protein"]],
  ["sauces", ["sauces", "seasonings", "condiments"]],
  ["liquids", ["liquids", "broth", "stock"]],
  ["starch", ["starch", "carbs"]],
  ["herbs", ["herbs", "garnish", "garnishes"]],
];

function categoryOfIngredient(name: string): string | null {
  const tokens = significantTokens(name);
  const tokenSet = new Set(tokens.map(singularize));
  for (const [category, keywords] of INGREDIENT_CATEGORY_KEYWORDS) {
    const hasPhrase = keywords.some((keyword) => {
      const kwTokens = normalizedTokens(keyword);
      // Phrase keywords ("soy sauce") match the phrase; single-token
      // keywords match any containing token.
      if (kwTokens.length > 1) {
        return normalizedTokens(name).join(" ").includes(keyword);
      }
      return tokenSet.has(singularize(kwTokens[0]));
    });
    if (hasPhrase) return category;
  }
  return null;
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizedTokens(value: string): string[] {
  return normalizeText(value).split(" ").filter(Boolean);
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

type TokenRange = {
  start: number;
  end: number;
};

type IngredientCandidate = {
  ingredient: IngredientLike;
  name: string;
  ingredientIndex: number;
  significantTokens: string[];
  phraseRanges: TokenRange[];
  fuzzyMatched: boolean;
};

function tokensEquivalent(ingredientToken: string, stepToken: string): boolean {
  return tokenVariants(ingredientToken).includes(singularize(stepToken));
}

function findPhraseRanges(stepTokens: string[], phraseTokens: string[]): TokenRange[] {
  if (phraseTokens.length === 0 || phraseTokens.length > stepTokens.length) return [];

  const ranges: TokenRange[] = [];
  for (let start = 0; start <= stepTokens.length - phraseTokens.length; start++) {
    const matches = phraseTokens.every((token, offset) =>
      tokensEquivalent(token, stepTokens[start + offset])
    );
    if (matches) ranges.push({ start, end: start + phraseTokens.length });
  }
  return ranges;
}

function rangeContains(outer: TokenRange, inner: TokenRange): boolean {
  return outer.start <= inner.start && outer.end >= inner.end;
}

function allRangesCoveredByLongerPhrase(
  candidate: IngredientCandidate,
  candidates: IngredientCandidate[]
): boolean {
  if (candidate.phraseRanges.length === 0) return false;

  const longerPhraseCandidates = candidates.filter(
    (other) =>
      other !== candidate &&
      other.phraseRanges.length > 0 &&
      normalizedTokens(other.name).length > normalizedTokens(candidate.name).length
  );

  if (longerPhraseCandidates.length === 0) return false;

  return candidate.phraseRanges.every((range) =>
    longerPhraseCandidates.some((other) =>
      other.phraseRanges.some((otherRange) => rangeContains(otherRange, range))
    )
  );
}

function hasShorterExactTokenMatch(
  candidate: IngredientCandidate,
  exactCandidates: IngredientCandidate[]
): boolean {
  if (!candidate.fuzzyMatched || candidate.phraseRanges.length > 0) return false;
  const candidateTokenSet = new Set(candidate.significantTokens.map(singularize));

  return exactCandidates.some((exact) => {
    if (exact.ingredientIndex === candidate.ingredientIndex) return false;
    if (exact.significantTokens.length > candidate.significantTokens.length) return false;
    return exact.significantTokens.some((token) => candidateTokenSet.has(singularize(token)));
  });
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

// ─────────────────────────────────────────────────────────────────────────
// PRINCIPLE — a step claims an ingredient only on positive evidence, ranked
// by strength; the strongest evidence wins. Two cross-cutting rules:
//
//   • Anti-guessing: when evidence could name any of several ingredients
//     and doesn't single one out ("add the sauce" with several sauces), the
//     step claims NONE of them. A missing claim is better than a wrong one.
//   • The pot accumulates: once an ingredient is claimed it stays in; a
//     whole-dish step ("add everything") takes every ingredient introduced
//     so far — the card layout's carry-forward models that.
//
// Evidence tiers, strongest first. Each tier only looks at ingredients the
// stronger tiers have not already claimed:
//   T1  NAMED       the step says the ingredient (its phrase or a token)
//   T2  ANNOTATED   the step references what the ingredient's own notes
//                   describe ("stems separated from leaves")
//   T3  CLASSED     the step names the ingredient's class ("the greens")
//   T4  IMPLIED     the action implies its input even when unnamed
//                   (frying needs the recipe's oil; "the oil" is the one
//                   cooking oil)
// ─────────────────────────────────────────────────────────────────────────

// Claim an ingredient for a step (tiers T2–T4) unless a stronger tier
// already claimed it. Weak evidence never overrides a stronger claim.
function claimWeakCandidate(
  candidates: IngredientCandidate[],
  matchedIndexes: Set<number>,
  ingredientIndex: number,
  ingredient: IngredientLike
): void {
  if (matchedIndexes.has(ingredientIndex)) return;
  candidates.push({ ingredient, name: ingredient.name, ingredientIndex, significantTokens: [], phraseRanges: [], fuzzyMatched: true });
  matchedIndexes.add(ingredientIndex);
}

// T2 — ANNOTATED: the step references a detail the ingredient itself
// declares in its notes.
function annotatedEvidence(
  stepTokens: Set<string>,
  ingredients: IngredientLike[],
  matchedIndexes: Set<number>,
  candidates: IngredientCandidate[]
): void {
  ingredients.forEach((ingredient, ingredientIndex) => {
    if (matchedIndexes.has(ingredientIndex)) return;
    const noteTokens = significantTokens(ingredient.notes ?? "");
    if (noteTokens.length > 0 && noteTokens.some((token) => tokenAppears(stepTokens, token))) {
      claimWeakCandidate(candidates, matchedIndexes, ingredientIndex, ingredient);
    }
  });
}

// T3 — CLASSED: the step names an ingredient's class. Triggers are plural /
// collective and matched as exact tokens, so the ambiguous singular
// "the sauce" never guesses among several sauces.
function classedEvidence(
  stepTokens: Set<string>,
  ingredients: IngredientLike[],
  matchedIndexes: Set<number>,
  candidates: IngredientCandidate[]
): void {
  for (const [category, triggers] of CATEGORY_TRIGGERS) {
    if (!triggers.some((trigger) => stepTokens.has(trigger))) continue;
    ingredients.forEach((ingredient, ingredientIndex) => {
      if (matchedIndexes.has(ingredientIndex)) return;
      if (categoryOfIngredient(ingredient.name ?? "") === category) {
        claimWeakCandidate(candidates, matchedIndexes, ingredientIndex, ingredient);
      }
    });
  }
}

// T4 — IMPLIED: the action implies its input even when the step never names
// it. Two forms, both subject to the anti-guessing rule:
//   • an unambiguous generic token — "heat oil" is the single cooking oil,
//     but "sauce" with several sauces stays unclaimed;
//   • frying needs the recipe's one oil.
function impliedEvidence(
  stepContent: string,
  stepTokens: Set<string>,
  ingredients: IngredientLike[],
  matchedIndexes: Set<number>,
  candidates: IngredientCandidate[]
): void {
  const genericCount = new Map<string, number>();
  const genericIngredientIndex = new Map<string, number>();
  ingredients.forEach((ingredient, ingredientIndex) => {
    if (matchedIndexes.has(ingredientIndex)) return;
    significantTokens(ingredient.name ?? "").forEach((token) => {
      const base = singularize(token);
      if (GENERIC_SINGLE_TOKEN_MATCHES.has(base)) {
        genericCount.set(base, (genericCount.get(base) ?? 0) + 1);
        genericIngredientIndex.set(base, ingredientIndex);
      }
    });
  });
  for (const [token, count] of genericCount) {
    if (count !== 1) continue;
    if (!tokenAppears(stepTokens, token)) continue;
    const ingredientIndex = genericIngredientIndex.get(token)!;
    claimWeakCandidate(candidates, matchedIndexes, ingredientIndex, ingredients[ingredientIndex]);
  }

  if (/\b(?:fry|fries|fried|frying|saute|sauté|pan-?fry|deep-?fry|shallow-?fry)\b/i.test(stepContent)) {
    const oilCount = ingredients.filter(
      (ingredient) => significantTokens(ingredient.name ?? "").some((token) => singularize(token) === "oil")
    ).length;
    if (oilCount === 1) {
      const oilIndex = ingredients.findIndex(
        (ingredient, ingredientIndex) =>
          !matchedIndexes.has(ingredientIndex) &&
          significantTokens(ingredient.name ?? "").some((token) => singularize(token) === "oil")
      );
      if (oilIndex >= 0) claimWeakCandidate(candidates, matchedIndexes, oilIndex, ingredients[oilIndex]);
    }
  }
}

export function matchIngredientsForStep(
  stepContent: string,
  ingredients: IngredientLike[],
  limit = 12
): StepIngredientAmount[] {
  const step = normalizeText(stepContent);
  if (!step) return [];

  // A whole-dish step ("add everything", "mix well") implicitly uses every
  // ingredient in the recipe.
  if (stepEncompassesAll(stepContent)) {
    return ingredients
      .map((ingredient) => ({
        name: ingredient.name,
        amount: formatIngredientAmount(ingredient),
      }))
      .slice(0, limit);
  }

  const stepTokenList = step.split(" ").filter(Boolean);
  const stepTokens = new Set(stepTokenList);
  const candidates: IngredientCandidate[] = [];
  const matchedIndexes = new Set<number>();

  ingredients.forEach((ingredient, ingredientIndex) => {
    const name = ingredient.name?.trim();
    if (!name) return;

    const phraseTokens = normalizedTokens(name);
    const phraseRanges = findPhraseRanges(stepTokenList, phraseTokens);
    const phraseMatches = phraseRanges.length > 0;
    const tokens = significantTokens(name);
    const fuzzyTokens = tokens.length > 1
      ? tokens.filter((token) => !GENERIC_SINGLE_TOKEN_MATCHES.has(singularize(token)))
      : tokens;
    const fuzzyMatched =
      !phraseMatches &&
      fuzzyTokens.length > 0 &&
      fuzzyTokens.some((token) => tokenAppears(stepTokens, token));

    if (phraseMatches || fuzzyMatched) {
      candidates.push({
        ingredient,
        name,
        ingredientIndex,
        significantTokens: tokens,
        phraseRanges,
        fuzzyMatched,
      });
      matchedIndexes.add(ingredientIndex);
    }
  });

  // T2–T4 — weaker evidence only claims ingredients the named tier didn't.
  annotatedEvidence(stepTokens, ingredients, matchedIndexes, candidates);
  classedEvidence(stepTokens, ingredients, matchedIndexes, candidates);
  impliedEvidence(stepContent, stepTokens, ingredients, matchedIndexes, candidates);

  const exactCandidates = candidates.filter(
    (candidate) =>
      candidate.phraseRanges.length > 0 &&
      !allRangesCoveredByLongerPhrase(candidate, candidates)
  );
  const fuzzyCandidates = candidates.filter(
    (candidate) =>
      candidate.phraseRanges.length === 0 &&
      !hasShorterExactTokenMatch(candidate, exactCandidates)
  );

  return [...exactCandidates, ...fuzzyCandidates]
    .sort((left, right) => left.ingredientIndex - right.ingredientIndex)
    .slice(0, limit)
    .map((candidate) => ({
      name: candidate.name,
      amount: formatIngredientAmount(candidate.ingredient),
    }));
}
