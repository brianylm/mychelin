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
let recipeAttemptDishRatingEnsured = false;
let recipeNextTriesEnsured = false;
let userOnboardingEnsured = false;
let usageEventsEnsured = false;
let notificationsEnsured = false;
let userOAuthEnsured = false;
let pilotFeedbackEnsured = false;
let recipeFlagsEnsured = false;

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
      dish_rating real,
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


export async function ensureRecipeAttemptDishRatingColumn(): Promise<void> {
  if (recipeAttemptDishRatingEnsured) return;

  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url) return;

  const client = createClient({ url, authToken });
  try {
    await client.execute("ALTER TABLE recipe_attempts ADD COLUMN dish_rating real");
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    const msg = message.toLowerCase();
    if (!msg.includes("duplicate") && !msg.includes("already exists")) {
      console.warn("ensureRecipeAttemptDishRatingColumn:", message);
    }
  }

  recipeAttemptDishRatingEnsured = true;
}


export async function ensureRecipeNextTriesTable(): Promise<void> {
  if (recipeNextTriesEnsured) return;

  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url) return;

  const client = createClient({ url, authToken });
  const statements = [
    `CREATE TABLE IF NOT EXISTS recipe_next_tries (
      id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      recipe_id integer NOT NULL REFERENCES recipes(id) ON DELETE cascade,
      source_attempt_id integer REFERENCES recipe_attempts(id) ON DELETE set null,
      source_version_id integer REFERENCES recipe_versions(id) ON DELETE set null,
      user_id integer REFERENCES users(id) ON DELETE cascade,
      status text NOT NULL DEFAULT 'active',
      notes text,
      ingredients text,
      instructions text,
      promoted_version_id integer REFERENCES recipe_versions(id) ON DELETE set null,
      created_at text NOT NULL,
      updated_at text NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS recipe_next_tries_recipe_id_idx ON recipe_next_tries(recipe_id)`,
    `CREATE INDEX IF NOT EXISTS recipe_next_tries_user_id_idx ON recipe_next_tries(user_id)`,
    `CREATE INDEX IF NOT EXISTS recipe_next_tries_status_idx ON recipe_next_tries(status)`,
    `CREATE INDEX IF NOT EXISTS recipe_next_tries_source_attempt_id_idx ON recipe_next_tries(source_attempt_id)`,
    `CREATE INDEX IF NOT EXISTS recipe_next_tries_source_version_id_idx ON recipe_next_tries(source_version_id)`,
  ];

  for (const statement of statements) {
    try {
      await client.execute(statement);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      const msg = message.toLowerCase();
      if (!msg.includes("duplicate") && !msg.includes("already exists")) {
        console.warn("ensureRecipeNextTriesTable:", message);
      }
    }
  }

  recipeNextTriesEnsured = true;
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


export async function ensureUsageEventsTable(): Promise<void> {
  if (usageEventsEnsured) return;

  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url) return;

  const client = createClient({ url, authToken });
  const statements = [
    `CREATE TABLE IF NOT EXISTS usage_events (
      id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      user_id integer REFERENCES users(id) ON DELETE set null,
      event_name text NOT NULL,
      source text,
      recipe_id integer REFERENCES recipes(id) ON DELETE set null,
      book_id integer REFERENCES books(id) ON DELETE set null,
      meal_plan_id integer REFERENCES meal_plans(id) ON DELETE set null,
      properties text,
      path text,
      created_at text NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS usage_events_user_id_idx ON usage_events(user_id)`,
    `CREATE INDEX IF NOT EXISTS usage_events_event_name_idx ON usage_events(event_name)`,
    `CREATE INDEX IF NOT EXISTS usage_events_created_at_idx ON usage_events(created_at)`,
    `CREATE INDEX IF NOT EXISTS usage_events_recipe_id_idx ON usage_events(recipe_id)`,
    `CREATE INDEX IF NOT EXISTS usage_events_meal_plan_id_idx ON usage_events(meal_plan_id)`,
  ];

  for (const statement of statements) {
    try {
      await client.execute(statement);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      const msg = message.toLowerCase();
      if (!msg.includes("duplicate") && !msg.includes("already exists")) {
        console.warn("ensureUsageEventsTable:", message);
      }
    }
  }

  usageEventsEnsured = true;
}


