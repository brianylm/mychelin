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
//
// All probes on an isolate share one schema snapshot (object names plus
// every table's columns, fetched in a single batch), so a cold route with
// several ensures pays one probe round trip instead of one per ensure.
// The snapshot is dropped after any DDL so later probes see the change.

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
let recipeDishTypesEnsured = false;
let mealPlanBlocksEnsured = false;
let recipePhotoSourceEnsured = false;
let householdsEnsured = false;
let householdsSlice3Ensured = false;
let mealPilotEnsured = false;

let _client: Client | null = null;

function getClient(): Client | null {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url) return null;
  if (!_client) _client = createClient({ url, authToken });
  return _client;
}

interface SchemaSnapshot {
  objects: Set<string>;
  columns: Map<string, Set<string>>;
}

let _snapshot: Promise<SchemaSnapshot | null> | null = null;

// One round trip for the whole schema. Resolves null when the batch fails
// (callers then fall back to their own targeted probe queries).
function schemaSnapshot(client: Client): Promise<SchemaSnapshot | null> {
  if (!_snapshot) {
    _snapshot = client
      .batch(
        [
          "SELECT name FROM sqlite_master",
          "SELECT m.name AS tbl, p.name AS col FROM sqlite_master m JOIN pragma_table_info(m.name) p WHERE m.type = 'table'",
        ],
        "read"
      )
      .then(([objectRes, columnRes]) => {
        const objects = new Set(objectRes.rows.map((row) => String(row.name)));
        const columns = new Map<string, Set<string>>();
        for (const row of columnRes.rows) {
          const table = String(row.tbl);
          let cols = columns.get(table);
          if (!cols) columns.set(table, (cols = new Set()));
          cols.add(String(row.col));
        }
        return { objects, columns };
      })
      .catch((e: unknown) => {
        console.warn("schemaSnapshot:", e instanceof Error ? e.message : String(e));
        return null;
      });
  }
  return _snapshot;
}

// Which of these tables/indexes already exist?
async function existingObjects(client: Client, names: string[]): Promise<Set<string>> {
  const snapshot = await schemaSnapshot(client);
  if (snapshot) return new Set(names.filter((name) => snapshot.objects.has(name)));
  const placeholders = names.map(() => "?").join(",");
  const res = await client.execute({
    sql: `SELECT name FROM sqlite_master WHERE name IN (${placeholders})`,
    args: names,
  });
  return new Set(res.rows.map((row) => String(row.name)));
}

