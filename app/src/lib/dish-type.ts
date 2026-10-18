// What kind of dish this is, for skimming a meal's balance (meat, veg,
// egg…). Worked out from the title and ingredient names by fixed rules; a
// recipe can override it (recipes.dish_types). Mixed dishes carry several
// types. No AI here: rendering never calls a model.

export const DISH_TYPES = [
  "meat",
  "seafood",
  "egg",
  "tofu",
  "vegetable",
  "carb",
  "soup",
] as const;
export type DishType = (typeof DISH_TYPES)[number];

export const DISH_TYPE_LABELS: Record<DishType, string> = {
  meat: "Meat",
  seafood: "Seafood",
  egg: "Egg",
  tofu: "Tofu",
  vegetable: "Veg",
  carb: "Rice & noodles",
  soup: "Soup",
};

// Seasonings and stocks that name a protein or carb without making the dish
// one ("fish sauce" is not a fish dish). Removed before matching.
const NOT_THE_DISH = [
  /\bfish sauce\b/g,
  /\boyster sauce\b/g,
  /\b(chicken|pork|beef|fish|anchovy|ikan bilis|prawn|shrimp|seafood) (stock|powder|bouillon|broth|cube|cubes|granules|essence|paste)\b/g,
  /\bdried shrimps?\b/g,
  /\bshrimp paste\b/g,
  /\bbelacan\b/g,
  /\brice (wine|vinegar|flour|paper)\b/g,
  /\bshaoxing\b/g,
  /\begg (noodles?|mee|wash)\b/g,
];

const KEYWORDS: Record<Exclude<DishType, "soup">, RegExp> = {
  meat: /\b(chicken|pork|beef|mutton|lamb|duck|goose|char siu|char siew|lap cheong|chinese sausage|sausages?|bacon|ham|luncheon meat|spam|minced meat|mince|ribs?|liver|kidney|meatballs?|pork belly|satay)\b/,
  seafood:
    /\b(fish|fish ?balls?|prawns?|shrimps?|squid|sotong|crabs?|clams?|lala|mussels?|oysters?|scallops?|ikan bilis|anchov(y|ies)|salmon|cod|tuna|mackerel|threadfin|sea ?bass|pomfret|octopus|cuttlefish|lobster)\b/,
  egg: /\b(eggs?|century egg|salted egg|egg yolks?|egg whites?)\b/,
  tofu: /\b(tofu|tau ?kwa|tau ?pok|tau ?foo|bean ?curd|tempeh|yong tau foo)\b/,
  vegetable:
    /\b(cabbage|kai ?lan|kailan|chye sim|choy sum|cai xin|bok choy|pak choi|xiao bai cai|nai bai|spinach|kangkong|broccoli|cauliflower|carrots?|long beans?|french beans?|green beans?|bean ?sprouts?|tau ?geh|eggplants?|brinjals?|aubergines?|okra|lady'?s? fingers?|tomato(es)?|cucumbers?|mushrooms?|shiitake|enoki|corn|peas|pumpkin|radish|daikon|lotus root|bitter gourd|bitter melon|gourds?|lettuce|zucchini|courgette|capsicum|bell peppers?|celery|asparagus|sweet potato leaves|potato leaves|watercress|kale|leeks?|choy|greens?|vegetables?|veg)\b/,
  carb: /\b(rice|noodles?|mee|mee ?pok|mee ?sua|bee ?hoon|vermicelli|kway ?teow|kuey ?teow|hor fun|ramen|udon|soba|pasta|spaghetti|macaroni|bread|buns?|porridge|congee|potato(es)?|yam)\b/,
};

const SOUP_TITLE = /\b(soup|tong|broth|bak kut teh|sup|stew)\b/;

function clean(text: string): string {
  let out = ` ${text.toLowerCase()} `;
  for (const pattern of NOT_THE_DISH) out = out.replace(pattern, " ");
  return out;
}

export function classifyDish(input: { title: string; ingredients?: readonly string[] }): DishType[] {
  const title = clean(input.title);
  const text = `${title} ${clean((input.ingredients ?? []).join(" , "))}`;
  const found: DishType[] = [];
  for (const type of DISH_TYPES) {
    if (type === "soup") {
      if (SOUP_TITLE.test(title)) found.push("soup");
    } else if (KEYWORDS[type].test(text)) {
      found.push(type);
    }
  }
  return found;
}

export function parseDishTypes(value: unknown): DishType[] | null {
  let list = value;
  if (typeof value === "string") {
    try {
      list = JSON.parse(value);
    } catch {
      return null;
    }
  }
  if (!Array.isArray(list)) return null;
  const valid = list.filter((t): t is DishType => (DISH_TYPES as readonly string[]).includes(t));
  return [...new Set(valid)];
}

// The recipe's override wins when set (even an empty list); otherwise the
// rules decide.
export function effectiveDishTypes(input: {
  title: string;
  ingredients?: readonly string[];
  override?: unknown;
}): DishType[] {
  const override = input.override == null ? null : parseDishTypes(input.override);
  return override ?? classifyDish(input);
}
