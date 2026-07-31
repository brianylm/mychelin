// Step action-title extraction for the Cooking Card. Matches a leading
// cooking verb from a lexicon; the lexicon is a plain exported array so
// dialect/family terms can be added without touching the matcher.

export const COOKING_VERBS: string[] = [
  // English
  "fry", "sear", "sauté", "saute", "simmer", "boil", "braise", "steam",
  "add", "mix", "stir", "whisk", "chop", "dice", "slice", "mince",
  "marinate", "bake", "roast", "grill", "blend", "pound", "soak",
  "drain", "serve", "pour", "heat", "toast", "knead", "fold", "reduce",
  "season", "caramelise", "caramelize", "blanch", "poach", "stew",
  "deep-fry", "stir-fry", "pan-fry", "plate", "garnish", "rest",
  // Dialect / SEA starters (extend freely)
  "tumis", "goreng", "rebus", "kukus", "panggang", "agak-agak", "agak",
  "zhup", "masak",
];

// Longest-first so "stir-fry" wins over "stir".
const VERBS_BY_LENGTH = [...COOKING_VERBS].sort((a, b) => b.length - a.length);

export interface StepAction {
  // The matched verb, title-cased, or null when no lexicon verb leads.
  action: string | null;
  // The step text with the leading verb removed (still useful as the
  // card body), or the full text when action is null.
  rest: string;
}

function titleCase(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

export function extractStepAction(text: string): StepAction {
  const trimmed = text.trim();
  if (!trimmed) return { action: null, rest: "" };
  const lower = trimmed.toLowerCase();

  for (const verb of VERBS_BY_LENGTH) {
    if (!lower.startsWith(verb)) continue;
    const boundary = lower.charAt(verb.length);
    // Verb must be followed by a word boundary (space, punctuation, end).
    if (boundary && /[a-z]/.test(boundary)) continue;
    const rest = trimmed.slice(verb.length).replace(/^[\s,:-]+/, "");
    return { action: titleCase(verb), rest: rest || trimmed };
  }

  return { action: null, rest: trimmed };
}

// Fallback title when no verb matches: first line, truncated.
export function truncateStepTitle(text: string, max = 40): string {
  const firstLine = text.trim().split("\n")[0].trim();
  if (firstLine.length <= max) return firstLine;
  return firstLine.slice(0, max - 1).trimEnd() + "…";
}
