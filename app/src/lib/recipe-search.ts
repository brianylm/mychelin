// Typo-tolerant local recipe search. Runs on recipes already in the client
// store, so results appear instantly while typing.

export interface SearchableRecipe {
  id: number;
  title: string;
  cuisine?: string | null;
  description?: string | null;
  ingredients?: ReadonlyArray<string | { name?: string | null }> | null;
}

export interface RecipeSearchHit<T extends SearchableRecipe> {
  recipe: T;
  score: number;
  matchedIngredient: string | null;
}

export function normalizeSearchText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

export function tokenize(text: string): string[] {
  const normalized = normalizeSearchText(text);
  return normalized ? normalized.split(" ") : [];
}

// Optimal-string-alignment distance (Damerau-Levenshtein with adjacent
// transpositions), bailing out early once it exceeds `max`.
export function editDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const rows: number[][] = [];
  for (let i = 0; i <= a.length; i++) {
    rows.push(new Array<number>(b.length + 1).fill(0));
    rows[i][0] = i;
  }
  for (let j = 0; j <= b.length; j++) rows[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    let rowMin = Infinity;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let value = Math.min(
        rows[i - 1][j] + 1,
        rows[i][j - 1] + 1,
        rows[i - 1][j - 1] + cost
      );
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        value = Math.min(value, rows[i - 2][j - 2] + 1);
      }
      rows[i][j] = value;
      if (value < rowMin) rowMin = value;
    }
    if (rowMin > max) return max + 1;
  }
  return rows[a.length][b.length];
}

const EXACT = 3;
const PREFIX = 2;
const FUZZY = 1;

// Best match quality of one query token against a list of words (0 = none).
function matchToken(token: string, words: string[]): number {
  const maxDistance = token.length >= 8 ? 2 : token.length >= 4 ? 1 : 0;
  let best = 0;
  for (const word of words) {
    if (word === token) return EXACT;
    if (word.startsWith(token)) {
      best = Math.max(best, PREFIX);
    } else if (
      best < FUZZY &&
      maxDistance > 0 &&
      editDistance(token, word, maxDistance) <= maxDistance
    ) {
      best = FUZZY;
    } else if (
      best < FUZZY &&
      maxDistance > 0 &&
      word.length > token.length &&
      editDistance(token, word.slice(0, token.length), maxDistance) <= maxDistance
    ) {
      // Typo inside a longer word's prefix ("chiken" vs "chickens").
      best = FUZZY;
    }
  }
  return best;
}

const FIELD_WEIGHT = { title: 10, ingredient: 6, other: 3 } as const;

export function scoreRecipe<T extends SearchableRecipe>(
  recipe: T,
  queryTokens: string[]
): RecipeSearchHit<T> | null {
  if (queryTokens.length === 0) return null;
  const titleWords = tokenize(recipe.title);
  const otherWords = [
    ...tokenize(recipe.cuisine ?? ""),
    ...tokenize(recipe.description ?? ""),
  ];
  const ingredientNames = (recipe.ingredients ?? [])
    .map((item) => (typeof item === "string" ? item : item?.name ?? ""))
    .filter(Boolean);
  const ingredientEntries = ingredientNames.map((name) => ({
    name,
    words: tokenize(name),
  }));
  const ingredientWords = ingredientEntries.flatMap((entry) => entry.words);

  let score = 0;
  let matchedIngredient: string | null = null;
  for (const token of queryTokens) {
    const title = matchToken(token, titleWords);
    const ingredient = matchToken(token, ingredientWords);
    const other = matchToken(token, otherWords);
    if (!title && !ingredient && !other) return null;
    score += Math.max(
      title ? FIELD_WEIGHT.title * title : 0,
      ingredient ? FIELD_WEIGHT.ingredient * ingredient : 0,
      other ? FIELD_WEIGHT.other * other : 0
    );
    if (!title && ingredient && !matchedIngredient) {
      matchedIngredient =
        ingredientEntries.find((entry) => matchToken(token, entry.words) === ingredient)
          ?.name ?? null;
    }
  }
  return { recipe, score, matchedIngredient };
}

export function searchRecipes<T extends SearchableRecipe>(
  recipes: ReadonlyArray<T>,
  query: string
): RecipeSearchHit<T>[] {
  const tokens = tokenize(query);
  if (tokens.length === 0) return [];
  const hits: RecipeSearchHit<T>[] = [];
  for (const recipe of recipes) {
    const hit = scoreRecipe(recipe, tokens);
    if (hit) hits.push(hit);
  }
  return hits.sort((a, b) => b.score - a.score);
}
