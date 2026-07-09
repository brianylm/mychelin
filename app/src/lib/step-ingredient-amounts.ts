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

const GENERIC_SINGLE_TOKEN_MATCHES = new Set([
  "oil",
  "sauce",
  "stock",
  "water",
]);

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

export function matchIngredientsForStep(
  stepContent: string,
  ingredients: IngredientLike[],
  limit = 5
): StepIngredientAmount[] {
  const step = normalizeText(stepContent);
  if (!step) return [];

  const stepTokenList = step.split(" ").filter(Boolean);
  const stepTokens = new Set(stepTokenList);
  const candidates: IngredientCandidate[] = [];

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
    }
  });

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
