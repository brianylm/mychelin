import { existsSync, readFileSync } from "node:fs";
import { createClient } from "@libsql/client";
import type { Page } from "@playwright/test";

// Shared helpers for E2E specs: synthetic users, API-level fixtures,
// and cleanup against the DEV Turso database.

export function loadDevEnv(): void {
  for (const file of [".env.local", ".env"]) {
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, "utf8").split("\n")) {
      const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
      if (!match) continue;
      const [, key, raw] = match;
      if (process.env[key] !== undefined) continue;
      process.env[key] = raw.trim().replace(/^["']|["']$/g, "");
    }
  }
}

function turso() {
  loadDevEnv();
  return createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });
}

export interface TestUser {
  email: string;
  password: string;
}

export function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}@example.com`;
}

// Creates a synthetic user directly in the dev DB and injects a minted
// auth cookie into the browser context. Bypasses the signup/login API
// entirely — both are IP rate-limited, and tests must not depend on the
// rate-limit bucket's state. The cookie matches createToken() in
// src/lib/auth.ts (HS256, { id, name, email }, mychelin_token).
export async function signup(page: Page, email: string, password: string): Promise<void> {
  const bcrypt = await import("bcryptjs");
  const db = turso();
  const passwordHash = await bcrypt.hash(password, 12);
  await db.execute({
    sql: "INSERT OR IGNORE INTO users (name, email, password_hash, auth_provider, email_verified, created_at) VALUES (?, ?, ?, 'password', 1, ?)",
    args: ["E2E Test", email, passwordHash, new Date().toISOString()],
  });
  // Synthetic users skip onboarding — the app would otherwise show the
  // 3-step OnboardingFlow instead of the library.
  await db.execute({
    sql: "UPDATE users SET onboarding_completed = 1 WHERE email = ?",
    args: [email],
  });
  const user = (
    await db.execute({ sql: "SELECT id FROM users WHERE email = ?", args: [email] })
  ).rows[0];
  if (!user) throw new Error("failed to seed synthetic user");

  const { SignJWT } = await import("jose");
  const token = await new SignJWT({ id: Number(user.id), name: "E2E Test", email })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("3600s")
    .sign(new TextEncoder().encode("playwright-test-secret"));

  await page.context().addCookies([
    { name: "mychelin_token", value: token, url: "http://localhost:3100" },
  ]);
}

export interface RecipeFixture {
  id: number;
  title: string;
}

export async function createRecipe(
  page: Page,
  overrides: Partial<{
    title: string;
    yield: string;
    ingredients: Array<{ name: string; quantity?: number; unit?: string }>;
    instructions: Array<{ content: string; tip?: string }>;
  }> = {}
): Promise<RecipeFixture> {
  const title = overrides.title ?? `E2E recipe ${Date.now()}`;
  const res = await page.request.post("/api/recipes", {
    data: {
      title,
      status: "active",
      yield: overrides.yield ?? "4 servings",
      ingredients: overrides.ingredients ?? [
        { name: "garlic", quantity: 3, unit: "clove" },
        { name: "rice", quantity: 200, unit: "g" },
      ],
      instructions: overrides.instructions ?? [
        { content: "Fry garlic until fragrant" },
        { content: "Add rice and toss for 2 min" },
      ],
    },
  });
  if (!res.ok()) {
    throw new Error(`createRecipe failed: ${res.status()} ${await res.text()}`);
  }
  const body = await res.json();
  return { id: body.id, title };
}

// Best-effort cleanup: deletes the synthetic user (cascades recipes,
// plans, attempts, photos rows — blob storage is not touched).
export async function cleanupUsers(prefix: string): Promise<void> {
  const db = turso();
  await db.execute({
    sql: "DELETE FROM users WHERE email LIKE ?",
    args: [`${prefix}-%@example.com`],
  });
}
