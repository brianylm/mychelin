// Lazy, idempotent schema fixups. These run at the top of routes that
// depend on the migration having been applied.
//
// This exists because this project does not auto-run Drizzle migrations
// on deploy — they have to be applied manually against Turso. Rather
// than block features on that manual step, the routes that need the
// schema change bring it along themselves.
//
// Cost model: every Turso query is an HTTP round trip, and these flags
// are per-isolate, so on a cold edge isolate each ensure used to fire
// its full DDL batch (3–10 sequential round trips) even when the schema
// was already current — the duplicate-column errors were just
// swallowed. Now each ensure probes first (one cheap round trip via
// sqlite_master / PRAGMA table_info) and only runs DDL when something
// is genuinely missing. Caveat: probes check tables/columns, not
// indexes — indexes are created together with their table, so a table
// that exists is assumed to have its indexes.

import { createClient, type Client } from "@libsql/client/web";

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
let mealPlanBlocksEnsured = false;
let recipePhotoSourceEnsured = false;
let householdsEnsured = false;

let _client: Client | null = null;

function getClient(): Client | null {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url) return null;
  if (!_client) _client = createClient({ url, authToken });
  return _client;
}

// One round trip: which of these tables/indexes already exist?
async function existingObjects(client: Client, names: string[]): Promise<Set<string>> {
  const placeholders = names.map(() => "?").join(",");
  const res = await client.execute({
    sql: `SELECT name FROM sqlite_master WHERE name IN (${placeholders})`,
    args: names,
  });
  return new Set(res.rows.map((row) => String(row.name)));
}

// One round trip: column names of a table. Table names are code
// constants, never user input, so identifier interpolation is safe.
async function tableColumns(client: Client, table: string): Promise<Set<string>> {
  const res = await client.execute(`PRAGMA table_info(${table})`);
  return new Set(res.rows.map((row) => String(row.name)));
}

function isDuplicateError(e: unknown): boolean {
  const message = e instanceof Error ? e.message : String(e);
  const msg = message.toLowerCase();
  return msg.includes("duplicate") || msg.includes("already exists");
}

// Runs DDL statements best-effort: duplicate errors are swallowed,
// anything else is logged but does not block the request.
async function runDdl(client: Client, statements: string[], label: string): Promise<void> {
  for (const statement of statements) {
    try {
      await client.execute(statement);
    } catch (e: unknown) {
      if (!isDuplicateError(e)) {
        console.warn(label + ":", e instanceof Error ? e.message : String(e));
      }
    }
  }
}

export async function ensureVersionLabelColumn(): Promise<void> {
  if (versionLabelEnsured) return;
  const client = getClient();
  if (!client) return;

  try {
    if ((await tableColumns(client, "recipe_versions")).has("version_label")) {
      versionLabelEnsured = true;
      return;
    }
  } catch (e: unknown) {
    console.warn("ensureVersionLabelColumn probe:", e instanceof Error ? e.message : String(e));
    return;
  }

  await runDdl(client, [
    `ALTER TABLE recipe_versions ADD COLUMN version_label text`,
    // Best-effort backfill of any rows missing a label. Cheap after the
    // first run because the WHERE clause matches nothing.
    `UPDATE recipe_versions SET version_label = CAST(version_number AS TEXT) WHERE version_label IS NULL`,
  ], "ensureVersionLabelColumn");

  versionLabelEnsured = true;
}

export async function ensurePlanningOwnershipColumns(): Promise<void> {
  if (planningOwnershipEnsured) return;
  const client = getClient();
  if (!client) return;

  let mealPlanCols: Set<string>;
  let inventoryCols: Set<string>;
  try {
    [mealPlanCols, inventoryCols] = await Promise.all([
      tableColumns(client, "meal_plans"),
      tableColumns(client, "inventory"),
    ]);
  } catch (e: unknown) {
    console.warn("ensurePlanningOwnershipColumns probe:", e instanceof Error ? e.message : String(e));
    return;
  }

  const statements: string[] = [];
  if (!mealPlanCols.has("user_id")) {
    statements.push(
      `ALTER TABLE meal_plans ADD COLUMN user_id integer REFERENCES users(id) ON DELETE cascade`,
      `UPDATE meal_plans SET user_id = (SELECT id FROM users ORDER BY id LIMIT 1) WHERE user_id IS NULL`
    );
  }
  if (!inventoryCols.has("user_id")) {
    statements.push(
      `ALTER TABLE inventory ADD COLUMN user_id integer REFERENCES users(id) ON DELETE cascade`,
      `UPDATE inventory SET user_id = (SELECT id FROM users ORDER BY id LIMIT 1) WHERE user_id IS NULL`
    );
  }

  await runDdl(client, statements, "ensurePlanningOwnershipColumns");
  planningOwnershipEnsured = true;
}

