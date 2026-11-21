// Known ingredient names for the scratchpad parser. When a dictated or
// typed recipe has no ingredient list, the steps are matched against this
// vocabulary so unmeasured items ("some shallots", "coarse salt") are
// found too — instantly, offline, no AI.
//
// CATALOG_NAMES mirrors app/drizzle/seed_ingredient_catalog.sql (the
// ingredient_catalog table); ingredient-vocabulary.test.ts fails if the
// seed gains a name that is missing here.

export const CATALOG_NAMES = [
  "Garlic", "Ginger", "Shallot", "Onion", "Spring onion", "Lemongrass", "Galangal",
  "Pandan leaves", "Kaffir lime leaves", "Curry leaves", "Laksa leaves (daun kesum)",
  "Coriander", "Thai basil", "Turmeric (fresh)",
  "Chicken", "Chicken thigh", "Chicken breast", "Pork", "Pork belly", "Minced pork", "Beef",
  "Fish", "Prawn", "Squid", "Egg", "Tau kwa (firm tofu)", "Tau pok (puffed tofu)",
  "Silken tofu", "Tempeh",
  "Light soy sauce", "Dark soy sauce", "Kecap manis", "Fish sauce", "Oyster sauce",
  "Sesame oil", "Shaoxing wine", "Hoisin sauce", "Chinese black vinegar", "Rice vinegar",
  "Belacan", "Sambal", "Rojak paste", "Cincaluk (fermented shrimp)",
  "Taucheo (fermented bean paste)", "Miso", "Gochujang",
  "Hae bi (dried shrimp)", "Dried chili", "Dried shiitake mushroom", "Buah keluak",
  "Salted fish", "Dried anchovies (ikan bilis)", "Dried scallops",
  "Five-spice powder (ng hiong)", "White pepper", "Black pepper", "Turmeric powder", "Cumin",
  "Coriander powder", "Star anise", "Cinnamon stick", "Cardamom", "Cloves", "Chili powder",
  "Curry powder", "Chilli (fresh)", "Bird's eye chilli",
  "Bean sprouts", "Kangkong", "Bok choy", "Choy sum", "Long beans", "Cabbage", "Tomato",
  "Cucumber", "Potato", "Carrot", "Eggplant", "Lady's finger (okra)",
  "Jasmine rice", "Glutinous rice", "Rice flour", "Glutinous rice flour", "Plain flour",
  "Kway teow", "Bee hoon (rice vermicelli)", "Egg noodles", "Hokkien noodles", "Laksa noodles",
  "Coconut milk", "Coconut cream", "Grated coconut", "Condensed milk", "Evaporated milk",
  "Butter", "Milk", "Gula melaka (palm sugar)", "Brown sugar", "Rock sugar", "Honey", "Kaya",
  "Salt", "Sugar", "Cooking oil", "Water", "Cornflour",
] as const;

