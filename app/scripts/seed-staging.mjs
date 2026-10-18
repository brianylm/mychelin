#!/usr/bin/env node
// Rebuilds the mychelin-staging Turso database (used by CI e2e and Vercel
// previews) from production: production's exact schema, plus ONE account's
// data. Other users' data never leaves production. Re-run it any time to
// reset staging.
//
//   SOURCE_TURSO_DATABASE_URL / SOURCE_TURSO_AUTH_TOKEN  production (use a
//     read-only token: turso db tokens create mychelin --read-only)
//   STAGING_TURSO_DATABASE_URL / STAGING_TURSO_AUTH_TOKEN  staging
//   SEED_USER_ID     the account to copy (default 1)
//   STAGING_PASSWORD password for the staging login (printed if generated)
//
// The copied account's email becomes owner@staging.mychelin.test. Share
// links, push subscriptions, notification jobs, password-reset tokens,
// analytics and feedback are never copied: they would make real links work
// or send real notifications from a preview.

import { randomBytes } from "node:crypto";
import { createClient } from "@libsql/client";
import bcrypt from "bcryptjs";

const PRODUCTION_DB = /\/\/mychelin-brianylm\./;
const STAGING_EMAIL = "owner@staging.mychelin.test";

function env(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

const stagingUrl = env("STAGING_TURSO_DATABASE_URL");
if (PRODUCTION_DB.test(stagingUrl)) {
  throw new Error("Refusing to use the production database as the staging target.");
}
const source = createClient({
  url: env("SOURCE_TURSO_DATABASE_URL"),
  authToken: env("SOURCE_TURSO_AUTH_TOKEN"),
});
const staging = createClient({ url: stagingUrl, authToken: env("STAGING_TURSO_AUTH_TOKEN") });
const userId = Number(process.env.SEED_USER_ID ?? 1);
const password = process.env.STAGING_PASSWORD ?? randomBytes(9).toString("base64url");

async function rows(sql, args = []) {
  const result = await source.execute({ sql, args });
  return result.rows.map((row) => Object.fromEntries(result.columns.map((col) => [col, row[col]])));
}
const ids = (list) => new Set(list.map((row) => Number(row.id)));
const keep = (set) => (value) => (value != null && set.has(Number(value)) ? value : null);

// ── 1. Schema: drop everything in staging, recreate production's DDL ──
const ddl = await rows(
  "select type, name, sql from sqlite_master where sql is not null and name not like 'sqlite_%'"
);
const existing = (
  await staging.execute(
    "select type, name from sqlite_master where name not like 'sqlite_%' and type in ('table','view','trigger')"
  )
).rows;
await staging.execute("PRAGMA foreign_keys = OFF");
for (const { type, name } of existing) {
  await staging.execute(`DROP ${type.toUpperCase()} IF EXISTS "${name}"`);
}
const order = { table: 0, index: 1, view: 2, trigger: 3 };
for (const { sql } of [...ddl].sort((a, b) => order[a.type] - order[b.type])) {
  await staging.execute(sql);
}

// ── 2. Select the account's rows, parents first ──
const copied = {};
async function copy(table, list, transform = (row) => row) {
  copied[table] = list.length;
  for (const original of list) {
    const row = transform({ ...original });
    const cols = Object.keys(row);
    await staging.execute({
      sql: `INSERT INTO "${table}" (${cols.map((c) => `"${c}"`).join(",")}) VALUES (${cols.map(() => "?").join(",")})`,
      args: cols.map((c) => row[c]),
    });
  }
}

const [user] = await rows("select * from users where id = ?", [userId]);
if (!user) throw new Error(`No user ${userId} in the source database`);
await copy("users", [user], (row) => ({
  ...row,
  email: STAGING_EMAIL,
  password_hash: bcrypt.hashSync(password, 10),
  auth_provider: "password",
  google_sub: null,
  avatar_url: null,
}));

await copy("ingredient_catalog", await rows("select * from ingredient_catalog"));
await copy("__drizzle_migrations", await rows("select * from __drizzle_migrations"));
await copy("schema_migrations", await rows("select * from schema_migrations"));

const memberships = await rows("select * from household_members where user_id = ?", [userId]);
const households = await rows(
  `select * from households where id in (select household_id from household_members where user_id = ?)`,
  [userId]
);
const householdIds = ids(households);
const inHousehold = keep(householdIds);
await copy("households", households, (row) => ({ ...row, created_by: userId }));
await copy("household_members", memberships);
const ownHousehold = (row) => householdIds.has(Number(row.household_id));
await copy(
  "household_activity_log",
  (await rows("select * from household_activity_log where user_id = ?", [userId])).filter(ownHousehold)
);
await copy(
  "household_member_blocks",
  (await rows("select * from household_member_blocks where user_id = ?", [userId])).filter(ownHousehold)
);

const books = await rows("select * from books where created_by = ?", [userId]);
const bookIds = ids(books);
await copy("books", books);

const recipes = await rows("select * from recipes where user_id = ?", [userId]);
const recipeIds = ids(recipes);
const recipeArgs = [...recipeIds];
const inRecipes = `(${recipeArgs.map(() => "?").join(",") || "null"})`;
await copy("recipes", recipes, (row) => ({
  ...row,
  book_id: keep(bookIds)(row.book_id),
  forked_from: keep(recipeIds)(row.forked_from),
  shared_to_household_by: row.shared_to_household_by === userId ? userId : null,
  shared_to_household_at: row.shared_to_household_by === userId ? row.shared_to_household_at : null,
}));

for (const table of ["ingredients", "instructions", "recipe_photos", "voice_recordings"]) {
  await copy(table, await rows(`select * from ${table} where recipe_id in ${inRecipes}`, recipeArgs));
}
const versions = await rows(
  `select * from recipe_versions where recipe_id in ${inRecipes}`,
  recipeArgs
);
await copy("recipe_versions", versions, (row) => ({
  ...row,
  changed_by: row.changed_by === userId ? userId : null,
}));
const inVersions = keep(ids(versions));

const book = (sql) => rows(sql.replace("$BOOKS", `(${[...bookIds].map(() => "?").join(",") || "null"})`), [...bookIds]);
await copy("book_members", (await book("select * from book_members where book_id in $BOOKS")).filter((r) => r.user_id === userId));
await copy(
  "book_recipes",
  (await book("select * from book_recipes where book_id in $BOOKS")).filter(
    (r) => r.added_by === userId && recipeIds.has(Number(r.recipe_id))
  )
);
await copy("book_tips", (await book("select * from book_tips where book_id in $BOOKS")).filter((r) => r.added_by === userId));
await copy("book_activity_log", (await book("select * from book_activity_log where book_id in $BOOKS")).filter((r) => r.user_id === userId));

const plans = await rows(
  `select * from meal_plans where user_id = ? and recipe_id in ${inRecipes}`,
  [userId, ...recipeArgs]
);
await copy("meal_plans", plans, (row) => ({ ...row, household_id: inHousehold(row.household_id) }));
const inPlans = keep(ids(plans));
await copy("meal_plan_blocks", await rows("select * from meal_plan_blocks where user_id = ?", [userId]));

const attempts = await rows(
  `select * from recipe_attempts where user_id = ? and recipe_id in ${inRecipes}`,
  [userId, ...recipeArgs]
);
await copy("recipe_attempts", attempts, (row) => ({
  ...row,
  version_id: inVersions(row.version_id),
  promoted_version_id: inVersions(row.promoted_version_id),
  meal_plan_id: inPlans(row.meal_plan_id),
}));
const inAttempts = keep(ids(attempts));
await copy(
  "recipe_next_tries",
  await rows(`select * from recipe_next_tries where user_id = ? and recipe_id in ${inRecipes}`, [userId, ...recipeArgs]),
  (row) => ({
    ...row,
    source_attempt_id: inAttempts(row.source_attempt_id),
    source_version_id: inVersions(row.source_version_id),
    promoted_version_id: inVersions(row.promoted_version_id),
  })
);
await copy(
  "recipe_flags",
  await rows(`select * from recipe_flags where user_id = ? and recipe_id in ${inRecipes}`, [userId, ...recipeArgs])
);

await copy("inventory", await rows("select * from inventory where user_id = ?", [userId]), (row) => ({
  ...row,
  household_id: inHousehold(row.household_id),
}));
await copy(
  "shopping_list_items",
  await rows("select * from shopping_list_items where user_id = ?", [userId]),
  (row) => ({
    ...row,
    household_id: inHousehold(row.household_id),
    ticked_by: row.ticked_by === userId ? userId : null,
    moved_by: row.moved_by === userId ? userId : null,
  })
);
await copy(
  "notification_preferences",
  await rows("select * from notification_preferences where user_id = ?", [userId])
);

await staging.execute("PRAGMA foreign_keys = ON");
const violations = (await staging.execute("PRAGMA foreign_key_check")).rows;
if (violations.length) {
  console.error("Foreign key violations:", violations.slice(0, 10));
  process.exit(1);
}

console.log("Staging rebuilt from production schema + one account:");
for (const [table, count] of Object.entries(copied)) if (count) console.log(`  ${table}: ${count}`);
console.log(`Login: ${STAGING_EMAIL}`);
if (!process.env.STAGING_PASSWORD) console.log(`Password: ${password}`);
