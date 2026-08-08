import { test, expect, type Browser, type Page } from "@playwright/test";
import {
  signup,
  createRecipe,
  cleanupUsers,
  cleanupHouseholds,
  uniqueEmail,
} from "./helpers";

const PREFIX = "e2e-hh3";
const HOUSEHOLD_PREFIX = "E2E HH3";
const PASSWORD = "E2eHouseholds123!";

async function newUserPage(
  browser: Browser,
  email: string,
  name?: string
): Promise<Page> {
  const context = await browser.newContext();
  const page = await context.newPage();
  await signup(page, email, PASSWORD, name);
  return page;
}

test.afterAll(async () => {
  await cleanupHouseholds(HOUSEHOLD_PREFIX);
  await cleanupUsers(PREFIX);
});

test.describe("households slice 3", () => {
  test.describe.configure({ timeout: 120_000 });

  test("per-recipe share, read, write isolation, import lineage, bulk share, unshare", async ({
    browser,
  }) => {
    const pageA = await newUserPage(browser, uniqueEmail(PREFIX), "Alice S3");
    const pageB = await newUserPage(browser, uniqueEmail(PREFIX), "Brian S3");
    const pageC = await newUserPage(browser, uniqueEmail(PREFIX), "Carol S3");

    // ── Setup: household with two members ───────────────────
    const createRes = await pageA.request.post("/api/households", {
      data: { name: `${HOUSEHOLD_PREFIX} Flat` },
    });
    expect(createRes.status()).toBe(201);
    const household = (await createRes.json()).household;
    expect(
      (
        await pageB.request.post("/api/households/join", {
          data: { joinCode: household.joinCode },
        })
      ).status()
    ).toBe(200);

    // ── A shares a recipe per-recipe ────────────────────────
    const recipe = await createRecipe(pageA, {
      title: "E2E HH3 Heritage Chicken",
      ingredients: [
        { name: "chicken", quantity: 600, unit: "g" },
        { name: "soy sauce", quantity: 2, unit: "tbsp" },
      ],
    });
    expect(
      (
        await pageA.request.post(`/api/recipes/${recipe.id}/household-share`, {
          data: { shared: true },
        })
      ).status()
    ).toBe(200);

    // B sees it in the household list with owner attribution.
    const bList = await (await pageB.request.get("/api/households/recipes")).json();
    const seen = bList.recipes.find((r: { id: number }) => r.id === recipe.id);
    expect(seen).toBeTruthy();
    expect(seen.ownerName).toBe("Alice S3");
    expect(seen.isOwner).toBe(false);

    // B can read the shared recipe.
    const read = await (await pageB.request.get(`/api/recipes/${recipe.id}`)).json();
    expect(read.title).toBe("E2E HH3 Heritage Chicken");
    expect(read.ingredients).toHaveLength(2);

    // B cannot write to A's shared recipe (isolation).
    expect(
      (
        await pageB.request.post(`/api/recipes/${recipe.id}/attempts`, {
          data: { notes: "nope" },
        })
      ).status()
    ).toBe(404);
    // PATCH gates on canUserAccessRecipe (not the shared-read predicate),
    // so a member gets 404 — the recipe is invisible to their writes.
    expect(
      (
        await pageB.request.patch(`/api/recipes/${recipe.id}`, {
          data: { title: "Hijacked" },
        })
      ).status()
    ).toBe(404);

    // Activity feed records the share.
    const feed = await (await pageA.request.get("/api/households")).json();
    expect(feed.activity.map((a: { action: string }) => a.action)).toContain(
      "shared_recipe"
    );

    // ── B imports → own forked copy with lineage ────────────
    const importRes = await pageB.request.post(
      `/api/households/recipes/${recipe.id}/import`
    );
    expect(importRes.status()).toBe(201);
    const imported = await importRes.json();
    const copy = await (await pageB.request.get(`/api/recipes/${imported.id}`)).json();
    expect(copy.forkedFrom).toContain(String(recipe.id));
    expect(copy.ingredients).toHaveLength(2);
    // B owns the copy → can edit it.
    expect(
      (
        await pageB.request.patch(`/api/recipes/${imported.id}`, {
          data: { title: "My copy" },
        })
      ).status()
    ).toBe(200);
    // A's original has no member-written attempts.
    const aAttempts = await (await pageA.request.get(`/api/recipes/${recipe.id}/attempts`)).json();
    expect(aAttempts).toHaveLength(0);

    // ── Solo user C sees none of it and cannot import ───────
    const cList = await (await pageC.request.get("/api/households/recipes")).json();
    expect(cList.recipes).toHaveLength(0);
    expect((await pageC.request.get(`/api/recipes/${recipe.id}`)).status()).toBe(404);
    expect(
      (
        await pageC.request.post(`/api/households/recipes/${recipe.id}/import`)
      ).status()
    ).toBe(409); // no household to import into

    // ── Bulk share covers the current library only ──────────
    const privateRecipe = await createRecipe(pageA, {
      title: "E2E HH3 Secret Laksa",
    });
    const shareAll = await (
      await pageA.request.post("/api/households/recipes")
    ).json();
    expect(shareAll.count).toBeGreaterThanOrEqual(2);
    const bList2 = await (await pageB.request.get("/api/households/recipes")).json();
    expect(bList2.recipes.map((r: { id: number }) => r.id)).toContain(
      privateRecipe.id
    );

    // Recipes created after share-all stay private.
    const postRecipe = await createRecipe(pageA, {
      title: "E2E HH3 Post-Share Curry",
    });
    const bList3 = await (await pageB.request.get("/api/households/recipes")).json();
    expect(bList3.recipes.map((r: { id: number }) => r.id)).not.toContain(
      postRecipe.id
    );

    // ── Unshare revokes read access; B's import is untouched ─
    expect(
      (
        await pageA.request.post(`/api/recipes/${recipe.id}/household-share`, {
          data: { shared: false },
        })
      ).status()
    ).toBe(200);
    const bList4 = await (await pageB.request.get("/api/households/recipes")).json();
    expect(bList4.recipes.map((r: { id: number }) => r.id)).not.toContain(recipe.id);
    expect((await pageB.request.get(`/api/recipes/${recipe.id}`)).status()).toBe(404);
    expect((await pageB.request.get(`/api/recipes/${imported.id}`)).status()).toBe(
      200
    ); // B's own copy still works
  });

  test("household view lists shared recipes for a member", async ({ browser }) => {
    const pageA = await newUserPage(browser, uniqueEmail(PREFIX), "Maya M");
    const pageB = await newUserPage(browser, uniqueEmail(PREFIX), "Noah N");
    const createRes = await pageA.request.post("/api/households", {
      data: { name: `${HOUSEHOLD_PREFIX} UI` },
    });
    const household = (await createRes.json()).household;
    await pageB.request.post("/api/households/join", {
      data: { joinCode: household.joinCode },
    });
    const recipe = await createRecipe(pageA, { title: "E2E HH3 Curry UI" });
    await pageA.request.post(`/api/recipes/${recipe.id}/household-share`, {
      data: { shared: true },
    });

    await pageB.goto("/app");
    await pageB.getByRole("button", { name: "Household" }).first().click();
    await expect(pageB.getByText("Shared recipes")).toBeVisible({ timeout: 30_000 });
    await expect(pageB.getByText("E2E HH3 Curry UI")).toBeVisible();
    // A non-owner shared recipe offers the member actions.
    await expect(pageB.getByRole("button", { name: "Import" }).first()).toBeVisible();
  });
});
