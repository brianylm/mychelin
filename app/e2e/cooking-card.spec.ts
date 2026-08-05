import { test, expect } from "@playwright/test";
import { signup, createRecipe, cleanupUsers, uniqueEmail } from "./helpers";

const PREFIX = "e2e-cooking-card";
const PASSWORD = "E2eCard123!";

test.afterAll(async () => {
  await cleanupUsers(PREFIX);
});

test.describe("cooking card view", () => {
  test("Recipe/Card toggle switches between the list and the timeline grid", async ({
    page,
  }) => {
    await signup(page, uniqueEmail(PREFIX), PASSWORD);
    const recipe = await createRecipe(page, { title: "E2E Card Dish" });

    await page.goto(`/app?recipe=${recipe.id}`);
    await expect(page.getByText("garlic").first()).toBeVisible();

    // Switch to Card view: step cards and the dot matrix appear
    await page.getByRole("tab", { name: "Card" }).click();
    await expect(page.getByRole("region", { name: "Cooking card timeline" })).toBeVisible();
    await expect(page.getByText("Fry").first()).toBeVisible();

    // And back to Recipe view
    await page.getByRole("tab", { name: "Recipe" }).click();
    await expect(page.getByText("Fry garlic until fragrant").first()).toBeVisible();
  });
});
