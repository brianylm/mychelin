import { mkdir } from "node:fs/promises";
import path from "node:path";
import { test, expect, type Locator } from "@playwright/test";
import { cleanupUsers, createRecipe, signup, uniqueEmail } from "./helpers";

const PREFIX = "e2e-verify-screens";
const shots = path.resolve(__dirname, "../../.verify/shots");
test.use({ timezoneId: "Asia/Singapore" });

test("verification screenshots of the home cooking loop", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "Verification screenshots use the mobile viewport.");
  test.setTimeout(120_000);
  await mkdir(shots, { recursive: true });
  const screenshot = async (name: string, key: Locator, alsoVisible: Locator[] = []) => {
    // The app scrolls inside its views: fullPage does not reveal that content.
    await key.scrollIntoViewIfNeeded();
    // Center it in the inner scroller, leaving room for adjacent recipe rows
    // and keeping the key content clear of the fixed bottom navigation.
    await key.evaluate((element) => element.scrollIntoView({ block: "center", inline: "nearest", behavior: "instant" }));
    for (const element of [key, ...alsoVisible]) {
      await expect(element).toBeInViewport({ ratio: 1 });
    }
    await page.screenshot({ path: path.join(shots, `${name}.png`), scale: "css" });
  };

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Cook like home, even in your new home." })).toBeVisible();
  await screenshot("landing", page.getByRole("heading", { name: "Cook like home, even in your new home." }));

  try {
    await signup(page, uniqueEmail(PREFIX), "VerifyScreens123!", "Verify Cook", { onboarded: true });
    const recipe = await createRecipe(page, {
      title: "Family garlic rice",
      yield: "2 servings",
      ingredients: [
        { name: "garlic", quantity: 3, unit: "clove" },
        { name: "rice", quantity: 200, unit: "g" },
      ],
      instructions: [
        { content: "Fry garlic until fragrant" },
        { content: "Add rice and toss for 2 min" },
      ],
    });
    await page.goto("/app");
    await expect(page.getByRole("heading", { name: "Your Recipes" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Open Family garlic rice" })).toBeVisible();
    const dismissMission = page.getByRole("button", { name: "Not now — keep the mission for later" });
    // Wait for the async rhythm query before dismissing, so it cannot appear
    // after an early absence check. Keep the shell mounted for the next shots.
    await expect(dismissMission).toBeVisible();
    await dismissMission.click();
    await expect(dismissMission).toHaveCount(0);
    await screenshot("app-home", page.getByRole("button", { name: "Open Family garlic rice" }));

    await page.getByRole("button", { name: "Open Family garlic rice" }).click();
    await expect(page.getByRole("tab", { name: "Recipe", exact: true })).toBeVisible();
    await expect(page.getByText("Fry garlic until fragrant").first()).toBeVisible();
    // A screenshot must foreground the recipe, without the first-cook prompt.
    await expect(dismissMission).toHaveCount(0);
    await screenshot("recipe-detail", page.getByText("Fry garlic until fragrant").first(), [
      page.getByText("garlic", { exact: true }).first(),
      page.getByText("Add rice and toss for 2 min").first(),
    ]);

    await page.getByRole("tab", { name: "Card", exact: true }).click();
    await expect(page.getByRole("region", { name: "Cooking card timeline" })).toBeVisible();
    await screenshot("cooking-card", page.getByRole("region", { name: "Cooking card timeline" }));

    // Seed planning after recipe shots so the separate Next meal panel cannot
    // squeeze the reading/grid viewport. Today is in both default date ranges.
    const date = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Singapore" }).format(new Date());
    const plan = await page.request.post("/api/meal-plans", {
      // servings is a multiplier of the recipe's yield, not a head count:
      // 1 = one batch, as the planner UI creates it.
      data: { date, mealType: "dinner", recipeId: recipe.id, servings: 1 },
    });
    expect(plan.status()).toBe(201);
    const list = await page.request.get(`/api/shopping-list?startDate=${date}&endDate=${date}`);
    expect(list.ok()).toBe(true);
    expect((await list.json()).items).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: "garlic", quantityNeeded: 3 })])
    );

    await page.getByRole("button", { name: /^(Meal )?Plan$/ }).first().click();
    await page.getByRole("button", { name: "Week", exact: true }).click();
    await expect(page.getByRole("button", { name: /Randomize week/i })).toBeVisible();
    const plannedDish = page.getByRole("button", { name: `Remove ${recipe.title}`, exact: true }).locator("..");
    await expect(plannedDish.getByText(recipe.title, { exact: true })).toBeVisible();
    await screenshot("planner", plannedDish);

    await page.getByRole("button", { name: "Shopping", exact: true }).first().click();
    await expect(page.getByRole("heading", { name: "Shopping List" })).toBeVisible();
    await expect(page.getByText("garlic", { exact: true }).first()).toBeVisible();
    await screenshot("shopping-list", page.getByText("garlic", { exact: true }).first(), [
      page.getByText("rice", { exact: true }).first(),
    ]);

    await page.getByRole("button", { name: /^Open profile for / }).first().click();
    await expect(page.getByRole("heading", { name: "Profile & Settings" })).toBeVisible();
    await screenshot("profile", page.getByRole("heading", { name: "Profile & Settings" }));
  } finally {
    await cleanupUsers(PREFIX);
  }
});