// Common ingredients beyond the Singapore-staples catalog.
export const EXTRA_NAMES = [
  // Proteins
  "Chicken wings", "Chicken drumsticks", "Chicken fat", "Whole chicken", "Duck", "Duck breast",
  "Duck leg", "Lamb", "Mutton", "Minced beef", "Beef brisket", "Pork ribs", "Pork shoulder",
  "Pork loin", "Bacon", "Ham", "Sausage", "Chinese sausage (lap cheong)", "Lard", "Salmon",
  "Cod", "Tuna", "Mackerel", "Sea bass", "Snapper", "Pomfret", "Threadfin (ngoh hu)",
  "Shrimp", "Crab", "Clams", "Mussels", "Scallops", "Oysters", "Cuttlefish", "Fish balls",
  "Fish cake", "Egg whites", "Egg yolks", "Century egg", "Salted egg", "Tofu", "Fish maw",
  // Stocks and liquids
  "Chicken stock", "Pork stock", "Beef stock", "Fish stock", "Vegetable stock", "Stock",
  "Broth", "Pasta water", "Rice wine", "Cooking wine", "Mirin", "Sake", "White wine",
  "Red wine", "Beer", "Lime juice", "Lemon juice", "Orange juice",
  // Vegetables and fruit
  "Red onion", "Shallots oil", "Leek", "Celery", "Chinese celery", "Garlic chives", "Chives",
  "Bell pepper", "Red chili", "Green chili", "Chili padi", "Mushrooms", "Shiitake mushrooms",
  "Button mushrooms", "Enoki mushrooms", "Oyster mushrooms", "Wood ear fungus", "Spinach",
  "Chinese spinach", "Kai lan", "Broccoli", "Cauliflower", "Napa cabbage", "Lettuce",
  "Shanghai greens", "Leafy greens", "Greens", "Watercress", "Bitter gourd", "Winter melon",
  "Luffa", "Pumpkin", "Sweet potato", "Yam (taro)", "Radish (daikon)", "Corn", "Peas",
  "Snow peas", "French beans", "Zucchini", "Lotus root", "Bamboo shoots",
  "Water chestnuts", "Avocado", "Lime", "Lemon", "Calamansi", "Pineapple", "Mango",
  "Banana", "Apple", "Tamarind", "Tamarind paste (asam)",
  // Herbs and spices
  "Basil", "Mint", "Parsley", "Cilantro", "Dill", "Rosemary", "Thyme", "Oregano",
  "Bay leaves", "Italian herbs", "Mixed herbs", "Herbs", "Sesame seeds", "Peanuts",
  "Cashews", "Candlenuts", "Fennel seeds", "Mustard seeds", "Fenugreek", "Nutmeg",
  "Paprika", "Chili flakes", "Sichuan peppercorns", "Peppercorns", "Pepper",
  "Garam masala", "Ginger powder", "Garlic powder", "Onion powder", "MSG", "Chicken powder",
  // Sauces and condiments
  "Soy sauce", "Chili sauce", "Chili oil", "Tomato sauce", "Ketchup", "Sweet chili sauce",
  "Sriracha", "Worcestershire sauce", "Black bean sauce", "Fermented black beans",
  "Chee hou sauce", "Plum sauce", "Sesame paste", "Peanut butter", "Mayonnaise", "Mustard",
  "Vinegar", "White vinegar", "Apple cider vinegar", "Balsamic vinegar", "Curry paste",
  "Rempah", "Laksa paste", "Tom yum paste", "Shrimp paste", "Red fermented bean curd",
  "Fermented bean curd", "Preserved vegetables (chai poh)", "Salted vegetables (kiam chye)",
  // Oils and fats
  "Olive oil", "Vegetable oil", "Peanut oil", "Canola oil", "Coconut oil", "Shallot oil",
  "Ghee", "Margarine",
  // Starches and dry goods
  "Rice", "Brown rice", "Basmati rice", "Pasta", "Spaghetti", "Penne", "Noodles",
  "Rice noodles", "Vermicelli", "Mee pok", "Ramen noodles", "Udon", "Soba", "Glass noodles",
  "Bread", "Breadcrumbs", "Panko", "Flour", "Self-raising flour", "Bread flour",
  "Potato starch", "Tapioca starch", "Cornstarch", "Baking powder", "Baking soda", "Yeast",
  "Oats", "Dumpling wrappers", "Wonton wrappers", "Spring roll wrappers", "Red dates",
  "Goji berries", "Dried longan", "Black fungus", "Lotus seeds", "Barley", "Mung beans",
  "Red beans", "Chickpeas", "Lentils",
  // Dairy and sweet
  "Cream", "Heavy cream", "Sour cream", "Yogurt", "Cheese", "Parmesan", "Mozzarella",
  "Cheddar", "Cream cheese", "Caster sugar", "Icing sugar", "Maple syrup",
  "Vanilla extract", "Cocoa powder", "Chocolate", "Agar agar", "Gelatin",
] as const;

