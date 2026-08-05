import { test, expect } from "@playwright/test";
import { signup, createRecipe, cleanupUsers, uniqueEmail } from "./helpers";

const PREFIX = "e2e-recipe-select";
const PASSWORD = "E2eSelect123!";

test.afterAll(async () => {
  await cleanupUsers(PREFIX);
});

test.describe("sidebar recipe selection", () => {
  test("clicking a recipe in the left panel opens it in the main view with its data", async ({
    page,
  }, testInfo) => {
    const email = uniqueEmail(PREFIX);
    await signup(page, email, PASSWORD);
    const first = await createRecipe(page, { title: "E2E First Dish" });
    const second = await createRecipe(page, { title: "E2E Second Dish" });
    void first;

    await page.goto("/app");
    // Desktop: recipes live in the sidebar. Mobile: the sidebar is a
    // closed drawer and recipes render as the main card grid.
    const item =
      testInfo.project.name === "mobile"
        ? page.getByRole("button", { name: /E2E Second Dish/ }).first()
        : page.locator("aside button", { hasText: "E2E Second Dish" }).first();
    await expect(item).toBeVisible();
    await item.click();

    // Main view shows the recipe detail with ingredients and steps
    await expect(page).toHaveURL(new RegExp(`recipe=${second.id}`));
    await expect(page.getByText("garlic").first()).toBeVisible();
    await expect(page.getByText("Fry garlic until fragrant").first()).toBeVisible();
  });
});
