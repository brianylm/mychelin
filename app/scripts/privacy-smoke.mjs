#!/usr/bin/env node

/**
 * Two-user privacy smoke test for Mychelin.
 *
 * Runs against a deployed or local Mychelin URL and verifies that User A
 * cannot read or mutate User B's private recipes, books, meal plans,
 * attempts, versions, activity, inventory, shopping lists, pilot feedback,
 * or admin analytics. Also verifies book viewers cannot mutate shared
 * definitive recipe state.
 *
 * Usage:
 *   MYCHELIN_BASE_URL=https://mychelin-sg.vercel.app npm run smoke:privacy
 *
 * Optional synthetic user cleanup:
 *   MYCHELIN_CLEANUP_USERS=1 TURSO_DATABASE_URL=... TURSO_AUTH_TOKEN=... npm run smoke:privacy
 */

import { existsSync, readFileSync } from "node:fs";
import { createClient } from "@libsql/client";
import bcrypt from "bcryptjs";

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  const lines = readFileSync(path, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key] !== undefined) continue;
    let value = rawValue.trim();
    if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

const BASE_URL = (process.env.MYCHELIN_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const PASSWORD = "PrivacySmoke123!";
const RUN_ID = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
const USER_A_EMAIL = `privacy-smoke-a-${RUN_ID}@example.com`;
const USER_B_EMAIL = `privacy-smoke-b-${RUN_ID}@example.com`;

const cleanupTasks = [];
const results = [];

function ok(message) {
  results.push({ ok: true, message });
  console.log(`PASS ${message}`);
}

function fail(message, detail) {
  const suffix = detail ? `: ${detail}` : "";
  throw new Error(`${message}${suffix}`);
}

function assert(condition, message, detail) {
  if (!condition) fail(message, detail);
  ok(message);
}

function yyyyMmDd(date) {
  return date.toISOString().slice(0, 10);
}

function authCookieFrom(response) {
  const getSetCookie = response.headers.getSetCookie?.bind(response.headers);
  const values = getSetCookie ? getSetCookie() : [response.headers.get("set-cookie")].filter(Boolean);
  const tokenCookie = values.find((value) => value.startsWith("mychelin_token="));
  return tokenCookie ? tokenCookie.split(";")[0] : "";
}

class Session {
  constructor(label) {
    this.label = label;
    this.cookie = "";
  }

  async request(path, options = {}) {
    const headers = new Headers(options.headers || {});
    if (this.cookie) headers.set("Cookie", this.cookie);
    if (options.json !== undefined) headers.set("Content-Type", "application/json");

    const response = await fetch(BASE_URL + path, {
      ...options,
      headers,
      body: options.json !== undefined ? JSON.stringify(options.json) : options.body,
    });

    const cookie = authCookieFrom(response);
    if (cookie) this.cookie = cookie;
    return response;
  }

  async json(path, options = {}) {
    const response = await this.request(path, options);
    const text = await response.text();
    let body = null;
    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        body = text;
      }
    }
    return { response, body };
  }
}

async function expectStatus(session, path, expected, options = {}) {
  const { response, body } = await session.json(path, options);
  const expectedList = Array.isArray(expected) ? expected : [expected];
  assert(
    expectedList.includes(response.status),
    `${session.label} ${options.method || "GET"} ${path} returns ${expectedList.join("/")}`,
    `got ${response.status} ${JSON.stringify(body).slice(0, 240)}`
  );
  return body;
}

function tursoClientOrNull() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url || !authToken) return null;
  return createClient({ url, authToken });
}

async function seedSyntheticUser(email, name) {
  const client = tursoClientOrNull();
  if (!client) return false;
  const passwordHash = await bcrypt.hash(PASSWORD, 12);
  await client.execute({
    sql: "insert or ignore into users (name, email, password_hash, auth_provider, email_verified, created_at) values (?, ?, ?, 'password', 1, ?)",
    args: [name, email, passwordHash, new Date().toISOString()],
  });
  return true;
}

async function login(session, email, name) {
  const { response, body } = await session.json("/api/auth/login", {
    method: "POST",
    json: { email, password: PASSWORD },
  });
  assert(response.status === 200, `${name} can log in`, JSON.stringify(body));
  assert(Boolean(session.cookie), `${name} receives auth cookie`);
}

async function signup(session, email, name) {
  const { response, body } = await session.json("/api/auth/signup", {
    method: "POST",
    json: { email, password: PASSWORD, name },
  });

  if (response.status === 429 && await seedSyntheticUser(email, name)) {
    ok(`${name} seeded directly after signup rate limit`);
    await login(session, email, name);
    return;
  }

  assert(response.status === 201 || response.status === 200, `${name} can sign up`, JSON.stringify(body));
  assert(Boolean(session.cookie), `${name} receives auth cookie`);
}

