#!/usr/bin/env node

/**
 * Post-deploy regression smoke test for Mychelin.
 *
 * Runs against a deployed Mychelin URL (prod by default) and exercises
 * the flows that have actually regressed in the past:
 *   - recipe detail returns ingredients/instructions/yield
 *   - logged cooks appear in the meal-plans payload
 *   - versions endpoint (fork-lineage CTE) returns versions
 *   - landing page renders and references the hero image
 *
 * Creates a synthetic user and recipe, then cleans both up afterwards
 * (recipe via the API, user via Turso when credentials are present).
 *
 * Usage:
 *   MYCHELIN_BASE_URL=https://mychelin-sg.vercel.app npm run smoke:regression
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

const BASE_URL = (process.env.MYCHELIN_BASE_URL || "https://mychelin-sg.vercel.app").replace(/\/$/, "");
const PASSWORD = "RegressionSmoke123!";
const RUN_ID = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
const USER_EMAIL = `regression-smoke-${RUN_ID}@example.com`;

let failures = 0;

function ok(message) {
  console.log(`PASS ${message}`);
}

function fail(message, detail) {
  failures += 1;
  const suffix = detail ? `: ${detail}` : "";
  console.error(`FAIL ${message}${suffix}`);
}

function assert(condition, message, detail) {
  if (condition) ok(message);
  else fail(message, detail);
}

function authCookieFrom(response) {
  const getSetCookie = response.headers.getSetCookie?.bind(response.headers);
  const values = getSetCookie ? getSetCookie() : [response.headers.get("set-cookie")].filter(Boolean);
  const tokenCookie = values.find((value) => value.startsWith("mychelin_token="));
  return tokenCookie ? tokenCookie.split(";")[0] : "";
}

class Session {
  constructor() {
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

async function seedSyntheticUser() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url || !authToken) return false;
  const client = createClient({ url, authToken });
  const passwordHash = await bcrypt.hash(PASSWORD, 12);
  await client.execute({
    sql: "insert or ignore into users (name, email, password_hash, auth_provider, email_verified, created_at) values (?, ?, ?, 'password', 1, ?)",
    args: ["Regression Smoke", USER_EMAIL, passwordHash, new Date().toISOString()],
  });
  return true;
}

async function cleanupUser() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url || !authToken) {
    console.warn("WARN no Turso credentials — synthetic user left in DB:", USER_EMAIL);
    return;
  }
  const client = createClient({ url, authToken });
  await client.execute({
    sql: "delete from users where email = ?",
    args: [USER_EMAIL],
  });
}

async function main() {
  const session = new Session();

  // 1. Sign up (or seed + log in if rate-limited)
  const signup = await session.json("/api/auth/signup", {
    method: "POST",
    json: { email: USER_EMAIL, password: PASSWORD, name: "Regression Smoke" },
  });
  if (signup.response.status === 429 || signup.response.status === 409) {
    assert(await seedSyntheticUser(), "synthetic user seeded via Turso fallback");
    const login = await session.json("/api/auth/login", {
      method: "POST",
      json: { email: USER_EMAIL, password: PASSWORD },
    });
    assert(login.response.status === 200, "synthetic user can log in", JSON.stringify(login.body));
  } else {
    assert(signup.response.status === 201, "synthetic user signs up", `got ${signup.response.status}`);
  }
  assert(Boolean(session.cookie), "auth cookie received");
  if (failures) throw new Error("auth failed — aborting");

  // 2. Create a recipe with yield, ingredients, and steps
  const created = await session.json("/api/recipes", {
    method: "POST",
    json: {
      title: `Regression smoke ${RUN_ID}`,
      yield: "8 servings",
      status: "active",
      ingredients: [
        { name: "smoke garlic", quantity: 2, unit: "cloves" },
        { name: "smoke rice", quantity: 200, unit: "g" },
      ],
      instructions: [
        { content: "Smoke step one" },
        { content: "Smoke step two" },
      ],
    },
  });
  assert(created.response.status === 201, "create recipe returns 201", `got ${created.response.status} ${JSON.stringify(created.body).slice(0, 200)}`);
  const recipeId = created.body?.id;
  if (!recipeId) throw new Error("recipe creation failed — aborting");

  try {
    // 3. Recipe detail returns relations and yield
    const detail = await session.json(`/api/recipes/${recipeId}`);
    assert(detail.response.status === 200, "GET /api/recipes/:id returns 200");
    assert(detail.body?.yield === "8 servings", "detail carries yield '8 servings'", `got ${JSON.stringify(detail.body?.yield)}`);
    assert(Array.isArray(detail.body?.ingredients) && detail.body.ingredients.length === 2, "detail includes 2 ingredients", `got ${detail.body?.ingredients?.length}`);
    assert(Array.isArray(detail.body?.instructions) && detail.body.instructions.length === 2, "detail includes 2 instructions", `got ${detail.body?.instructions?.length}`);

    // 4. Log a cook attempt
    const attempt = await session.json(`/api/recipes/${recipeId}/attempts`, {
      method: "POST",
      json: { notes: "regression smoke attempt" },
    });
    assert(attempt.response.status === 201, "POST attempt returns 201", `got ${attempt.response.status} ${JSON.stringify(attempt.body).slice(0, 200)}`);

    // 5. Meal plans payload includes the logged attempt
    const today = new Date().toISOString().slice(0, 10);
    const plans = await session.json(`/api/meal-plans?startDate=${today}&endDate=${today}`);
    assert(plans.response.status === 200, "GET /api/meal-plans returns 200");
    assert(
      plans.body && Array.isArray(plans.body.plans) && Array.isArray(plans.body.attempts),
      "meal-plans payload has { plans, attempts } shape",
      `got ${JSON.stringify(plans.body).slice(0, 200)}`
    );
    assert(Array.isArray(plans.body?.blocks), "meal-plans payload includes blocks array", `got ${JSON.stringify(plans.body).slice(0, 200)}`);
    const logged = Array.isArray(plans.body?.attempts)
      ? plans.body.attempts.find((a) => a.recipeId === recipeId)
      : null;
    assert(Boolean(logged), "logged cook appears in meal-plans attempts");
    assert(logged?.recipeTitle?.includes("Regression smoke"), "logged attempt carries recipe title", `got ${JSON.stringify(logged?.recipeTitle)}`);

    // 5b. Block a meal slot: clears its plans, shows up in payload, unblocks cleanly
    const plan = await session.json("/api/meal-plans", {
      method: "POST",
      json: { date: today, mealType: "lunch", recipeId, servings: 1 },
    });
    assert(plan.response.status === 201, "create meal plan returns 201", `got ${plan.response.status} ${JSON.stringify(plan.body).slice(0, 200)}`);
    const block = await session.json("/api/meal-plans/blocks", {
      method: "POST",
      json: { date: today, mealType: "lunch" },
    });
    assert(block.response.status === 201, "block meal slot returns 201", `got ${block.response.status} ${JSON.stringify(block.body).slice(0, 200)}`);
    const afterBlock = await session.json(`/api/meal-plans?startDate=${today}&endDate=${today}`);
    assert(
      Array.isArray(afterBlock.body?.blocks) &&
        afterBlock.body.blocks.some((b) => b.date === today && b.mealType === "lunch"),
      "blocked slot appears in meal-plans blocks"
    );
    assert(
      Array.isArray(afterBlock.body?.plans) &&
        !afterBlock.body.plans.some((p) => p.date === today && p.mealType === "lunch"),
      "blocking cleared the slot's plans"
    );
    const unblock = await session.json("/api/meal-plans/blocks", {
      method: "DELETE",
      json: { date: today, mealType: "lunch" },
    });
    assert(unblock.response.status === 200, "unblock meal slot returns 200", `got ${unblock.response.status}`);
    const afterUnblock = await session.json(`/api/meal-plans?startDate=${today}&endDate=${today}`);
    assert(
      Array.isArray(afterUnblock.body?.blocks) && afterUnblock.body.blocks.length === 0,
      "blocks empty after unblock"
    );

    // 6. Versions: create one, then the lineage query returns it
    const version = await session.json(`/api/recipes/${recipeId}/versions`, {
      method: "POST",
      json: { captureMethod: "manual", setActive: true },
    });
    assert(version.response.status === 201, "POST version returns 201", `got ${version.response.status} ${JSON.stringify(version.body).slice(0, 200)}`);
    const versions = await session.json(`/api/recipes/${recipeId}/versions`);
    assert(versions.response.status === 200, "GET versions returns 200");
    assert(Array.isArray(versions.body?.versions) && versions.body.versions.length >= 1, "versions list is non-empty", `got ${JSON.stringify(versions.body).slice(0, 200)}`);
    assert(versions.body?.activeVersionId != null, "activeVersionId is set", `got ${JSON.stringify(versions.body?.activeVersionId)}`);

    // 7. Landing page renders and references the hero image
    const landing = await session.request("/");
    const landingHtml = await landing.text();
    assert(landing.status === 200, "landing page returns 200");
    assert(landingHtml.includes("hero-family-table"), "landing references hero image");
  } finally {
    // 8. Cleanup: recipe via API (cascades), user via Turso
    const del = await session.json(`/api/recipes/${recipeId}`, { method: "DELETE" });
    if (del.response.status !== 200) {
      console.warn("WARN recipe cleanup failed:", del.response.status);
    }
    await cleanupUser();
  }

  if (failures) {
    throw new Error(`${failures} regression check(s) failed`);
  }
  console.log("\nAll regression checks passed against", BASE_URL);
}

main().catch((error) => {
  console.error("\nREGRESSION SMOKE FAILED:", error instanceof Error ? error.message : error);
  process.exit(1);
});