export async function ensureMealPlanCookedAtColumn(): Promise<void> {
  if (mealPlanCookedAtEnsured) return;
  const client = getClient();
  if (!client) return;

  try {
    if ((await tableColumns(client, "meal_plans")).has("cooked_at")) {
      mealPlanCookedAtEnsured = true;
      return;
    }
  } catch (e: unknown) {
    console.warn("ensureMealPlanCookedAtColumn probe:", e instanceof Error ? e.message : String(e));
    return;
  }

  await runDdl(client, [
    `ALTER TABLE meal_plans ADD COLUMN cooked_at text`,
  ], "ensureMealPlanCookedAtColumn");

  mealPlanCookedAtEnsured = true;
}

export async function ensureRecipeAttemptsTable(): Promise<void> {
  if (recipeAttemptsEnsured) return;
  const client = getClient();
  if (!client) return;

  try {
    if ((await existingObjects(client, ["recipe_attempts"])).has("recipe_attempts")) {
      recipeAttemptsEnsured = true;
      return;
    }
  } catch (e: unknown) {
    console.warn("ensureRecipeAttemptsTable probe:", e instanceof Error ? e.message : String(e));
    return;
  }

  await runDdl(client, [
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
  ], "ensureRecipeAttemptsTable");

  recipeAttemptsEnsured = true;
}


export async function ensureRecipeAttemptDishRatingColumn(): Promise<void> {
  if (recipeAttemptDishRatingEnsured) return;
  const client = getClient();
  if (!client) return;

  try {
    if ((await tableColumns(client, "recipe_attempts")).has("dish_rating")) {
      recipeAttemptDishRatingEnsured = true;
      return;
    }
  } catch (e: unknown) {
    console.warn("ensureRecipeAttemptDishRatingColumn probe:", e instanceof Error ? e.message : String(e));
    return;
  }

  await runDdl(client, [
    "ALTER TABLE recipe_attempts ADD COLUMN dish_rating real",
  ], "ensureRecipeAttemptDishRatingColumn");

  recipeAttemptDishRatingEnsured = true;
}


export async function ensureRecipeNextTriesTable(): Promise<void> {
  if (recipeNextTriesEnsured) return;
  const client = getClient();
  if (!client) return;

  try {
    if ((await existingObjects(client, ["recipe_next_tries"])).has("recipe_next_tries")) {
      recipeNextTriesEnsured = true;
      return;
    }
  } catch (e: unknown) {
    console.warn("ensureRecipeNextTriesTable probe:", e instanceof Error ? e.message : String(e));
    return;
  }

  await runDdl(client, [
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
  ], "ensureRecipeNextTriesTable");

  recipeNextTriesEnsured = true;
}


export async function ensureUserOnboardingColumns(): Promise<void> {
  if (userOnboardingEnsured) return;
  const client = getClient();
  if (!client) return;

  let userCols: Set<string>;
  try {
    userCols = await tableColumns(client, "users");
  } catch (e: unknown) {
    console.warn("ensureUserOnboardingColumns probe:", e instanceof Error ? e.message : String(e));
    return;
  }

  const statements: string[] = [];
  if (!userCols.has("onboarding_completed")) {
    statements.push(`ALTER TABLE users ADD COLUMN onboarding_completed integer NOT NULL DEFAULT 0`);
  }
  if (!userCols.has("cooking_goal")) {
    statements.push(`ALTER TABLE users ADD COLUMN cooking_goal text`);
  }
  if (!userCols.has("cooking_frequency")) {
    statements.push(`ALTER TABLE users ADD COLUMN cooking_frequency text`);
  }
  if (!userCols.has("first_capture_mode")) {
    statements.push(`ALTER TABLE users ADD COLUMN first_capture_mode text`);
  }

  await runDdl(client, statements, "ensureUserOnboardingColumns");
  userOnboardingEnsured = true;
}


export async function ensureUsageEventsTable(): Promise<void> {
  if (usageEventsEnsured) return;
  const client = getClient();
  if (!client) return;

  try {
    if ((await existingObjects(client, ["usage_events"])).has("usage_events")) {
      usageEventsEnsured = true;
      return;
    }
  } catch (e: unknown) {
    console.warn("ensureUsageEventsTable probe:", e instanceof Error ? e.message : String(e));
    return;
  }

  await runDdl(client, [
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
  ], "ensureUsageEventsTable");

  usageEventsEnsured = true;
}