async function createRecipe(session, ownerLabel, overrides = {}) {
  const uniqueIngredient = `privacy-${ownerLabel}-${RUN_ID}`;
  const { response, body } = await session.json("/api/recipes", {
    method: "POST",
    json: {
      title: `Privacy ${ownerLabel} recipe ${RUN_ID}`,
      description: "Synthetic privacy smoke recipe",
      ingredients: [{ name: uniqueIngredient, quantity: 1, unit: "pc", notes: "" }],
      instructions: [{ content: `Cook ${uniqueIngredient}`, tip: "" }],
      ...overrides,
    },
  });
  assert(response.status === 201, `${ownerLabel} can create recipe`, JSON.stringify(body));
  cleanupTasks.push(() => session.request(`/api/recipes/${body.id}`, { method: "DELETE" }));
  return { ...body, uniqueIngredient };
}

async function createBook(session, ownerLabel) {
  const { response, body } = await session.json("/api/books", {
    method: "POST",
    json: {
      title: `Privacy ${ownerLabel} book ${RUN_ID}`,
      description: "Synthetic privacy smoke book",
    },
  });
  assert(response.status === 201, `${ownerLabel} can create book`, JSON.stringify(body));
  cleanupTasks.push(() => session.request(`/api/books/${body.id}`, { method: "DELETE" }));
  return body;
}

async function createMealPlan(session, recipeId, ownerLabel) {
  const date = yyyyMmDd(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000));
  const { response, body } = await session.json("/api/meal-plans", {
    method: "POST",
    json: { date, mealType: "dinner", recipeId, servings: 1, notes: `Privacy ${ownerLabel}` },
  });
  assert(response.status === 201, `${ownerLabel} can create meal plan`, JSON.stringify(body));
  cleanupTasks.push(() => session.request(`/api/meal-plans/${body.id}`, { method: "DELETE" }));
  return body;
}

async function createInventoryItem(session, ownerLabel) {
  const uniqueName = `privacy-inventory-${ownerLabel}-${RUN_ID}`;
  const { response, body } = await session.json("/api/inventory", {
    method: "POST",
    json: { name: uniqueName, quantity: 2, unit: "pc", location: "pantry" },
  });
  assert(response.status === 201, `${ownerLabel} can create inventory item`, JSON.stringify(body));
  cleanupTasks.push(() => session.request(`/api/inventory/${body.id}`, { method: "DELETE" }));
  return { ...body, uniqueName };
}

async function cleanupUsers() {
  if (process.env.MYCHELIN_CLEANUP_USERS !== "1") return;
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url || !authToken) {
    console.warn("WARN user cleanup requested but TURSO_DATABASE_URL/TURSO_AUTH_TOKEN are missing");
    return;
  }
  const db = createClient({ url, authToken });
  await db.execute({ sql: "delete from users where email like 'privacy-smoke-%@example.com'", args: [] });
  console.log("PASS synthetic privacy-smoke users deleted from Turso");
}