export async function ensureNotificationTables(): Promise<void> {
  if (notificationsEnsured) return;

  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url) return;

  const client = createClient({ url, authToken });
  const statements = [
    `CREATE TABLE IF NOT EXISTS notification_preferences (
      user_id integer PRIMARY KEY NOT NULL REFERENCES users(id) ON DELETE cascade,
      weekly_cooking_goal integer NOT NULL DEFAULT 2,
      rhythm_reminders integer NOT NULL DEFAULT 1,
      meal_reminders integer NOT NULL DEFAULT 1,
      prep_reminders integer NOT NULL DEFAULT 1,
      review_reminders integer NOT NULL DEFAULT 1,
      family_activity integer NOT NULL DEFAULT 1,
      reminder_time text NOT NULL DEFAULT '18:00',
      timezone text NOT NULL DEFAULT 'Asia/Singapore',
      updated_at text NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS push_subscriptions (
      id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      user_id integer NOT NULL REFERENCES users(id) ON DELETE cascade,
      endpoint text NOT NULL UNIQUE,
      p256dh text NOT NULL,
      auth text NOT NULL,
      user_agent text,
      disabled_at text,
      last_success_at text,
      created_at text NOT NULL,
      updated_at text NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS push_subscriptions_user_id_idx ON push_subscriptions(user_id)`,
    `CREATE TABLE IF NOT EXISTS notification_jobs (
      id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      user_id integer NOT NULL REFERENCES users(id) ON DELETE cascade,
      type text NOT NULL,
      title text NOT NULL,
      body text NOT NULL,
      url text NOT NULL DEFAULT '/app',
      due_at text NOT NULL,
      sent_at text,
      canceled_at text,
      attempts integer NOT NULL DEFAULT 0,
      last_error text,
      created_at text NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS notification_jobs_due_idx ON notification_jobs(due_at, sent_at, canceled_at)`,
    `CREATE INDEX IF NOT EXISTS notification_jobs_user_id_idx ON notification_jobs(user_id)`,
  ];

  for (const statement of statements) {
    try {
      await client.execute(statement);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      const msg = message.toLowerCase();
      if (!msg.includes("duplicate") && !msg.includes("already exists")) {
        console.warn("ensureNotificationTables:", message);
      }
    }
  }

  notificationsEnsured = true;
}

export async function ensureUserOAuthColumns(): Promise<void> {
  if (userOAuthEnsured) return;

  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url) return;

  const client = createClient({ url, authToken });
  const statements = [
    `ALTER TABLE users ADD COLUMN auth_provider text NOT NULL DEFAULT 'password'`,
    `ALTER TABLE users ADD COLUMN google_sub text`,
    `ALTER TABLE users ADD COLUMN email_verified integer NOT NULL DEFAULT 0`,
    `CREATE UNIQUE INDEX IF NOT EXISTS users_google_sub_idx ON users(google_sub) WHERE google_sub IS NOT NULL`,
  ];

  for (const statement of statements) {
    try {
      await client.execute(statement);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      const msg = message.toLowerCase();
      if (!msg.includes("duplicate") && !msg.includes("already exists")) {
        console.warn("ensureUserOAuthColumns:", message);
      }
    }
  }

  userOAuthEnsured = true;
}

export async function ensurePilotFeedbackTable(): Promise<void> {
  if (pilotFeedbackEnsured) return;

  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url) return;

  const client = createClient({ url, authToken });
  const statements = [
    `CREATE TABLE IF NOT EXISTS pilot_feedback (
      id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      user_id integer REFERENCES users(id) ON DELETE cascade,
      stage text NOT NULL,
      rating integer,
      comment text,
      source text,
      created_at text NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS pilot_feedback_user_id_idx ON pilot_feedback(user_id)`,
    `CREATE INDEX IF NOT EXISTS pilot_feedback_stage_idx ON pilot_feedback(stage)`,
    `CREATE INDEX IF NOT EXISTS pilot_feedback_created_at_idx ON pilot_feedback(created_at)`,
  ];

  for (const statement of statements) {
    try {
      await client.execute(statement);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      const msg = message.toLowerCase();
      if (!msg.includes("duplicate") && !msg.includes("already exists")) {
        console.warn("ensurePilotFeedbackTable:", message);
      }
    }
  }

  pilotFeedbackEnsured = true;
}


export async function ensureRecipeFlagsTable(): Promise<void> {
  if (recipeFlagsEnsured) return;

  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url) return;

  const client = createClient({ url, authToken });
  const statements = [
    `CREATE TABLE IF NOT EXISTS recipe_flags (
      id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      recipe_id integer NOT NULL REFERENCES recipes(id) ON DELETE cascade,
      user_id integer NOT NULL REFERENCES users(id) ON DELETE cascade,
      flag text NOT NULL,
      created_at text NOT NULL
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS recipe_flags_unique_idx ON recipe_flags(recipe_id, user_id, flag)`,
    `CREATE INDEX IF NOT EXISTS recipe_flags_user_id_idx ON recipe_flags(user_id)`,
    `CREATE INDEX IF NOT EXISTS recipe_flags_recipe_id_idx ON recipe_flags(recipe_id)`,
  ];

  for (const statement of statements) {
    try {
      await client.execute(statement);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      const msg = message.toLowerCase();
      if (!msg.includes("duplicate") && !msg.includes("already exists")) {
        console.warn("ensureRecipeFlagsTable:", message);
      }
    }
  }

  recipeFlagsEnsured = true;
}