// Spoken or regional variants → the display name above.
export const ALIASES: Record<string, string> = {
  "chili": "Chilli (fresh)",
  "chilli": "Chilli (fresh)",
  "chilies": "Chilli (fresh)",
  "chillies": "Chilli (fresh)",
  "chili padi": "Chili padi",
  "chilli padi": "Chili padi",
  "scallion": "Spring onion",
  "scallions": "Spring onion",
  "green onion": "Spring onion",
  "green onions": "Spring onion",
  "pandan leaf": "Pandan leaves",
  "pandan": "Pandan leaves",
  "kaffir lime leaf": "Kaffir lime leaves",
  "curry leaf": "Curry leaves",
  "bay leaf": "Bay leaves",
  "coriander leaves": "Coriander",
  "eggs": "Egg",
  "prawns": "Prawn",
  "shrimps": "Shrimp",
  "dried shrimps": "Hae bi (dried shrimp)",
  "ikan bilis": "Dried anchovies (ikan bilis)",
  "tau kwa": "Tau kwa (firm tofu)",
  "firm tofu": "Tau kwa (firm tofu)",
  "tau pok": "Tau pok (puffed tofu)",
  "light soy": "Light soy sauce",
  "dark soy": "Dark soy sauce",
  "sweet soy sauce": "Kecap manis",
  "shaoxing": "Shaoxing wine",
  "hua tiao wine": "Shaoxing wine",
  "black vinegar": "Chinese black vinegar",
  "palm sugar": "Gula melaka (palm sugar)",
  "gula melaka": "Gula melaka (palm sugar)",
  "five spice": "Five-spice powder (ng hiong)",
  "five-spice": "Five-spice powder (ng hiong)",
  "five spice powder": "Five-spice powder (ng hiong)",
  "lap cheong": "Chinese sausage (lap cheong)",
  "chinese sausage": "Chinese sausage (lap cheong)",
  "taro": "Yam (taro)",
  "yam": "Yam (taro)",
  "daikon": "Radish (daikon)",
  "white radish": "Radish (daikon)",
  "radish": "Radish (daikon)",
  "chai poh": "Preserved vegetables (chai poh)",
  "kiam chye": "Salted vegetables (kiam chye)",
  "asam": "Tamarind paste (asam)",
  "corn flour": "Cornflour",
  "corn starch": "Cornstarch",
  "spring onions": "Spring onion",
  "aubergine": "Eggplant",
  "brinjal": "Eggplant",
  "lady's fingers": "Lady's finger (okra)",
  "bird's eye chili": "Bird's eye chilli",
  "ladies fingers": "Lady's finger (okra)",
  "lady fingers": "Lady's finger (okra)",
  "beansprouts": "Bean sprouts",
  "taugeh": "Bean sprouts",
  "kailan": "Kai lan",
  "chye sim": "Choy sum",
  "nai bai": "Bok choy",
  "pak choy": "Bok choy",
  "pak choi": "Bok choy",
  "bok choi": "Bok choy",
  "oil": "Cooking oil",
  "neutral oil": "Cooking oil",
  "sesame": "Sesame seeds",
  "msg": "MSG",
  "stock cube": "Stock",
  "chicken broth": "Chicken stock",
  "garlic cloves": "Garlic",
  "red chilli": "Red chili",
  "chilli sauce": "Chili sauce",
  "chilli oil": "Chili oil",
  "chilli flakes": "Chili flakes",
  "chilli powder": "Chili powder",
  "dried chilli": "Dried chili",
  "dried chillies": "Dried chili",
  "sweet chilli sauce": "Sweet chili sauce",
  "green chilli": "Green chili",
  "rice wine": "Rice wine",
  "kicap manis": "Kecap manis",
};

export interface VocabularyTerm {
  term: string; // lowercase phrase to look for
  name: string; // display name
}

function displayBase(name: string): string {
  return name.replace(/\s*\([^)]*\)/g, "").trim();
}

function pluralVariants(term: string): string[] {
  const out = new Set([term]);
  if (/(s|sh|ch|x|z)$/.test(term)) out.add(term + "es");
  else if (/[^aeiou]y$/.test(term)) out.add(term.slice(0, -1) + "ies");
  else out.add(term + "s");
  if (term.endsWith("leaves")) out.add(term.replace(/leaves$/, "leaf"));
  if (term.endsWith("ies")) out.add(term.slice(0, -3) + "y");
  else if (term.endsWith("oes")) out.add(term.slice(0, -2));
  else if (term.endsWith("s") && !term.endsWith("ss")) out.add(term.slice(0, -1));
  return [...out];
}

let cached: VocabularyTerm[] | null = null;

// All search terms, longest first so "jasmine rice" wins over "rice".
export function vocabularyTerms(): VocabularyTerm[] {
  if (cached) return cached;
  const byTerm = new Map<string, string>();
  const add = (term: string, name: string) => {
    const clean = term.toLowerCase().replace(/\s+/g, " ").trim();
    if (clean.length >= 3 && !byTerm.has(clean)) byTerm.set(clean, name);
  };
  for (const name of [...CATALOG_NAMES, ...EXTRA_NAMES]) {
    for (const variant of pluralVariants(displayBase(name).toLowerCase())) add(variant, name);
    // "Laksa leaves (daun kesum)" is also findable as "daun kesum".
    for (const inner of name.match(/\(([^)]*)\)/g) ?? []) {
      const alias = inner.slice(1, -1).trim().toLowerCase();
      if (!["fresh", "dried"].includes(alias)) add(alias, name);
    }
  }
  for (const [alias, name] of Object.entries(ALIASES)) {
    for (const variant of pluralVariants(alias)) add(variant, name);
  }
  cached = [...byTerm.entries()]
    .map(([term, name]) => ({ term, name }))
    .sort((a, b) => b.term.length - a.term.length);
  return cached;
}