async function main() {
  console.log(`Privacy smoke target: ${BASE_URL}`);
  console.log(`Run id: ${RUN_ID}`);

  const userA = new Session("User A");
  const userB = new Session("User B");

  await signup(userA, USER_A_EMAIL, "Privacy Smoke A");
  await signup(userB, USER_B_EMAIL, "Privacy Smoke B");

  const recipeA = await createRecipe(userA, "A");
  const recipeB = await createRecipe(userB, "B");
  const bookA = await createBook(userA, "A");
  const bookB = await createBook(userB, "B");

  await expectStatus(userA, `/api/recipes/${recipeB.id}`, 404);
  await expectStatus(userA, `/api/recipes?id=${recipeB.id}`, 404);
  await expectStatus(userA, "/api/share", 404, {
    method: "POST",
    json: { resourceType: "recipe", resourceId: recipeB.id, permission: "view" },
  });

  const search = await expectStatus(userA, `/api/recipes/search?q=${encodeURIComponent(recipeB.uniqueIngredient)}`, 200);
  assert(Array.isArray(search.results), "User A recipe search returns result array");
  assert(search.results.length === 0, "User A search cannot find User B unique ingredient");

  await expectStatus(userA, `/api/books/${bookB.id}`, [403, 404]);
  await expectStatus(userA, `/api/books/${bookB.id}/recipes`, [403, 404]);
  await expectStatus(userA, `/api/books/${bookB.id}/analyze-principles`, 404, { method: "POST" });

  await expectStatus(userB, `/api/books/${bookB.id}/members`, 201, {
    method: "POST",
    json: { email: USER_A_EMAIL, role: "viewer" },
  });
  const sharedRecipeB = await createRecipe(userB, "B-shared", {
    bookId: bookB.id,
    title: `Privacy shared recipe ${RUN_ID}`,
  });
  const sharedBook = await expectStatus(userA, `/api/books/${bookB.id}`, 200);
  assert(sharedBook.id === bookB.id, "User A viewer can read shared book metadata");
  const sharedBookRecipes = await expectStatus(userA, `/api/books/${bookB.id}/recipes`, 200);
  assert(Array.isArray(sharedBookRecipes), "User A viewer can list shared book recipes");
  assert(sharedBookRecipes.some((recipe) => recipe.id === sharedRecipeB.id), "User A viewer sees intended shared recipe");
  await expectStatus(userA, `/api/recipes/${sharedRecipeB.id}`, 200);
  await expectStatus(userA, "/api/recipes", 403, {
    method: "POST",
    json: {
      title: "Viewer-created book recipe should fail",
      bookId: bookB.id,
      ingredients: [{ name: "viewer ingredient", quantity: 1, unit: "pc" }],
      instructions: [{ content: "viewer step" }],
    },
  });
  ok("User A viewer cannot create recipes inside shared book");
  await expectStatus(userA, `/api/share`, 404, {
    method: "POST",
    json: { resourceType: "recipe", resourceId: sharedRecipeB.id, permission: "view" },
  });
  await expectStatus(userA, `/api/books/${bookB.id}/members`, 403, {
    method: "POST",
    json: { email: USER_B_EMAIL, role: "viewer" },
  });
  await expectStatus(userA, `/api/recipes/${sharedRecipeB.id}`, 403, {
    method: "PATCH",
    json: { title: "Viewer should not edit this" },
  });
  await expectStatus(userA, `/api/recipes/${sharedRecipeB.id}`, 403, {
    method: "DELETE",
  });
  await expectStatus(userA, `/api/recipes/${sharedRecipeB.id}/ingredients`, 403, {
    method: "POST",
    json: { name: "viewer-added ingredient", quantity: 1, unit: "pc" },
  });
  const sharedIngredientId = sharedRecipeB.ingredients?.[0]?.id;
  if (sharedIngredientId) {
    await expectStatus(userA, `/api/recipes/${sharedRecipeB.id}/ingredients/${sharedIngredientId}`, 403, {
      method: "PATCH",
      json: { name: "viewer-mutated ingredient" },
    });
  }
  await expectStatus(userA, `/api/recipes/${sharedRecipeB.id}/instructions`, 403, {
    method: "POST",
    json: { content: "viewer-added step" },
  });
  const sharedInstructionId = sharedRecipeB.instructions?.[0]?.id;
  if (sharedInstructionId) {
    await expectStatus(userA, `/api/recipes/${sharedRecipeB.id}/instructions/${sharedInstructionId}`, 403, {
      method: "PATCH",
      json: { content: "viewer-mutated step" },
    });
  }
  await expectStatus(userA, `/api/recipes/${sharedRecipeB.id}/photos`, 403, {
    method: "PATCH",
    json: { photoUrl: "https://example.com/viewer-photo.jpg" },
  });
  await expectStatus(userA, `/api/recipes/${sharedRecipeB.id}/versions`, 403, {
    method: "POST",
    json: { changeNote: "viewer-created version" },
  });
  if (sharedRecipeB.activeVersionId) {
    await expectStatus(userA, `/api/recipes/${sharedRecipeB.id}/versions/${sharedRecipeB.activeVersionId}/rollback`, 403, {
      method: "POST",
    });
    await expectStatus(userA, `/api/recipes/${sharedRecipeB.id}/versions/${sharedRecipeB.activeVersionId}`, 403, {
      method: "DELETE",
    });
  }
  const viewerAttempt = await expectStatus(userA, `/api/recipes/${sharedRecipeB.id}/attempts`, 201, {
    method: "POST",
    json: { rating: 3, notes: "Viewer private attempt", source: "privacy_smoke" },
  });
  assert(Boolean(viewerAttempt.id), "User A viewer can keep a private attempt on an accessible recipe");
  await expectStatus(userA, `/api/recipes/${sharedRecipeB.id}/attempts/${viewerAttempt.id}/promote`, 403, {
    method: "POST",
    json: { setActive: true },
  });

  await expectStatus(userA, `/api/books/${bookA.id}/recipes`, 404, {
    method: "POST",
    json: { recipeId: recipeB.id },
  });

  const mealB = await createMealPlan(userB, recipeB.id, "B");
  await expectStatus(userA, `/api/meal-plans/${mealB.id}`, 404);
  const plansA = await expectStatus(userA, "/api/meal-plans", 200);
  assert(Array.isArray(plansA), "User A meal-plan list returns array");
  assert(!plansA.some((plan) => plan.id === mealB.id), "User A meal-plan list excludes User B meal plan");

  await expectStatus(userA, "/api/meal-plans", 404, {
    method: "POST",
    json: {
      date: yyyyMmDd(new Date(Date.now() + 4 * 24 * 60 * 60 * 1000)),
      mealType: "dinner",
      recipeId: recipeB.id,
      servings: 1,
    },
  });

  const shoppingA = await expectStatus(userA, `/api/shopping-list?startDate=${mealB.date}&endDate=${mealB.date}`, 200);
  assert(Array.isArray(shoppingA.items), "User A shopping list returns item array");
  assert(!shoppingA.items.some((item) => item.name === recipeB.uniqueIngredient), "User A shopping list excludes User B planned recipe ingredients");

  const inventoryB = await createInventoryItem(userB, "B");
  await expectStatus(userA, `/api/inventory/${inventoryB.id}`, 404);
  await expectStatus(userA, `/api/inventory/${inventoryB.id}`, 404, {
    method: "PATCH",
    json: { quantity: 99 },
  });
  await expectStatus(userA, `/api/inventory/${inventoryB.id}`, 404, { method: "DELETE" });
  const inventoryA = await expectStatus(userA, "/api/inventory", 200);
  assert(Array.isArray(inventoryA), "User A inventory list returns array");
  assert(!inventoryA.some((item) => item.name === inventoryB.uniqueName), "User A inventory list excludes User B inventory item");

  await expectStatus(userB, "/api/user/preferences", 200, {
    method: "PATCH",
    json: { name: "Privacy Smoke B Updated" },
  });
  const prefsA = await expectStatus(userA, "/api/user/preferences", 200);
  assert(prefsA.email === USER_A_EMAIL, "User A preferences remain scoped to User A");

  await expectStatus(userB, "/api/notifications/preferences", 200, {
    method: "PATCH",
    json: { weeklyCookingGoal: 5 },
  });
  const notificationPrefsA = await expectStatus(userA, "/api/notifications/preferences", 200);
  assert(notificationPrefsA.weeklyCookingGoal !== 5, "User A notification preferences exclude User B updates");

  await expectStatus(userB, "/api/pilot/feedback", 201, {
    method: "POST",
    json: { stage: "pilot_general", rating: 5, comment: `Private feedback ${RUN_ID}`, source: "privacy_smoke" },
  });
  const feedbackA = await expectStatus(userA, "/api/pilot/feedback", 200);
  assert(Array.isArray(feedbackA.feedback), "User A pilot feedback returns feedback array");
  assert(feedbackA.feedback.length === 0, "User A pilot feedback excludes User B feedback");
  const pilotStatusA = await expectStatus(userA, "/api/pilot/status", 200);
  assert(pilotStatusA.feedbackCount === 0, "User A pilot status excludes User B feedback count");

  const attemptB = await expectStatus(userB, `/api/recipes/${recipeB.id}/attempts`, 201, {
    method: "POST",
    json: { rating: 4.5, notes: "Synthetic privacy attempt", nextTime: "Synthetic next time" },
  });
  assert(Boolean(attemptB.id), "User B can create recipe attempt");
  await expectStatus(userA, `/api/recipes/${recipeB.id}/attempts`, 404);
  await expectStatus(userA, `/api/recipes/${recipeB.id}/versions`, 404);
  await expectStatus(userA, `/api/recipes/${recipeB.id}/versions/compare?base=${recipeB.activeVersionId}&compare=${recipeB.activeVersionId}`, 404);

  const activityA = await expectStatus(userA, "/api/activity", 200);
  assert(Array.isArray(activityA), "User A activity returns array");
  assert(!activityA.some((item) => item.recipeId === recipeB.id), "User A activity excludes User B private attempts");

  await expectStatus(userA, "/api/admin/analytics", 403);
  await expectStatus(userA, "/api/admin/migrate-versions", 403, { method: "POST" });

  // Positive controls: User A still sees their own objects.
  await expectStatus(userA, `/api/recipes/${recipeA.id}`, 200);
  await expectStatus(userA, `/api/books/${bookA.id}`, 200);

  for (const task of cleanupTasks.reverse()) {
    try {
      await task();
    } catch (error) {
      console.warn("WARN cleanup task failed:", error instanceof Error ? error.message : error);
    }
  }
  await cleanupUsers();

  console.log(`\nPrivacy smoke passed: ${results.length} assertions`);
}

main().catch(async (error) => {
  console.error(`\nPrivacy smoke failed: ${error instanceof Error ? error.message : error}`);
  for (const task of cleanupTasks.reverse()) {
    try {
      await task();
    } catch {
      // Best-effort cleanup on failure.
    }
  }
  process.exit(1);
});
