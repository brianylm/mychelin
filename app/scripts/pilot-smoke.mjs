#!/usr/bin/env node

/**
 * Single-user MVP loop smoke test for Mychelin pilot readiness.
 *
 * Runs against a deployed or local Mychelin URL and verifies the core pilot
 * path: signup, recipe creation, planner discovery, meal planning, shopping
 * list generation, cook attempt, promote attempt to version, pilot status,
 * pilot feedback, and admin analytics gating for a non-admin user.
 *
 * Usage:
 *   MYCHELIN_BASE_URL=https://mychelin-sg.vercel.app npm run smoke:pilot
 *
 * Optional synthetic user cleanup:
 *   MYCHELIN_CLEANUP_USERS=1 TURSO_DATABASE_URL=... TURSO_AUTH_TOKEN=... npm run smoke:pilot
 */

import { createClient } from "@libsql/client";

const BASE_URL = (process.env.MYCHELIN_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const PASSWORD = "PilotSmoke123!";
const RUN_ID = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
const USER_EMAIL = `pilot-smoke-${RUN_ID}@example.com`;
const RECIPE_TITLE = `Pilot smoke recipe ${RUN_ID}`;
const INGREDIENT_NAME = `pilot-onion-${RUN_ID}`;
const PLAN_DATE = yyyyMmDd(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000));

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

async function cleanupUsers() {
  if (process.env.MYCHELIN_CLEANUP_USERS !== "1") return;
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url || !authToken) {
    console.warn("WARN user cleanup requested but TURSO_DATABASE_URL/TURSO_AUTH_TOKEN are missing");
    return;
  }
  const db = createClient({ url, authToken });
  await db.execute({ sql: "delete from users where email = ?", args: [USER_EMAIL] });
  console.log("PASS synthetic user deleted from Turso");
}

