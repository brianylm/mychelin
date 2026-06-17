export interface StarterRecipeTemplate {
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  cuisine: string;
  yield: string;
  prepTime: number;
  cookTime: number;
  ingredients: Array<{
    name: string;
    quantity?: number;
    unit?: string;
    approximate?: boolean;
    quantityText?: string;
    notes?: string;
  }>;
  instructions: Array<{ content: string; tip?: string }>;
}

export const starterRecipes: StarterRecipeTemplate[] = [
  {
    slug: "tau-yu-bak",
    title: "Tau yu bak",
    subtitle: "Soy-braised pork belly",
    description: "A starter draft for soy-braised pork belly. Tune this against your family version.",
    cuisine: "Singapore home cooking",
    yield: "3-4 servings",
    prepTime: 15,
    cookTime: 75,
    ingredients: [
      { name: "pork belly", quantity: 600, unit: "g", notes: "cut into chunky pieces" },
      { name: "garlic", quantity: 1, unit: "head", notes: "cloves lightly smashed" },
      { name: "dark soy sauce", quantity: 2, unit: "tbsp" },
      { name: "light soy sauce", quantity: 2, unit: "tbsp" },
      { name: "rock sugar", quantity: 20, unit: "g" },
      { name: "water", quantity: 700, unit: "ml" },
      { name: "hard-boiled eggs", quantity: 4, unit: "pcs", notes: "optional" },
    ],
    instructions: [
      { content: "Blanch pork belly in boiling water for 5 minutes, then rinse and drain." },
      { content: "Fry garlic until fragrant, then add pork and toss until the edges look lightly sealed.", tip: "[heat:medium] Keep the garlic from burning." },
      { content: "Add dark soy sauce, light soy sauce, rock sugar, and water, then bring to a gentle boil.", tip: "[heat:medium] The liquid should taste slightly stronger than the final sauce." },
      { content: "Lower the heat and simmer until the pork is tender, about 60 minutes.", tip: "[heat:low] Keep it barely bubbling and top up water if it dries out." },
      { content: "Add eggs in the last 20 minutes if using, turning them so they stain evenly." },
      { content: "Rest for 10 minutes before serving so the sauce settles." },
    ],
  },
  {
    slug: "garlicky-xiao-bai-cai",
    title: "Garlicky xiao bai cai",
    subtitle: "Quick garlic greens",
    description: "A quick vegetable side dish template for weeknight meals.",
    cuisine: "Singapore home cooking",
    yield: "2-3 servings",
    prepTime: 8,
    cookTime: 5,
    ingredients: [
      { name: "xiao bai cai", quantity: 300, unit: "g", notes: "washed; stems separated from leaves" },
      { name: "garlic", quantity: 3, unit: "cloves", notes: "minced" },
      { name: "cooking oil", quantity: 1, unit: "tbsp" },
      { name: "light soy sauce", quantity: 1, unit: "tsp" },
      { name: "water", quantity: 2, unit: "tbsp" },
    ],
    instructions: [
      { content: "Heat oil and fry garlic until fragrant but not browned.", tip: "[heat:medium] Garlic turns bitter if it gets too dark." },
      { content: "Add the stems and stir-fry for 1 minute." },
      { content: "Add the leaves, soy sauce, and water, then toss until just wilted, about 2 minutes.", tip: "[heat:high] Move quickly so the greens stay bright." },
      { content: "Taste and adjust with a small splash of soy sauce if needed." },
    ],
  },
  {
    slug: "onion-omelette",
    title: "Onion omelette",
    subtitle: "Sweet onion egg omelette",
    description: "A flexible egg dish template for learning heat control and timing.",
    cuisine: "Singapore home cooking",
    yield: "2 servings",
    prepTime: 8,
    cookTime: 8,
    ingredients: [
      { name: "eggs", quantity: 3, unit: "pcs" },
      { name: "yellow onion", quantity: 1, unit: "pc", notes: "thinly sliced" },
      { name: "light soy sauce", quantity: 1, unit: "tsp" },
      { name: "white pepper", approximate: true, quantityText: "a pinch" },
      { name: "cooking oil", quantity: 2, unit: "tbsp" },
    ],
    instructions: [
      { content: "Beat eggs with soy sauce and white pepper until evenly mixed." },
      { content: "Fry onions until soft and lightly sweet, about 4 minutes.", tip: "[heat:medium] Stir often so the onion softens without scorching." },
      { content: "Spread onions evenly, pour in the egg, and let the base set for 2 minutes.", tip: "[heat:medium] Tilt the pan so loose egg fills the gaps." },
      { content: "Flip or fold the omelette, then cook for another 1 to 2 minutes until just set.", tip: "[heat:low] Lower heat if the outside browns before the centre sets." },
    ],
  },
];
