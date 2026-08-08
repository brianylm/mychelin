import { test, expect, type Page } from "@playwright/test";
import { signup, createRecipe, cleanupUsers, uniqueEmail } from "./helpers";

const PREFIX = "e2e-card-depth";
const PASSWORD = "E2eCardDepth123!";

test.afterAll(async () => {
  await cleanupUsers(PREFIX);
});

async function openCard(page: Page, recipeId: number): Promise<void> {
  await page.goto(`/app?recipe=${recipeId}`);
  await page.getByRole("tab", { name: "Card" }).click();
  await expect(page.getByRole("region", { name: "Cooking card timeline" })).toBeVisible();
}

test.describe("cooking card depth", () => {
  test.describe.configure({ timeout: 90_000 });

  test("ingredient rail reorders into per-step bands (step-first reference wins)", async ({
    page,
  }) => {
    await signup(page, uniqueEmail(PREFIX), PASSWORD);
    // List rice BEFORE garlic in the recipe, but step 1 references garlic —
    // the card must move garlic up into step 1's band.
    const recipe = await createRecipe(page, {
      title: "E2E Card Band Order",
      ingredients: [
        { name: "rice", quantity: 200, unit: "g" },
        { name: "garlic", quantity: 3, unit: "clove" },
        { name: "soy sauce", quantity: 2, unit: "tbsp" },
      ],
      instructions: [
        { content: "Fry garlic until fragrant" },
        { content: "Add rice and toss for 2 min" },
      ],
    });

    await openCard(page, recipe.id);

    // The rail lists garlic before rice even though rice was entered first:
    // grab every ingredient name cell inside the timeline rail.
    const names = await page
      .locator('[role="region"][aria-label="Cooking card timeline"] button[aria-pressed]')
      .allInnerTexts();
    const strip = (s: string) => s.trim();
    const garlicAt = names.findIndex((n) => strip(n).startsWith("garlic"));
    const riceAt = names.findIndex((n) => strip(n).startsWith("rice"));
    expect(garlicAt).toBeGreaterThanOrEqual(0);
    expect(riceAt).toBeGreaterThanOrEqual(0);
    expect(garlicAt).toBeLessThan(riceAt);
  });

  test("heat and timer chips render from step tips and explicit durations", async ({
    page,
  }) => {
    await signup(page, uniqueEmail(PREFIX), PASSWORD);
    const recipe = await createRecipe(page, {
      title: "E2E Card Chips",
      ingredients: [
        { name: "chicken", quantity: 500, unit: "g" },
      ],
      instructions: [
        { content: "Brown chicken for 8 min", tip: "[heat:medium] do not crowd" },
        { content: "Simmer everything for 20 min" },
      ],
    });

    await openCard(page, recipe.id);

    // Timer chip from the explicit "20 min" in step 2 (exact-match so the
    // instruction sentence "Simmer everything for 20 min" can't satisfy it).
    await expect(page.getByText(/^20 min$/).first()).toBeVisible();
    // Heat chip from the [heat:medium] tip.
    await expect(page.getByText(/^Medium$/).first()).toBeVisible();
  });

  test("Start Cooking launches the cook session from the card", async ({ page }) => {
    await signup(page, uniqueEmail(PREFIX), PASSWORD);
    const recipe = await createRecipe(page, { title: "E2E Card Start" });

    await openCard(page, recipe.id);

    await page.getByRole("button", { name: "Start Cooking" }).click();
    // CookWithMe session opens (its distinctive intro copy/step nav).
    await expect(page.getByText("Fry garlic until fragrant")).toBeVisible();
    await expect(page.getByRole("button", { name: /Next/ }).first()).toBeVisible();
  });
});