async function main() {
  console.log(`Pilot smoke target: ${BASE_URL}`);
  console.log(`Run id: ${RUN_ID}`);

  const user = new Session("Pilot user");

  await expectStatus(user, "/api/auth/signup", 201, {
    method: "POST",
    json: {
      name: "Pilot Smoke",
      email: USER_EMAIL,
      password: PASSWORD,
    },
  });
  assert(Boolean(user.cookie), "Pilot user receives auth cookie");

  const recipe = await expectStatus(user, "/api/recipes", 201, {
    method: "POST",
    json: {
      title: RECIPE_TITLE,
      description: "Synthetic pilot smoke recipe",
      cuisine: "Pilot",
      yield: "2 servings",
      ingredients: [
        { name: INGREDIENT_NAME, quantity: 2, unit: "pc", notes: "synthetic" },
        { name: "pilot salt", approximate: true, quantityText: "to taste", unit: "", notes: "" },
      ],
      instructions: [
        { content: "Slice the pilot onions.", tip: "" },
        { content: "Cook the pilot onions for 4 minutes.", tip: "" },
      ],
    },
  });
  cleanupTasks.push(() => user.request(`/api/recipes/${recipe.id}`, { method: "DELETE" }));
  assert(Boolean(recipe.id), "Recipe create returns id");
  assert(Boolean(recipe.activeVersionId), "Recipe create returns active version id");

  const recipeDetail = await expectStatus(user, `/api/recipes/${recipe.id}`, 200);
  assert(recipeDetail.title === RECIPE_TITLE, "Recipe detail returns created recipe");
  assert(Array.isArray(recipeDetail.ingredients) && recipeDetail.ingredients.length >= 2, "Recipe detail includes ingredients");
  assert(Array.isArray(recipeDetail.instructions) && recipeDetail.instructions.length >= 2, "Recipe detail includes steps");

  const plannerRecipes = await expectStatus(user, "/api/recipes?planner=1", 200);
  assert(Array.isArray(plannerRecipes), "Planner recipe list returns array");
  assert(plannerRecipes.some((item) => item.id === recipe.id), "Planner recipe list includes created recipe");

  const mealPlan = await expectStatus(user, "/api/meal-plans", 201, {
    method: "POST",
    json: {
      date: PLAN_DATE,
      mealType: "dinner",
      recipeId: recipe.id,
      servings: 2,
      notes: "Synthetic pilot smoke meal",
    },
  });
  cleanupTasks.push(() => user.request(`/api/meal-plans/${mealPlan.id}`, { method: "DELETE" }));
  assert(Boolean(mealPlan.id), "Meal plan create returns id");
  assert(mealPlan.recipe?.id === recipe.id, "Meal plan response includes recipe");

  const mealPlans = await expectStatus(user, `/api/meal-plans?startDate=${PLAN_DATE}&endDate=${PLAN_DATE}`, 200);
  assert(Array.isArray(mealPlans), "Meal-plan list returns array");
  assert(mealPlans.some((plan) => plan.id === mealPlan.id), "Meal-plan list includes planned meal");

  const shopping = await expectStatus(user, `/api/shopping-list?startDate=${PLAN_DATE}&endDate=${PLAN_DATE}`, 200);
  assert(Array.isArray(shopping.items), "Shopping list returns items array");
  assert(shopping.summary?.mealCount >= 1, "Shopping list summary counts planned meal");
  assert(shopping.items.some((item) => item.name === INGREDIENT_NAME), "Shopping list includes planned recipe ingredient");

  const attempt = await expectStatus(user, `/api/recipes/${recipe.id}/attempts`, 201, {
    method: "POST",
    json: {
      mealPlanId: mealPlan.id,
      rating: 4.5,
      notes: "Synthetic pilot attempt",
      whatWorked: "The pilot onions softened properly.",
      nextTime: "Use a wider pan next time.",
      ingredientsSnapshot: recipeDetail.ingredients,
      instructionsSnapshot: recipeDetail.instructions,
    },
  });
  assert(Boolean(attempt.id), "Cook attempt create returns id");
  assert(attempt.rating === 4.5, "Cook attempt preserves half-star rating");

  const promoted = await expectStatus(user, `/api/recipes/${recipe.id}/attempts/${attempt.id}/promote`, 201, {
    method: "POST",
    json: {
      setActive: true,
      changeNote: "Synthetic pilot promotion",
    },
  });
  assert(Boolean(promoted.id), "Attempt promotion returns version id");
  assert(promoted.activeVersionId === promoted.id, "Promoted version can be set definitive");

  const updatedRecipe = await expectStatus(user, `/api/recipes/${recipe.id}`, 200);
  assert(updatedRecipe.activeVersionId === promoted.id, "Recipe active version points at promoted version");

  const pilotStatus = await expectStatus(user, "/api/pilot/status", 200);
  assert(pilotStatus.completedCount >= 5, "Pilot checklist records core loop milestones");
  for (const id of ["capture", "plan", "shopping", "cook", "version"]) {
    const item = pilotStatus.checklist?.find((check) => check.id === id);
    assert(Boolean(item?.completed), `Pilot checklist marks ${id} complete`);
  }

  await expectStatus(user, "/api/pilot/feedback", 201, {
    method: "POST",
    json: {
      stage: "pilot_general",
      rating: 5,
      comment: "Synthetic privacy-safe pilot smoke feedback",
      source: "pilot_smoke",
    },
  });
  const feedback = await expectStatus(user, "/api/pilot/feedback?stage=pilot_general", 200);
  assert(Array.isArray(feedback.feedback), "Pilot feedback list returns array");
  assert(feedback.feedback.length >= 1, "Pilot feedback list includes submitted feedback");

  await expectStatus(user, "/api/admin/analytics", 403);

  for (const task of cleanupTasks.reverse()) {
    try {
      await task();
    } catch (error) {
      console.warn("WARN cleanup task failed:", error instanceof Error ? error.message : error);
    }
  }
  await cleanupUsers();

  console.log(`\nPilot smoke passed: ${results.length} assertions`);
}

main().catch(async (error) => {
  console.error(`\nPilot smoke failed: ${error instanceof Error ? error.message : error}`);
  for (const task of cleanupTasks.reverse()) {
    try {
      await task();
    } catch {
      // Best-effort cleanup on failure.
    }
  }
  process.exit(1);
});
