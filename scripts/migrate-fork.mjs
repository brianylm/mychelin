import { createClient } from "@libsql/client";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

try {
  await client.execute(`ALTER TABLE recipes ADD COLUMN forked_from TEXT REFERENCES recipes(id)`);
  console.log("✓ Migration applied: forked_from column added to recipes");
} catch (err) {
  if (err.message?.includes("duplicate column") || err.message?.includes("already exists")) {
    console.log("ℹ Column already exists, skipping.");
  } else {
    console.error("Migration failed:", err.message);
    process.exit(1);
  }
}
