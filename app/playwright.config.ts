import { defineConfig, devices } from "@playwright/test";

// E2E regression tests. Runs the app locally against the DEV Turso
// database (the one in .env/.env.local — never prod) with synthetic
// users that are cleaned up afterwards. See e2e/helpers.ts.
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
    },
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    // iPhone viewport/UA on chromium — layout testing doesn't need a
    // separate webkit download.
    { name: "mobile", use: { ...devices["iPhone 13"], browserName: "chromium" } },
  ],
});
