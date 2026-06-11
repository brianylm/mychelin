#!/usr/bin/env node

/**
 * Two-user privacy smoke test for Mychelin.
 *
 * Runs against a deployed or local Mychelin URL and verifies that User A
 * cannot read or mutate User B's private recipes, books, meal plans,
 * attempts, versions, search results, or admin analytics.
 *
 * Usage:
 *   MYCHELIN_BASE_URL=https://mychelin-sg.vercel.app npm run smoke:privacy
 *
 * Optional synthetic user cleanup:
 *   MYCHELIN_CLEANUP_USERS=1 TURSO_DATABASE_URL=... TURSO_AUTH_TOKEN=... npm run smoke:privacy
 */

import { createClient } from "@libsql/client";

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

async function signup(session, email, name) {
  const { response, body } = await session.json("/api/auth/signup", {
    method: "POST",
    json: { email, password: PASSWORD, name },
  });
  assert(response.status === 201 || response.status === 200, `${name} can sign up`, JSON.stringify(body));
  assert(Boolean(session.cookie), `${name} receives auth cookie`);
}

async function createRecipe(session, ownerLabel) {
  const uniqueIngredient = `privacy-${ownerLabel}-${RUN_ID}`;
  const { response, body } = await session.json("/api/recipes", {
    method: "POST",
    json: {
      title: `Privacy ${ownerLabel} recipe ${RUN_ID}`,
      description: "Synthetic privacy smoke recipe",
      ingredients: [{ name: uniqueIngredient, quantity: 1, unit: "pc", notes: "" }],
      instructions: [{ content: `Cook ${uniqueIngredient}`, tip: "" }],
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

async function cleanupUsers() {
  if (process.env.MYCHELIN_CLEANUP_USERS !== "1") return;
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url || !authToken) {
    console.warn("WARN user cleanup requested but TURSO_DATABASE_URL/TURSO_AUTH_TOKEN are missing");
    return;
  }
  const db = createClient({ url, authToken });
  for (const email of [USER_A_EMAIL, USER_B_EMAIL]) {
    await db.execute({ sql: "delete from users where email = ?", args: [email] });
  }
  console.log("PASS synthetic users deleted from Turso");
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

  const attemptB = await expectStatus(userB, `/api/recipes/${recipeB.id}/attempts`, 201, {
    method: "POST",
    json: { rating: 4.5, notes: "Synthetic privacy attempt", nextTime: "Synthetic next time" },
  });
  assert(Boolean(attemptB.id), "User B can create recipe attempt");
  await expectStatus(userA, `/api/recipes/${recipeB.id}/attempts`, 404);
  await expectStatus(userA, `/api/recipes/${recipeB.id}/versions`, 404);
  await expectStatus(userA, `/api/recipes/${recipeB.id}/versions/compare?base=${recipeB.activeVersionId}&compare=${recipeB.activeVersionId}`, 404);

  await expectStatus(userA, "/api/admin/analytics", 403);

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