// Column names of a table. Table names are code
// constants, never user input, so identifier interpolation is safe.
async function tableColumns(client: Client, table: string): Promise<Set<string>> {
  const snapshot = await schemaSnapshot(client);
  if (snapshot) return new Set(snapshot.columns.get(table) ?? []);
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
  if (statements.length > 0) _snapshot = null;
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

export async function ensureRecipeDishTypesTable(): Promise<void> {
  if (recipeDishTypesEnsured) return;
  const client = getClient();
  if (!client) return;

  try {
    if ((await existingObjects(client, ["recipe_dish_types"])).has("recipe_dish_types")) {
      recipeDishTypesEnsured = true;
      return;
    }
  } catch (e: unknown) {
    console.warn("ensureRecipeDishTypesTable probe:", e instanceof Error ? e.message : String(e));
    return;
  }

  await runDdl(client, [
    `CREATE TABLE IF NOT EXISTS recipe_dish_types (
      recipe_id integer PRIMARY KEY NOT NULL REFERENCES recipes(id) ON DELETE cascade,
      dish_types text NOT NULL,
      updated_at text NOT NULL
    )`,
  ], "ensureRecipeDishTypesTable");

  recipeDishTypesEnsured = true;
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

export async function ensureHouseholdSlice3Columns(): Promise<void> {
  if (householdsSlice3Ensured) return;
  const client = getClient();
  if (!client) return;

  // Slice 3 columns live on recipes; the household tables are already
  // ensured by Slice 1/2 paths that callers run first, but the FK targets
  // (households, users) must exist, so ensure the base household tables.
  await ensureHouseholdTables();

  let recipeCols: Set<string>;
  try {
    recipeCols = await tableColumns(client, "recipes");
  } catch (e: unknown) {
    console.warn("ensureHouseholdSlice3Columns probe:", e instanceof Error ? e.message : String(e));
    return;
  }

  const statements: string[] = [];
  if (!recipeCols.has("shared_to_household_at")) {
    statements.push(`ALTER TABLE recipes ADD COLUMN shared_to_household_at text`);
  }
  if (!recipeCols.has("shared_to_household_by")) {
    statements.push(
      `ALTER TABLE recipes ADD COLUMN shared_to_household_by integer REFERENCES users(id)`
    );
  }

  await runDdl(client, statements, "ensureHouseholdSlice3Columns");
  householdsSlice3Ensured = true;
}

// Multi-dish meals and prepared batches. This mirrors migration 0032. Keep
// it on every route that lets Drizzle select complete meal_plans rows because
// those selects include the new nullable columns even for legacy behavior.
export async function ensureMealPilotTables(): Promise<void> {
  if (mealPilotEnsured) return;
  const client = getClient();
  if (!client) return;

  await Promise.all([ensureHouseholdTables(), ensureRecipeAttemptsTable()]);

  const objectNames = [
    "meal_groups",
    "prepared_batches",
    "prepared_lots",
    "prepared_reservations",
    "meal_confirmation_commands",
    "meal_fresh_effects",
    "meal_station_assignments",
    "meal_conflicts",
    "calendar_connections",
    "calendar_activities",
    "calendar_shares",
    "calendar_sync_jobs",
  ];
  let existing: Set<string>;
  let mealPlanCols: Set<string>;
  let calendarJobCols: Set<string>;
  try {
    [existing, mealPlanCols, calendarJobCols] = await Promise.all([
      existingObjects(client, objectNames),
      tableColumns(client, "meal_plans"),
      tableColumns(client, "calendar_sync_jobs"),
    ]);
  } catch (e: unknown) {
    console.warn("ensureMealPilotTables probe:", e instanceof Error ? e.message : String(e));
    return;
  }

  const statements: string[] = [];
  if (!existing.has("meal_groups")) {
    statements.push(
      `CREATE TABLE IF NOT EXISTS meal_groups (
        id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        user_id integer NOT NULL REFERENCES users(id) ON DELETE cascade,
        household_id integer REFERENCES households(id) ON DELETE cascade,
        date text NOT NULL,
        meal_type text NOT NULL,
        serve_at text NOT NULL,
        timezone text NOT NULL,
        diner_count integer NOT NULL,
        duration_override_minutes integer,
        defrost_at_override text,
        status text NOT NULL DEFAULT 'planned',
        confirmed_at text,
        confirmed_by integer REFERENCES users(id) ON DELETE set null,
        revision integer NOT NULL DEFAULT 1,
        created_at text NOT NULL,
        updated_at text NOT NULL
      )`,
      `CREATE INDEX IF NOT EXISTS meal_groups_user_date_idx ON meal_groups(user_id, date)`,
      `CREATE INDEX IF NOT EXISTS meal_groups_household_date_idx ON meal_groups(household_id, date)`
    );
  }
  if (!mealPlanCols.has("meal_group_id")) {
    statements.push(
      `ALTER TABLE meal_plans ADD COLUMN meal_group_id integer REFERENCES meal_groups(id) ON DELETE set null`
    );
  }
  if (!mealPlanCols.has("target_portions")) {
    statements.push(`ALTER TABLE meal_plans ADD COLUMN target_portions real`);
  }
  if (!mealPlanCols.has("planned_output_fridge")) {
    statements.push(`ALTER TABLE meal_plans ADD COLUMN planned_output_fridge real`);
  }
  if (!mealPlanCols.has("planned_output_freezer")) {
    statements.push(`ALTER TABLE meal_plans ADD COLUMN planned_output_freezer real`);
  }
  if (!existing.has("prepared_batches")) {
    statements.push(
      `CREATE TABLE IF NOT EXISTS prepared_batches (
        id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        user_id integer NOT NULL REFERENCES users(id) ON DELETE cascade,
        household_id integer REFERENCES households(id) ON DELETE cascade,
        recipe_id integer REFERENCES recipes(id) ON DELETE set null,
        title text NOT NULL,
        cooked_at text,
        notes text,
        revision integer NOT NULL DEFAULT 1,
        created_at text NOT NULL,
        updated_at text NOT NULL
      )`,
      `CREATE INDEX IF NOT EXISTS prepared_batches_user_idx ON prepared_batches(user_id)`,
      `CREATE INDEX IF NOT EXISTS prepared_batches_household_idx ON prepared_batches(household_id)`
    );
  }
  if (!existing.has("prepared_lots")) {
    statements.push(
      `CREATE TABLE IF NOT EXISTS prepared_lots (
        id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        batch_id integer NOT NULL REFERENCES prepared_batches(id) ON DELETE cascade,
        storage text NOT NULL,
        physical_portions real NOT NULL,
        use_by_date text,
        revision integer NOT NULL DEFAULT 1,
        created_at text NOT NULL,
        updated_at text NOT NULL
      )`,
      `CREATE INDEX IF NOT EXISTS prepared_lots_batch_idx ON prepared_lots(batch_id)`
    );
  }
  if (!existing.has("prepared_reservations")) {
    statements.push(
      `CREATE TABLE IF NOT EXISTS prepared_reservations (
        id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        meal_group_id integer NOT NULL REFERENCES meal_groups(id) ON DELETE cascade,
        lot_id integer NOT NULL REFERENCES prepared_lots(id) ON DELETE restrict,
        source_storage text NOT NULL,
        planned_portions real NOT NULL,
        consumed_portions real NOT NULL DEFAULT 0,
        status text NOT NULL DEFAULT 'reserved',
        reheat_notes text,
        idempotency_key text NOT NULL UNIQUE,
        created_at text NOT NULL,
        updated_at text NOT NULL
      )`,
      `CREATE UNIQUE INDEX IF NOT EXISTS prepared_reservations_meal_lot_idx ON prepared_reservations(meal_group_id, lot_id)`,
      `CREATE INDEX IF NOT EXISTS prepared_reservations_lot_idx ON prepared_reservations(lot_id, status)`
    );
  }
  if (!existing.has("meal_confirmation_commands")) {
    statements.push(
      `CREATE TABLE IF NOT EXISTS meal_confirmation_commands (
        id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        meal_group_id integer NOT NULL REFERENCES meal_groups(id) ON DELETE cascade,
        user_id integer NOT NULL REFERENCES users(id) ON DELETE cascade,
        idempotency_key text NOT NULL UNIQUE,
        kind text NOT NULL,
        payload text NOT NULL,
        reverses_command_id integer,
        applied_at text NOT NULL
      )`,
      `CREATE INDEX IF NOT EXISTS meal_confirmation_commands_meal_idx ON meal_confirmation_commands(meal_group_id)`
    );
  }
  if (!existing.has("meal_fresh_effects")) {
    statements.push(
      `CREATE TABLE IF NOT EXISTS meal_fresh_effects (
        id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        meal_group_id integer NOT NULL REFERENCES meal_groups(id) ON DELETE cascade,
        meal_plan_id integer NOT NULL UNIQUE REFERENCES meal_plans(id) ON DELETE cascade,
        recipe_attempt_id integer REFERENCES recipe_attempts(id) ON DELETE set null,
        prepared_batch_id integer REFERENCES prepared_batches(id) ON DELETE set null,
        effect_snapshot text NOT NULL,
        applied_at text NOT NULL
      )`,
      `CREATE INDEX IF NOT EXISTS meal_fresh_effects_group_idx ON meal_fresh_effects(meal_group_id)`
    );
  }
  if (!existing.has("meal_station_assignments")) {
    statements.push(
      `CREATE TABLE IF NOT EXISTS meal_station_assignments (
        id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        meal_group_id integer NOT NULL REFERENCES meal_groups(id) ON DELETE cascade,
        meal_plan_id integer REFERENCES meal_plans(id) ON DELETE cascade,
        reservation_id integer REFERENCES prepared_reservations(id) ON DELETE cascade,
        instruction_id integer REFERENCES instructions(id) ON DELETE set null,
        station_name text NOT NULL,
        start_offset_minutes integer,
        duration_minutes integer,
        created_at text NOT NULL
      )`,
      `CREATE INDEX IF NOT EXISTS meal_station_assignments_group_idx ON meal_station_assignments(meal_group_id)`
    );
  }
  if (!existing.has("meal_conflicts")) {
    statements.push(
      `CREATE TABLE IF NOT EXISTS meal_conflicts (
        id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        meal_group_id integer NOT NULL REFERENCES meal_groups(id) ON DELETE cascade,
        kind text NOT NULL,
        message text NOT NULL,
        details text,
        resolved_at text,
        detected_at text NOT NULL
      )`,
      `CREATE INDEX IF NOT EXISTS meal_conflicts_open_idx ON meal_conflicts(meal_group_id, resolved_at)`
    );
  }
  if (!existing.has("calendar_connections")) {
    statements.push(
      `CREATE TABLE IF NOT EXISTS calendar_connections (
        id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        user_id integer NOT NULL REFERENCES users(id) ON DELETE cascade,
        household_id integer REFERENCES households(id) ON DELETE cascade,
        google_account_email text NOT NULL,
        granted_scopes text NOT NULL,
        calendar_id text NOT NULL,
        calendar_name text NOT NULL,
        calendar_timezone text NOT NULL,
        status text NOT NULL DEFAULT 'connected',
        access_token_ciphertext text,
        access_token_iv text,
        refresh_token_ciphertext text NOT NULL,
        refresh_token_iv text NOT NULL,
        access_token_expires_at text,
        token_invalidated_at text,
        sync_token text,
        watch_channel_id text,
        watch_resource_id text,
        watch_token_hash text,
        watch_expires_at text,
        last_synced_at text,
        last_error text,
        disconnected_at text,
        revision integer NOT NULL DEFAULT 1,
        created_at text NOT NULL,
        updated_at text NOT NULL
      )`,
      `CREATE UNIQUE INDEX IF NOT EXISTS calendar_connections_active_household_idx ON calendar_connections(household_id) WHERE household_id IS NOT NULL AND disconnected_at IS NULL`,
      `CREATE UNIQUE INDEX IF NOT EXISTS calendar_connections_active_solo_idx ON calendar_connections(user_id) WHERE household_id IS NULL AND disconnected_at IS NULL`
    );
  }
  if (!existing.has("calendar_activities")) {
    statements.push(
      `CREATE TABLE IF NOT EXISTS calendar_activities (
        id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        connection_id integer NOT NULL REFERENCES calendar_connections(id) ON DELETE cascade,
        meal_group_id integer NOT NULL REFERENCES meal_groups(id) ON DELETE cascade,
        kind text NOT NULL,
        google_event_id text,
        google_etag text,
        start_at text,
        end_at text,
        explicit_duration_minutes integer,
        state text NOT NULL DEFAULT 'pending',
        desired_revision integer NOT NULL DEFAULT 0,
        synced_revision integer NOT NULL DEFAULT 0,
        source_meal_revision integer NOT NULL DEFAULT 0,
        deleted_externally_at text,
        last_error text,
        updated_at text NOT NULL
      )`,
      `CREATE UNIQUE INDEX IF NOT EXISTS calendar_activities_connection_meal_kind_idx ON calendar_activities(connection_id, meal_group_id, kind)`,
      `CREATE INDEX IF NOT EXISTS calendar_activities_meal_idx ON calendar_activities(meal_group_id)`
    );
  }
  if (!existing.has("calendar_shares")) {
    statements.push(
      `CREATE TABLE IF NOT EXISTS calendar_shares (
        id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        connection_id integer NOT NULL REFERENCES calendar_connections(id) ON DELETE cascade,
        user_id integer NOT NULL REFERENCES users(id) ON DELETE cascade,
        email text NOT NULL,
        google_acl_rule_id text,
        status text NOT NULL DEFAULT 'pending',
        last_error text,
        created_at text NOT NULL,
        updated_at text NOT NULL
      )`,
      `CREATE UNIQUE INDEX IF NOT EXISTS calendar_shares_connection_user_idx ON calendar_shares(connection_id, user_id)`,
      `CREATE INDEX IF NOT EXISTS calendar_shares_connection_status_idx ON calendar_shares(connection_id, status)`
    );
  }
  if (!existing.has("calendar_sync_jobs")) {
    statements.push(
      `CREATE TABLE IF NOT EXISTS calendar_sync_jobs (
        id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        connection_id integer NOT NULL REFERENCES calendar_connections(id) ON DELETE cascade,
        meal_group_id integer REFERENCES meal_groups(id) ON DELETE cascade,
        share_id integer REFERENCES calendar_shares(id) ON DELETE cascade,
        kind text,
        action text NOT NULL,
        dedupe_key text NOT NULL UNIQUE,
        status text NOT NULL DEFAULT 'pending',
        attempts integer NOT NULL DEFAULT 0,
        not_before text NOT NULL,
        leased_at text,
        lease_token text,
        last_error text,
        created_at text NOT NULL,
        updated_at text NOT NULL
      )`,
      `CREATE INDEX IF NOT EXISTS calendar_sync_jobs_due_idx ON calendar_sync_jobs(status, not_before)`,
      `CREATE INDEX IF NOT EXISTS calendar_sync_jobs_share_idx ON calendar_sync_jobs(share_id)`
    );
  } else if (!calendarJobCols.has("share_id")) {
    statements.push(
      `ALTER TABLE calendar_sync_jobs ADD COLUMN share_id integer REFERENCES calendar_shares(id) ON DELETE cascade`,
      `CREATE INDEX IF NOT EXISTS calendar_sync_jobs_share_idx ON calendar_sync_jobs(share_id)`
    );
  }

  // Production gets these tables only through the reviewed 0032 rollout
  // (docs/work-packets/meal-calendar-operator-setup.md), never as a side
  // effect of someone opening Plan or Shopping. Previews/staging are free.
  if (
    statements.length > 0 &&
    process.env.VERCEL_ENV === "production" &&
    process.env.MEAL_PILOT_SCHEMA_APPROVED !== "true"
  ) {
    throw new Error(
      "Meal pilot schema changes are not approved for production: apply migration 0032 or set MEAL_PILOT_SCHEMA_APPROVED=true."
    );
  }

  await runDdl(client, statements, "ensureMealPilotTables");
  mealPilotEnsured = true;
}
