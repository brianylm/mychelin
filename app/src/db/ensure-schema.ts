// Lazy, idempotent schema fixups. These run at the top of routes that
// depend on the migration having been applied. Once the ALTER succeeds
// once in the database, subsequent calls are cheap no-ops because the
// duplicate-column error is swallowed.
//
// This exists because this project does not auto-run Drizzle migrations
// on deploy — they have to be applied manually against Turso. Rather
// than block features on that manual step, the routes that need the
// schema change bring it along themselves.

import { createClient } from "@libsql/client/web";

let versionLabelEnsured = false;
let planningOwnershipEnsured = false;
let mealPlanCookedAtEnsured = false;
let recipeAttemptsEnsured = false;
let userOnboardingEnsured = false;

export async function ensureVersionLabelColumn(): Promise<void> {
  if (versionLabelEnsured) return;

  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url) return;

  const client = createClient({ url, authToken });
  try {
    await client.execute(`ALTER TABLE recipe_versions ADD COLUMN version_label text`);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    const msg = message.toLowerCase();
    if (!msg.includes("duplicate") && !msg.includes("already exists")) {
      // Unknown error — log it but don't block the request. Worst case
      // the downstream insert will surface a clearer error.
      console.warn("ensureVersionLabelColumn:", message);
    }
  }

  // Best-effort backfill of any rows missing a label. Cheap after the
  // first run because the WHERE clause matches nothing.
  try {
    await client.execute(
      `UPDATE recipe_versions SET version_label = CAST(version_number AS TEXT) WHERE version_label IS NULL`
    );
  } catch {
    /* ignore */
  }

  versionLabelEnsured = true;
}


export async function ensurePlanningOwnershipColumns(): Promise<void> {
  if (planningOwnershipEnsured) return;

  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url) return;

  const client = createClient({ url, authToken });
  const statements = [
    `ALTER TABLE meal_plans ADD COLUMN user_id integer REFERENCES users(id) ON DELETE cascade`,
    `ALTER TABLE inventory ADD COLUMN user_id integer REFERENCES users(id) ON DELETE cascade`,
    `UPDATE meal_plans SET user_id = (SELECT id FROM users ORDER BY id LIMIT 1) WHERE user_id IS NULL`,
    `UPDATE inventory SET user_id = (SELECT id FROM users ORDER BY id LIMIT 1) WHERE user_id IS NULL`,
  ];

  for (const statement of statements) {
    try {
      await client.execute(statement);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      const msg = message.toLowerCase();
      if (!msg.includes("duplicate") && !msg.includes("already exists")) {
        console.warn("ensurePlanningOwnershipColumns:", message);
      }
    }
  }

  planningOwnershipEnsured = true;
}
export async function ensureMealPlanCookedAtColumn(): Promise<void> {
  if (mealPlanCookedAtEnsured) return;

  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url) return;

  const client = createClient({ url, authToken });
  try {
    await client.execute(`ALTER TABLE meal_plans ADD COLUMN cooked_at text`);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    const msg = message.toLowerCase();
    if (!msg.includes("duplicate") && !msg.includes("already exists")) {
      console.warn("ensureMealPlanCookedAtColumn:", message);
    }
  }

  mealPlanCookedAtEnsured = true;
}

export async function ensureRecipeAttemptsTable(): Promise<void> {
  if (recipeAttemptsEnsured) return;

  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url) return;

  const client = createClient({ url, authToken });
  const statements = [
    `CREATE TABLE IF NOT EXISTS recipe_attempts (
      id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      recipe_id integer NOT NULL REFERENCES recipes(id) ON DELETE cascade,
      version_id integer REFERENCES recipe_versions(id) ON DELETE set null,
      meal_plan_id integer REFERENCES meal_plans(id) ON DELETE set null,
      user_id integer REFERENCES users(id) ON DELETE cascade,
      cooked_at text NOT NULL,
      rating real,
      notes text,
      change_notes text,
      what_worked text,
      next_time text,
      ingredients_snapshot text,
      instructions_snapshot text,
      promoted_version_id integer REFERENCES recipe_versions(id) ON DELETE set null,
      created_at text NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS recipe_attempts_recipe_id_idx ON recipe_attempts(recipe_id)`,
    `CREATE INDEX IF NOT EXISTS recipe_attempts_user_id_idx ON recipe_attempts(user_id)`,
    `CREATE INDEX IF NOT EXISTS recipe_attempts_version_id_idx ON recipe_attempts(version_id)`,
    `CREATE INDEX IF NOT EXISTS recipe_attempts_meal_plan_id_idx ON recipe_attempts(meal_plan_id)`,
  ];

  for (const statement of statements) {
    try {
      await client.execute(statement);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      const msg = message.toLowerCase();
      if (!msg.includes("duplicate") && !msg.includes("already exists")) {
        console.warn("ensureRecipeAttemptsTable:", message);
      }
    }
  }

  recipeAttemptsEnsured = true;
}


export async function ensureUserOnboardingColumns(): Promise<void> {
  if (userOnboardingEnsured) return;

  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url) return;

  const client = createClient({ url, authToken });
  const statements = [
    `ALTER TABLE users ADD COLUMN onboarding_completed integer NOT NULL DEFAULT 0`,
    `ALTER TABLE users ADD COLUMN cooking_goal text`,
    `ALTER TABLE users ADD COLUMN cooking_frequency text`,
    `ALTER TABLE users ADD COLUMN first_capture_mode text`,
  ];

  for (const statement of statements) {
    try {
      await client.execute(statement);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      const msg = message.toLowerCase();
      if (!msg.includes("duplicate") && !msg.includes("already exists")) {
        console.warn("ensureUserOnboardingColumns:", message);
      }
    }
  }

  userOnboardingEnsured = true;
}
