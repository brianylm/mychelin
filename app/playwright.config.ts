import { defineConfig, devices } from "@playwright/test";

// E2E regression tests. Runs the app locally against the dedicated
// `mychelin-staging` Turso database with synthetic users that are cleaned up
// afterwards. See e2e/helpers.ts.
//
// The database comes only from E2E_TURSO_DATABASE_URL / E2E_TURSO_AUTH_TOKEN,
// never from .env.local: that file points at production.
const PRODUCTION_DB = /\/\/mychelin-brianylm\./;
const e2eDatabaseUrl = process.env.E2E_TURSO_DATABASE_URL;
const e2eAuthToken = process.env.E2E_TURSO_AUTH_TOKEN;
if (!e2eDatabaseUrl || !e2eAuthToken) {
  throw new Error(
    "Set E2E_TURSO_DATABASE_URL and E2E_TURSO_AUTH_TOKEN (the mychelin-staging database) to run e2e tests."
  );
}
if (PRODUCTION_DB.test(e2eDatabaseUrl)) {
  throw new Error("Refusing to run e2e tests against the production database.");
}
// Test workers and the web server inherit these, and they outrank .env files.
process.env.TURSO_DATABASE_URL = e2eDatabaseUrl;
process.env.TURSO_AUTH_TOKEN = e2eAuthToken;

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  retries: 1,
  workers: 1, // shared dev DB — serialize
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://localhost:3100",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npx next dev -p 3100",
    url: "http://localhost:3100",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      // Local env files don't define one; auth needs it to sign/verify.
      JWT_SECRET: "playwright-test-secret",
      TURSO_DATABASE_URL: e2eDatabaseUrl,
      TURSO_AUTH_TOKEN: e2eAuthToken,
    },
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    // iPhone viewport/UA on chromium — layout testing doesn't need a
    // separate webkit download.
    { name: "mobile", use: { ...devices["iPhone 13"], browserName: "chromium" } },
  ],
});
