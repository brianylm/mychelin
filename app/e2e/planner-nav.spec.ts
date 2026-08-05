import { test, expect } from "@playwright/test";
import { signup, createRecipe, cleanupUsers, uniqueEmail } from "./helpers";

const PREFIX = "e2e-planner-nav";
const PASSWORD = "E2ePlanner123!";

test.afterAll(async () => {
  await cleanupUsers(PREFIX);
});

test.describe("planner navigation with a recipe selected", () => {
  test("clicking Plan with a recipe open shows the planner, not the recipe", async ({
    page,
  }) => {
    await signup(page, uniqueEmail(PREFIX), PASSWORD);
    const recipe = await createRecipe(page, { title: "E2E Planned Dish" });

    await page.goto(`/app?recipe=${recipe.id}`);
    await expect(page.getByText("Fry garlic until fragrant").first()).toBeVisible();

    // The regression: Plan nav used to bounce back to the recipe view.
    await page.getByRole("button", { name: /^(Meal )?Plan$/ }).first().click();
    await expect(
      page.getByRole("button", { name: /Randomize week/i })
    ).toBeVisible();
  });

  test("selecting a recipe from the sidebar over the planner reveals it", async ({
    page,
  }, testInfo) => {
    test.skip(!testInfo.project.name.includes("mobile"), "drawer is mobile-only");
    await signup(page, uniqueEmail(PREFIX), PASSWORD);
    await createRecipe(page, { title: "E2E Drawer Dish" });

    await page.goto("/app");
    await page.getByRole("button", { name: /^(Meal )?Plan$/ }).first().click();
    await expect(page.getByRole("button", { name: /Randomize week/i })).toBeVisible();

    // Open the sidebar drawer over the planner and pick the recipe
    await page.getByRole("button", { name: "Open library panel" }).click();
    const item = page.locator("aside button", { hasText: "E2E Drawer Dish" }).first();
    await expect(item).toBeVisible();
    await item.click();

    await expect(page.getByText("Fry garlic until fragrant").first()).toBeVisible();
  });
});