export async function ensureNotificationTables(): Promise<void> {
  if (notificationsEnsured) return;
  const client = getClient();
  if (!client) return;

  let existing: Set<string>;
  try {
    existing = await existingObjects(client, [
      "notification_preferences",
      "push_subscriptions",
      "notification_jobs",
    ]);
  } catch (e: unknown) {
    console.warn("ensureNotificationTables probe:", e instanceof Error ? e.message : String(e));
    return;
  }

  const statements: string[] = [];
  if (!existing.has("notification_preferences")) {
    statements.push(
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
      )`
    );
  }
  if (!existing.has("push_subscriptions")) {
    statements.push(
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
      `CREATE INDEX IF NOT EXISTS push_subscriptions_user_id_idx ON push_subscriptions(user_id)`
    );
  }
  if (!existing.has("notification_jobs")) {
    statements.push(
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
      `CREATE INDEX IF NOT EXISTS notification_jobs_user_id_idx ON notification_jobs(user_id)`
    );
  }

  await runDdl(client, statements, "ensureNotificationTables");
  notificationsEnsured = true;
}

export async function ensureUserOAuthColumns(): Promise<void> {
  if (userOAuthEnsured) return;
  const client = getClient();
  if (!client) return;

  let userCols: Set<string>;
  try {
    userCols = await tableColumns(client, "users");
  } catch (e: unknown) {
    console.warn("ensureUserOAuthColumns probe:", e instanceof Error ? e.message : String(e));
    return;
  }

  const statements: string[] = [];
  if (!userCols.has("auth_provider")) {
    statements.push(`ALTER TABLE users ADD COLUMN auth_provider text NOT NULL DEFAULT 'password'`);
  }
  if (!userCols.has("google_sub")) {
    statements.push(`ALTER TABLE users ADD COLUMN google_sub text`);
  }
  if (!userCols.has("email_verified")) {
    statements.push(`ALTER TABLE users ADD COLUMN email_verified integer NOT NULL DEFAULT 0`);
  }
  if (statements.length > 0) {
    statements.push(`CREATE UNIQUE INDEX IF NOT EXISTS users_google_sub_idx ON users(google_sub) WHERE google_sub IS NOT NULL`);
  }

  await runDdl(client, statements, "ensureUserOAuthColumns");
  userOAuthEnsured = true;
}

export async function ensurePilotFeedbackTable(): Promise<void> {
  if (pilotFeedbackEnsured) return;
  const client = getClient();
  if (!client) return;

  try {
    if ((await existingObjects(client, ["pilot_feedback"])).has("pilot_feedback")) {
      pilotFeedbackEnsured = true;
      return;
    }
  } catch (e: unknown) {
    console.warn("ensurePilotFeedbackTable probe:", e instanceof Error ? e.message : String(e));
    return;
  }

  await runDdl(client, [
    `CREATE TABLE IF NOT EXISTS pilot_feedback (
      id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      user_id integer NOT NULL REFERENCES users(id) ON DELETE cascade,
      stage text NOT NULL,
      rating integer,
      comment text,
      source text,
      created_at text NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS pilot_feedback_user_id_idx ON pilot_feedback(user_id)`,
    `CREATE INDEX IF NOT EXISTS pilot_feedback_stage_idx ON pilot_feedback(stage)`,
    `CREATE INDEX IF NOT EXISTS pilot_feedback_created_at_idx ON pilot_feedback(created_at)`,
  ], "ensurePilotFeedbackTable");

  pilotFeedbackEnsured = true;
}


export async function ensureRecipeFlagsTable(): Promise<void> {
  if (recipeFlagsEnsured) return;
  const client = getClient();
  if (!client) return;

  try {
    if ((await existingObjects(client, ["recipe_flags"])).has("recipe_flags")) {
      recipeFlagsEnsured = true;
      return;
    }
  } catch (e: unknown) {
    console.warn("ensureRecipeFlagsTable probe:", e instanceof Error ? e.message : String(e));
    return;
  }

  await runDdl(client, [
    `CREATE TABLE IF NOT EXISTS recipe_flags (
      id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      recipe_id integer NOT NULL REFERENCES recipes(id) ON DELETE cascade,
      user_id integer REFERENCES users(id) ON DELETE cascade,
      flag text NOT NULL,
      created_at text NOT NULL
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS recipe_flags_unique_idx ON recipe_flags(recipe_id, user_id, flag)`,
    `CREATE INDEX IF NOT EXISTS recipe_flags_user_id_idx ON recipe_flags(user_id)`,
    `CREATE INDEX IF NOT EXISTS recipe_flags_recipe_id_idx ON recipe_flags(recipe_id)`,
  ], "ensureRecipeFlagsTable");

  recipeFlagsEnsured = true;
}

// One-time cleanup for the removed "try_soon" recipe flag (2026-08-03).
// Stale rows are invisible (normalizeRecipeFlags drops unknown values) but
// linger in the table; delete them once per process.
let trySoonFlagCleanupDone = false;
export async function ensureTrySoonFlagCleanup(): Promise<void> {
  if (trySoonFlagCleanupDone) return;
  const client = getClient();
  if (!client) return;
  try {
    await client.execute("DELETE FROM recipe_flags WHERE flag = 'try_soon'");
  } catch (e: unknown) {
    console.warn("ensureTrySoonFlagCleanup:", e instanceof Error ? e.message : String(e));
  }
  trySoonFlagCleanupDone = true;
}


export async function ensureMealPlanBlocksTable(): Promise<void> {
  if (mealPlanBlocksEnsured) return;
  const client = getClient();
  if (!client) return;

  try {
    if ((await existingObjects(client, ["meal_plan_blocks"])).has("meal_plan_blocks")) {
      mealPlanBlocksEnsured = true;
      return;
    }
  } catch (e: unknown) {
    console.warn("ensureMealPlanBlocksTable probe:", e instanceof Error ? e.message : String(e));
    return;
  }

  await runDdl(client, [
    `CREATE TABLE IF NOT EXISTS meal_plan_blocks (
      id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      user_id integer NOT NULL REFERENCES users(id) ON DELETE cascade,
      date text NOT NULL,
      meal_type text NOT NULL,
      note text,
      created_at text NOT NULL
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS meal_plan_blocks_unique_idx ON meal_plan_blocks(user_id, date, meal_type)`,
  ], "ensureMealPlanBlocksTable");

  mealPlanBlocksEnsured = true;
}


export async function ensureRecipePhotoSourceColumns(): Promise<void> {
  if (recipePhotoSourceEnsured) return;
  const client = getClient();
  if (!client) return;

  let cols: Set<string>;
  try {
    cols = await tableColumns(client, "recipe_photos");
  } catch (e: unknown) {
    console.warn("ensureRecipePhotoSourceColumns probe:", e instanceof Error ? e.message : String(e));
    return;
  }

  const statements: string[] = [];
  if (!cols.has("source")) {
    statements.push(`ALTER TABLE recipe_photos ADD COLUMN source text NOT NULL DEFAULT 'upload'`);
  }
  if (!cols.has("source_photo_id")) {
    statements.push(`ALTER TABLE recipe_photos ADD COLUMN source_photo_id integer`);
  }

  await runDdl(client, statements, "ensureRecipePhotoSourceColumns");
  recipePhotoSourceEnsured = true;
}

// Households Slice 1: households / members / activity log / per-member
// blocks, plus the nullable meal_plans.household_id scoping column.
// Mirrors the Drizzle migration 0028_households.sql — keep the DDL and
// index names in sync with it.
export async function ensureHouseholdTables(): Promise<void> {
  if (householdsEnsured) return;
  const client = getClient();
  if (!client) return;

  let existing: Set<string>;
  let mealPlanCols: Set<string>;
  try {
    [existing, mealPlanCols] = await Promise.all([
      existingObjects(client, [
        "households",
        "household_members",
        "household_activity_log",
        "household_member_blocks",
      ]),
      tableColumns(client, "meal_plans"),
    ]);
  } catch (e: unknown) {
    console.warn("ensureHouseholdTables probe:", e instanceof Error ? e.message : String(e));
    return;
  }

  const statements: string[] = [];
  if (!existing.has("households")) {
    statements.push(
      `CREATE TABLE IF NOT EXISTS households (
        id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        name text NOT NULL,
        join_code text NOT NULL UNIQUE,
        created_by integer NOT NULL REFERENCES users(id) ON DELETE cascade,
        deleted_at text,
        created_at text NOT NULL
      )`
    );
  }
  if (!existing.has("household_members")) {
    statements.push(
      `CREATE TABLE IF NOT EXISTS household_members (
        id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        household_id integer NOT NULL REFERENCES households(id) ON DELETE cascade,
        user_id integer NOT NULL REFERENCES users(id) ON DELETE cascade,
        role text NOT NULL,
        joined_at text NOT NULL
      )`,
      `CREATE UNIQUE INDEX IF NOT EXISTS household_members_unique_idx ON household_members(household_id, user_id)`
    );
  }
  if (!existing.has("household_activity_log")) {
    statements.push(
      `CREATE TABLE IF NOT EXISTS household_activity_log (
        id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        household_id integer NOT NULL REFERENCES households(id) ON DELETE cascade,
        user_id integer NOT NULL REFERENCES users(id) ON DELETE cascade,
        action text NOT NULL,
        target_name text,
        created_at text NOT NULL
      )`,
      `CREATE INDEX IF NOT EXISTS household_activity_log_household_idx ON household_activity_log(household_id)`
    );
  }
  if (!existing.has("household_member_blocks")) {
    statements.push(
      `CREATE TABLE IF NOT EXISTS household_member_blocks (
        id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        household_id integer NOT NULL REFERENCES households(id) ON DELETE cascade,
        user_id integer NOT NULL REFERENCES users(id) ON DELETE cascade,
        scope text NOT NULL,
        date text NOT NULL,
        meal_type text NOT NULL DEFAULT '',
        note text,
        created_at text NOT NULL
      )`,
      `CREATE UNIQUE INDEX IF NOT EXISTS household_member_blocks_unique_idx ON household_member_blocks(household_id, user_id, scope, date, meal_type)`
    );
  }
  if (!mealPlanCols.has("household_id")) {
    statements.push(
      `ALTER TABLE meal_plans ADD COLUMN household_id integer REFERENCES households(id) ON DELETE cascade`
    );
  }

  await runDdl(client, statements, "ensureHouseholdTables");
  householdsEnsured = true;
}

// Households Slice 2: shared inventory (inventory.household_id), the
// persisted shared shopping-list state table, and ghost-slot snapshot
// columns on meal_plans. Mirrors drizzle/0029_households_slice2.sql —
// keep the DDL and index names in sync with it.
let householdsSlice2Ensured = false;
export async function ensureHouseholdSlice2Tables(): Promise<void> {
  if (householdsSlice2Ensured) return;
  const client = getClient();
  if (!client) return;

  // Slice 2 depends on the Slice 1 tables (FK targets), so make sure
  // those exist first.
  await ensureHouseholdTables();

  let existing: Set<string>;
  let inventoryCols: Set<string>;
  let mealPlanCols: Set<string>;
  try {
    [existing, inventoryCols, mealPlanCols] = await Promise.all([
      existingObjects(client, ["shopping_list_items"]),
      tableColumns(client, "inventory"),
      tableColumns(client, "meal_plans"),
    ]);
  } catch (e: unknown) {
    console.warn("ensureHouseholdSlice2Tables probe:", e instanceof Error ? e.message : String(e));
    return;
  }

  const statements: string[] = [];
  if (!inventoryCols.has("household_id")) {
    statements.push(
      `ALTER TABLE inventory ADD COLUMN household_id integer REFERENCES households(id) ON DELETE cascade`
    );
  }
  if (!mealPlanCols.has("ghost_title")) {
    statements.push(`ALTER TABLE meal_plans ADD COLUMN ghost_title text`);
  }
  if (!mealPlanCols.has("ghost_yield")) {
    statements.push(`ALTER TABLE meal_plans ADD COLUMN ghost_yield text`);
  }
  if (!mealPlanCols.has("ghosted_at")) {
    statements.push(`ALTER TABLE meal_plans ADD COLUMN ghosted_at text`);
  }
  if (!existing.has("shopping_list_items")) {
    statements.push(
      `CREATE TABLE IF NOT EXISTS shopping_list_items (
        id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        household_id integer REFERENCES households(id) ON DELETE cascade,
        user_id integer REFERENCES users(id) ON DELETE cascade,
        item_key text NOT NULL,
        name text NOT NULL,
        category text,
        unit text DEFAULT '' NOT NULL,
        quantity real,
        approximate integer DEFAULT 0 NOT NULL,
        source text DEFAULT 'generated' NOT NULL,
        catalog_ingredient_id integer REFERENCES ingredient_catalog(id),
        ticked_by integer REFERENCES users(id),
        ticked_at text,
        moved_by integer REFERENCES users(id),
        moved_at text,
        created_at text NOT NULL
      )`,
      `CREATE UNIQUE INDEX IF NOT EXISTS shopping_list_items_unique_idx ON shopping_list_items(household_id, item_key)`
    );
  }

  await runDdl(client, statements, "ensureHouseholdSlice2Tables");
  householdsSlice2Ensured = true;
}
