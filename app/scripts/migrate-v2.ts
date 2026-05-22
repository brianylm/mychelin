// Migrate: add users, cultural context columns, voice_recordings, recipe_photos
import { createClient } from "@libsql/client";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function main() {
  console.log("📦 Running migration v2...\n");

  // Users table
  await client.execute(`
    CREATE TABLE IF NOT EXISTS "users" (
      "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      "name" text NOT NULL,
      "email" text NOT NULL UNIQUE,
      "password_hash" text NOT NULL,
      "avatar_url" text,
      "created_at" text NOT NULL
    )
  `);
  console.log("  ✓ users");

  // Add new columns to recipes (SQLite ALTER TABLE)
  const newCols = [
    ["user_id", "integer REFERENCES users(id) ON DELETE CASCADE"],
    ["origin", "text"],
    ["dialect", "text"],
    ["occasion", "text"],
    ["family_member", "text"],
    ["generation", "text"],
  ];
  for (const [col, type] of newCols) {
    try {
      await client.execute(`ALTER TABLE recipes ADD COLUMN "${col}" ${type}`);
      console.log(`  ✓ recipes.${col}`);
    } catch (e: any) {
      if (e.message?.includes("duplicate column")) {
        console.log(`  - recipes.${col} (already exists)`);
      } else {
        console.log(`  ⚠ recipes.${col}: ${e.message}`);
      }
    }
  }

  // Voice recordings table
  await client.execute(`
    CREATE TABLE IF NOT EXISTS "voice_recordings" (
      "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      "recipe_id" integer NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
      "blob_url" text NOT NULL,
      "duration" integer NOT NULL,
      "label" text,
      "sort_order" integer DEFAULT 0,
      "created_at" text NOT NULL
    )
  `);
  console.log("  ✓ voice_recordings");

  // Recipe photos table
  await client.execute(`
    CREATE TABLE IF NOT EXISTS "recipe_photos" (
      "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      "recipe_id" integer NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
      "blob_url" text NOT NULL,
      "sort_order" integer DEFAULT 0,
      "created_at" text NOT NULL
    )
  `);
  console.log("  ✓ recipe_photos");

  console.log("\n✅ Migration v2 complete!");
}

main().catch(console.error);
