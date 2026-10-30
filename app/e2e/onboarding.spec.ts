import { test, expect, type Page } from "@playwright/test";
import { cleanupUsers, uniqueEmail } from "./helpers";

const PREFIX = "e2e-onboarding";
const PASSWORD = "E2eOnboarding123!";

test.afterAll(async () => {
  await cleanupUsers(PREFIX);
});

// A real new account: unlike helpers.signup, this leaves onboarding pending.
async function newUser(page: Page) {
  const response = await page.request.post("/api/auth/signup", {
    data: { name: "Onboarding Test", email: uniqueEmail(PREFIX), password: PASSWORD, ageConfirmed: true },
  });
  expect(response.ok()).toBeTruthy();
  await page.goto("/app");
  await expect(page.getByRole("heading", { name: "What do you have to start with?" })).toBeVisible({
    timeout: 60_000,
  });
}

test.describe("one-question onboarding", () => {
  test.describe.configure({ timeout: 90_000 });

  test("a link opens link import", async ({ page }) => {
    await newUser(page);
    await page.getByRole("button", { name: /^A link/ }).click();
    await expect(page.getByRole("dialog").getByPlaceholder(/https?:/i)).toBeVisible({ timeout: 30_000 });
  });

  test("notes open paste", async ({ page }) => {
    await newUser(page);
    await page.getByRole("button", { name: /^Notes or a message/ }).click();
    await expect(page.getByRole("dialog").locator("textarea").first()).toBeVisible({ timeout: 30_000 });
  });

  test("a family dish opens conversation capture", async ({ page }) => {
    await newUser(page);
    await page.getByRole("button", { name: /^A dish my family makes/ }).click();
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("heading", { name: "What do you have to start with?" })).not.toBeVisible();
  });

  test("nothing yet adds the dish first, then starts the mission", async ({ page }) => {
    await newUser(page);
    await page.getByRole("button", { name: /^Nothing yet/ }).click();
    await page.getByRole("button", { name: /^Onion omelette/i }).click();
    await page.getByRole("button", { name: "Use this dish" }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("Choose the dish for your first cook-along.")).toBeVisible({ timeout: 30_000 });
    await expect(dialog.getByText(/onion omelette/i)).toBeVisible();

    // Closing the mission leaves the resumable card without a reload.
    await page.keyboard.press("Escape");
    await expect(page.getByText("Cook your first dish")).toBeVisible({ timeout: 60_000 });
  });

  test("a failed dish save does not complete onboarding", async ({ page }) => {
    await newUser(page);
    await page.route("**/api/recipes", (route) =>
      route.request().method() === "POST"
        ? route.fulfill({ status: 500, json: { error: "Could not add that dish. Try again." } })
        : route.continue()
    );
    await page.getByRole("button", { name: /^Nothing yet/ }).click();
    await page.getByRole("button", { name: "Use this dish" }).click();
    await expect(page.getByRole("alert")).toHaveText("Could not add that dish. Try again.");

    const preferences = await (await page.request.get("/api/user/preferences")).json();
    expect(preferences.onboardingCompleted).toBe(false);
  });

  test("skip lands on the library and asks for a first recipe", async ({ page }) => {
    await newUser(page);
    await page.getByRole("button", { name: "Skip" }).click();
    await expect(page.getByText("Add your first recipe")).toBeVisible({ timeout: 60_000 });
    await page.reload();
    await expect(page.getByRole("heading", { name: "What do you have to start with?" })).not.toBeVisible();
    await expect(page.getByText("Add your first recipe")).toBeVisible({ timeout: 60_000 });
  });
});
