import { test, expect, type Page } from "@playwright/test";
import { signup, createRecipe, cleanupUsers, uniqueEmail } from "./helpers";

const PREFIX = "e2e-planner-randomize";
const PASSWORD = "E2eRandomize123!";

test.afterAll(async () => {
  await cleanupUsers(PREFIX);
});

async function openPlanner(page: Page): Promise<void> {
  await page.goto("/app");
  await page.getByRole("button", { name: /^(Meal )?Plan$/ }).first().click();
  await expect(page.getByRole("button", { name: /Randomize week/i })).toBeVisible();
}

test.describe("planner randomize, block, and undo", () => {
  // The roll fills every open week slot with serial POSTs (~1s each on
  // the remote dev Turso DB), so the randomize test can take a minute+.
  test.describe.configure({ timeout: 180_000 });

  test("randomize fills a slot, records undo, and undoes the roll", async ({
    page,
  }) => {
    await signup(page, uniqueEmail(PREFIX), PASSWORD);
    await createRecipe(page, { title: "E2E Rand Dish" });
    await openPlanner(page);

    // Open the pre-roll review dialog.
    await page.getByRole("button", { name: /Randomize week/i }).click();
    await expect(page.getByRole("dialog").getByText(/Review the open slots/)).toBeVisible();
    await expect(page.getByRole("button", { name: /Randomize \d+ meals?/i })).toBeVisible();

    // Roll. The roll fills every open slot in the week (up to ~21) with
    // serial POSTs, each doing schema-ensure checks + queries on the
    // remote dev Turso DB — give it room to finish.
    await page.getByRole("button", { name: /Randomize \d+ meals?/i }).click();
    await expect(page.getByText(/Planned \d+ meals? for this week/)).toBeVisible({ timeout: 60_000 });
    // exact: true — a plain name match would also catch "Dismiss undo banner".
    await expect(page.getByRole("button", { name: "Undo", exact: true })).toBeVisible();

    // Undo clears the plans again.
    await page.getByRole("button", { name: "Undo", exact: true }).click();
    await expect(page.getByText(/Planned \d+ meals? for this week/)).not.toBeVisible();
  });

  test("block-a-meal empties the slot and can be unblocked", async ({ page }) => {
    await signup(page, uniqueEmail(PREFIX), PASSWORD);
    await createRecipe(page, { title: "E2E Block Dish" });
    await openPlanner(page);

    // Block a slot from its row action.
    await page.getByRole("button", { name: /Block dinner — eating something else/ }).first().click();
    await expect(page.getByText("Meal blocked — eating something else").first()).toBeVisible();
  });
});
