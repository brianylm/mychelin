import { test, expect } from "@playwright/test";
import { signup, cleanupUsers, uniqueEmail } from "./helpers";

const PREFIX = "e2e-view-url";
const PASSWORD = "E2eViewUrl123!";

test.afterAll(async () => {
  await cleanupUsers(PREFIX);
});

const planButton = (page: import("@playwright/test").Page) =>
  page.getByRole("button", { name: /^(Meal )?Plan$/ }).first();
const shoppingButton = (page: import("@playwright/test").Page) =>
  page.getByRole("button", { name: /^Shopping( list)?$/i }).first();
const randomize = (page: import("@playwright/test").Page) =>
  page.getByRole("button", { name: /Randomize week/i });

test.describe("view in the URL", () => {
  test("reload keeps the tab and Back steps through tabs", async ({ page }) => {
    await signup(page, uniqueEmail(PREFIX), PASSWORD);
    await page.goto("/app");

    await planButton(page).click();
    await expect(page).toHaveURL(/view=plan/);
    await expect(randomize(page)).toBeVisible();

    await page.reload();
    await expect(randomize(page)).toBeVisible();

    await shoppingButton(page).click();
    await expect(page).toHaveURL(/view=shopping/);
    await expect(randomize(page)).toBeHidden();

    await page.goBack();
    await expect(page).toHaveURL(/view=plan/);
    await expect(randomize(page)).toBeVisible();
  });

  test("deep link opens the requested tab", async ({ page }) => {
    await signup(page, uniqueEmail(PREFIX), PASSWORD);
    await page.goto("/app?view=fridge");
    await expect(page).toHaveURL(/view=fridge/);
    await expect(randomize(page)).toBeHidden();
    await expect(planButton(page)).toBeVisible();
  });
});
