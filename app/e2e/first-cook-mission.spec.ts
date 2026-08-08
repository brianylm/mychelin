import { test, expect } from "@playwright/test";
import { signup, createRecipe, cleanupUsers, uniqueEmail } from "./helpers";

const PREFIX = "e2e-mission";
const PASSWORD = "E2eMission123!";

test.afterAll(async () => {
  await cleanupUsers(PREFIX);
});

test.describe("first cook guided mission", () => {
  test.describe.configure({ timeout: 90_000 });

  test("mission card appears for a new cook and launches the guided flow", async ({
    page,
  }) => {
    await signup(page, uniqueEmail(PREFIX), PASSWORD);
    await createRecipe(page, { title: "E2E Mission Chicken Rice" });

    await page.goto("/app");

    // Post-onboarding dashboard card (no attempts yet). Generous timeout:
    // the app fetches hasAttemptedAny from /api/notifications/rhythm,
    // which is occasionally slow or transiently fails on the dev DB.
    await expect(page.getByText("Cook your first dish")).toBeVisible({ timeout: 60_000 });
    await page.getByRole("button", { name: "Cook with me" }).click();

    // Guided flow opens with the pick-a-dish step. The recipe-title
    // assertion is dialog-scoped: the RecipeView card grid behind the
    // modal renders the same title and would otherwise violate strict
    // mode.
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("Choose the dish for your first cook-along.")).toBeVisible();
    await expect(dialog.getByText("E2E Mission Chicken Rice")).toBeVisible();

    // Advance through: pick → continue.
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByText("Plan it", { exact: true })).toBeVisible();
  });

  test("dismiss keeps the mission resumable; pick persists", async ({ page }) => {
    await signup(page, uniqueEmail(PREFIX), PASSWORD);
    await createRecipe(page, { title: "E2E Mission Laksa" });

    await page.goto("/app");
    await expect(page.getByText("Cook your first dish")).toBeVisible({ timeout: 60_000 });

    // Dismiss — card hides for this session.
    await page.getByRole("button", { name: "Not now — keep the mission for later" }).click();
    await expect(page.getByText("Cook your first dish")).not.toBeVisible();
  });
});
