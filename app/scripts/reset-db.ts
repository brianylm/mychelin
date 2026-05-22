// Reset Turso DB: drop all old tables, push new schema
import { createClient } from "@libsql/client";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const OLD_TABLES = [
  "shopping_items",
  "fridge_items",
  "meal_plans",
  "book_members",
  "recipe_versions",
  "user_preferences",
  "recipes",
  "recipe_books",
  "users",
  // Also drop any new tables if they exist (for re-runs)
  "ingredient_catalog",
  "inventory",
  "ingredients",
  "instructions",
];

async function main() {
  console.log("🗑️  Dropping old tables...");
  for (const table of OLD_TABLES) {
    try {
      await client.execute(`DROP TABLE IF EXISTS "${table}"`);
      console.log(`  ✓ Dropped ${table}`);
    } catch (e: any) {
      console.log(`  ⚠ ${table}: ${e.message}`);
    }
  }

  console.log("\n📦 Creating new schema...");

  // recipes
  await client.execute(`
    CREATE TABLE IF NOT EXISTS "recipes" (
      "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      "title" text NOT NULL,
      "description" text,
      "cuisine" text,
      "yield" text,
      "prep_time" integer,
      "cook_time" integer,
      "story" text,
      "image_url" text,
      "is_public" integer DEFAULT false,
      "created_at" text NOT NULL,
      "updated_at" text NOT NULL
    )
  `);
  console.log("  ✓ recipes");

  // ingredients
  await client.execute(`
    CREATE TABLE IF NOT EXISTS "ingredients" (
      "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      "recipe_id" integer NOT NULL,
      "catalog_ingredient_id" integer,
      "name" text NOT NULL,
      "quantity" real,
      "unit" text,
      "notes" text,
      "sort_order" integer DEFAULT 0,
      FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id") ON DELETE cascade,
      FOREIGN KEY ("catalog_ingredient_id") REFERENCES "ingredient_catalog"("id")
    )
  `);
  console.log("  ✓ ingredients");

  // instructions
  await client.execute(`
    CREATE TABLE IF NOT EXISTS "instructions" (
      "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      "recipe_id" integer NOT NULL,
      "step_number" integer NOT NULL,
      "content" text NOT NULL,
      "tip" text,
      "image_url" text,
      FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id") ON DELETE cascade
    )
  `);
  console.log("  ✓ instructions");

  // ingredient_catalog
  await client.execute(`
    CREATE TABLE IF NOT EXISTS "ingredient_catalog" (
      "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      "name" text NOT NULL,
      "category" text,
      "default_unit" text
    )
  `);
  await client.execute(`
    CREATE UNIQUE INDEX IF NOT EXISTS "ingredient_catalog_name_unique"
    ON "ingredient_catalog" ("name")
  `);
  console.log("  ✓ ingredient_catalog");

  // meal_plans
  await client.execute(`
    CREATE TABLE IF NOT EXISTS "meal_plans" (
      "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      "date" text NOT NULL,
      "meal_type" text NOT NULL,
      "recipe_id" integer NOT NULL,
      "servings" real DEFAULT 1 NOT NULL,
      "notes" text,
      "created_at" text NOT NULL,
      FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id") ON DELETE cascade
    )
  `);
  console.log("  ✓ meal_plans");

  // inventory
  await client.execute(`
    CREATE TABLE IF NOT EXISTS "inventory" (
      "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      "catalog_ingredient_id" integer,
      "name" text NOT NULL,
      "quantity" real NOT NULL,
      "unit" text NOT NULL,
      "location" text,
      "expiry_date" text,
      "updated_at" text NOT NULL,
      FOREIGN KEY ("catalog_ingredient_id") REFERENCES "ingredient_catalog"("id")
    )
  `);
  console.log("  ✓ inventory");

  // Seed a sample recipe
  console.log("\n🌱 Seeding sample data...");
  const now = new Date().toISOString();

  await client.execute({
    sql: `INSERT INTO recipes (title, description, cuisine, story, prep_time, cook_time, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      "Ah Ma's Hokkien Mee",
      "Thick yellow noodles and rice vermicelli stir-fried in a rich prawn stock",
      "Hokkien",
      "My grandmother learned this from her mother at their Clarke Quay hawker stall in the 1960s. The secret is the prawn head stock — she'd roast the heads until deep red before boiling. Every CNY reunion dinner, this was the first dish on the table.",
      30,
      25,
      now,
      now,
    ],
  });

  // Get the recipe ID
  const result = await client.execute("SELECT last_insert_rowid() as id");
  const recipeId = Number(result.rows[0].id);

  // Add ingredients
  const ingredients = [
    [recipeId, "Yellow noodles (thick)", 300, "g", null, 0],
    [recipeId, "Bee hoon (rice vermicelli)", 100, "g", "soaked", 1],
    [recipeId, "Prawns (medium)", 200, "g", "shell-on for stock", 2],
    [recipeId, "Pork belly", 150, "g", "sliced thin", 3],
    [recipeId, "Squid", 100, "g", "cleaned and sliced", 4],
    [recipeId, "Garlic", 4, "cloves", "minced", 5],
    [recipeId, "Pork lard", 2, "tbsp", null, 6],
    [recipeId, "Prawn stock", 500, "ml", "from roasted prawn heads", 7],
    [recipeId, "Light soy sauce", 2, "tbsp", null, 8],
    [recipeId, "White pepper", 1, "tsp", null, 9],
    [recipeId, "Bean sprouts", 100, "g", null, 10],
    [recipeId, "Sambal chilli", null, null, "for serving", 11],
    [recipeId, "Lime", 2, "pcs", "cut into wedges", 12],
  ];

  for (const [rid, name, qty, unit, notes, order] of ingredients) {
    await client.execute({
      sql: `INSERT INTO ingredients (recipe_id, name, quantity, unit, notes, sort_order) VALUES (?, ?, ?, ?, ?, ?)`,
      args: [rid, name, qty, unit, notes, order],
    });
  }

  // Add instructions
  const steps = [
    [recipeId, 1, "Roast prawn heads and shells in a dry wok until deep red and fragrant. Add water and simmer for 20 minutes to make stock.", "Ah Ma says: 'Don't rush the roasting — the colour is the flavour'"],
    [recipeId, 2, "Render pork lard in the wok until crispy. Remove cracklings, keep the oil.", null],
    [recipeId, 3, "Fry garlic in pork lard oil until golden. Add pork belly slices, cook until edges curl.", null],
    [recipeId, 4, "Add prawns and squid, stir-fry until just changed colour. Don't overcook.", null],
    [recipeId, 5, "Add yellow noodles and bee hoon. Pour in prawn stock gradually, tossing constantly.", "The stock should be absorbed, not pooling"],
    [recipeId, 6, "Season with soy sauce and white pepper. Add bean sprouts in the last 30 seconds.", null],
    [recipeId, 7, "Serve on banana leaf if you have it. Squeeze lime and add sambal on the side.", null],
  ];

  for (const [rid, num, content, tip] of steps) {
    await client.execute({
      sql: `INSERT INTO instructions (recipe_id, step_number, content, tip) VALUES (?, ?, ?, ?)`,
      args: [rid, num, content, tip],
    });
  }

  console.log("  ✓ Seeded: Ah Ma's Hokkien Mee (with 13 ingredients, 7 steps, and a story)");

  console.log("\n✅ Database reset complete!");
}

main().catch(console.error);
