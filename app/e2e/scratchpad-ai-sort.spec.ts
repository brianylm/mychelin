import { test, expect } from "@playwright/test";
import { cleanupUsers, signup, uniqueEmail } from "./helpers";

const PREFIX = "e2e-scratchpad-ai-sort";
const PASSWORD = "E2eScratchpad123!";

test.afterAll(async () => {
  await cleanupUsers(PREFIX);
});

test.describe("scratchpad AI ingredient sorting", () => {
  test.describe.configure({ timeout: 90_000 });

  test("sorts ingredients found in dictated steps and can undo", async ({ page }, testInfo) => {
    // The "New recipe" button is the mobile floating action button; the
    // parser and AI sort under test do not depend on layout.
    test.skip(testInfo.project.name !== "mobile", "Uses the mobile New recipe button.");
    await signup(page, uniqueEmail(PREFIX), PASSWORD, "Scratchpad Sort Test");
    await page.goto("/app");

    // A new user already lands on Library. Don't tap the bottom-nav tab:
    // under `next dev` (CI) the Next dev indicator in the bottom-left corner
    // sits over it and intercepts the click.
    await expect(page.getByRole("button", { name: "Library", exact: true })).toHaveAttribute("aria-current", "page");
    await page.getByRole("button", { name: "New recipe" }).click();
    await page.getByRole("button", { name: "Write or paste recipe" }).click();

    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Recipe name").fill("Chicken rice");
    await dialog.getByLabel("Recipe notes").fill(
      "Bring water to the boil with 4 slices of ginger. Fry three cloves of chopped garlic and some shallots in chicken fat until fragrant. Add 2 cups of washed jasmine rice and cook."
    );
    await dialog.getByRole("button", { name: "Structure recipe" }).click();
    // Water, ginger, garlic, shallot, chicken fat, jasmine rice — found in the steps.
    await expect(dialog.getByRole("heading", { name: "Ingredients" }).locator(".."))
      .toContainText("6");
    await expect(dialog.getByText("Picked out of your steps")).toBeVisible();

    await page.route("**/api/capture/paste", (route) => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        recipe: {
          title: "Chicken rice",
          ingredients: [
            { name: "ginger", quantity: 4, unit: "slices" },
            { name: "garlic", quantity: 3, unit: "cloves", notes: "chopped" },
            { name: "shallots", quantity: null, unit: null },
            { name: "chicken fat", quantity: null, unit: null },
            { name: "jasmine rice", quantity: 2, unit: "cups", notes: "washed" },
          ],
          instructions: [
            { content: "Bring water to the boil with ginger." },
            { content: "Fry garlic and shallots in chicken fat until fragrant." },
            { content: "Add rice and cook." },
          ],
        },
      }),
    }));

    await dialog.getByRole("button", { name: "Sort with AI" }).click();
    await expect(dialog.getByText("Shallots", { exact: true })).toBeVisible();
    await expect(dialog.getByText("Chicken fat", { exact: true })).toBeVisible();
    await expect(dialog.getByText("Sorted with AI.")).toBeVisible();
    await expect(dialog.getByRole("heading", { name: "Ingredients" }).locator(".."))
      .toContainText("5");
    await dialog.getByRole("button", { name: "Undo" }).click();
    await expect(dialog.getByRole("heading", { name: "Ingredients" }).locator(".."))
      .toContainText("6");
  });
});
