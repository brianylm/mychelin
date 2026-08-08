import { test, expect, type Page, type Browser } from "@playwright/test";
import {
  signup,
  createRecipe,
  cleanupUsers,
  cleanupHouseholds,
  uniqueEmail,
  devDb,
} from "./helpers";

const PREFIX = "e2e-hh2";
const HOUSEHOLD_PREFIX = "E2E HH2";
const PASSWORD = "E2eHouseholds123!";

function todayKey(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

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

test.describe("households slice 2", () => {
  // Long multi-user API flows against the dev server; first-hit route
  // compiles can be slow.
  test.describe.configure({ timeout: 120_000 });

  test("shared inventory and 2-step shopping tick → inventory", async ({
    browser,
  }) => {
    const pageA = await newUserPage(browser, uniqueEmail(PREFIX), "Alice A");
    const pageB = await newUserPage(browser, uniqueEmail(PREFIX), "Brian B");
    const pageC = await newUserPage(browser, uniqueEmail(PREFIX), "Carol C");

    // ── Setup: household with two members ───────────────────
    const createRes = await pageA.request.post("/api/households", {
      data: { name: `${HOUSEHOLD_PREFIX} Flat` },
    });
    expect(createRes.status()).toBe(201);
    const createdHousehold = (await createRes.json()).household;
    const householdId = createdHousehold.id as number;
    const code = createdHousehold.joinCode as string;
    expect(
      (await pageB.request.post("/api/households/join", { data: { joinCode: code } })).status()
    ).toBe(200);

    // ── Shared inventory: add by A visible to B, edit by B visible to A
    const addRes = await pageA.request.post("/api/inventory", {
      data: { name: "E2E Chicken", quantity: 500, unit: "g", location: "fridge" },
    });
    expect(addRes.status()).toBe(201);
    const chicken = await addRes.json();
    expect(chicken.householdId).toBe(householdId);

    const bInventory = await (await pageB.request.get("/api/inventory")).json();
    const seenByB = bInventory.find((i: { id: number }) => i.id === chicken.id);
    expect(seenByB).toBeTruthy();
    expect(seenByB.quantity).toBe(500);

    // Manual reconcile by another member.
    expect(
      (
        await pageB.request.patch(`/api/inventory/${chicken.id}`, {
          data: { quantity: 300 },
        })
      ).status()
    ).toBe(200);
    const aInventory = await (await pageA.request.get("/api/inventory")).json();
    expect(
      aInventory.find((i: { id: number }) => i.id === chicken.id)?.quantity
    ).toBe(300);

    // Isolation: solo user C sees and touches none of it.
    const cInventory = await (await pageC.request.get("/api/inventory")).json();
    expect(cInventory.find((i: { id: number }) => i.id === chicken.id)).toBeFalsy();
    expect(
      (
        await pageC.request.patch(`/api/inventory/${chicken.id}`, {
          data: { quantity: 1 },
        })
      ).status()
    ).toBe(404);

    // Attribution in the activity feed.
    const feed1 = await (await pageA.request.get("/api/households")).json();
    const actions1 = feed1.activity.map((a: { action: string }) => a.action);
    expect(actions1).toContain("added_item");
    expect(actions1).toContain("edited_item");

    // ── Blocking-aware shopping quantities ──────────────────
    const date = todayKey();
    const recipe = await createRecipe(pageA, {
      title: "E2E HH2 Chicken Rice",
      yield: "4 servings",
      ingredients: [{ name: "e2e rice", quantity: 200, unit: "g" }],
    });
    await pageA.request.post("/api/meal-plans", {
      data: { date, mealType: "dinner", recipeId: recipe.id },
    });
    // B blocks the slot → 1 of 2 members eating → quantities halve.
    await pageB.request.post("/api/meal-plans/blocks", {
      data: { date, mealType: "dinner", scope: "slot" },
    });

    const list1 = await (
      await pageA.request.get(`/api/shopping-list?startDate=${date}&endDate=${date}`)
    ).json();
    expect(list1.household?.id).toBe(householdId);
    const rice = list1.items.find((i: { name: string }) => i.name === "e2e rice");
    expect(rice).toBeTruthy();
    expect(rice.quantityNeeded).toBe(100); // 200 g × 1 serving × 1/2 eaters
    expect(rice.quantityToBuy).toBe(100);

    // Solo user's shopping list is unchanged in shape and scope.
    const cList = await (
      await pageC.request.get(`/api/shopping-list?startDate=${date}&endDate=${date}`)
    ).json();
    expect(cList.household ?? null).toBeNull();
    expect(cList.items.find((i: { name: string }) => i.name === "e2e rice")).toBeFalsy();

    // ── Step 1: tick marks bought, never touches inventory ──
    const tickRes = await pageB.request.post("/api/shopping-list/tick", {
      data: {
        key: rice.key,
        name: rice.name,
        unit: rice.unit,
        quantity: rice.quantityToBuy,
        catalogIngredientId: rice.catalogIngredientId ?? null,
      },
    });
    expect(tickRes.status()).toBe(200);
    expect(
      (await (await pageA.request.get("/api/inventory")).json()).find(
        (i: { name: string }) => i.name === "e2e rice"
      )
    ).toBeFalsy(); // tick alone must not add inventory

    const list2 = await (
      await pageA.request.get(`/api/shopping-list?startDate=${date}&endDate=${date}`)
    ).json();
    const tickedRice = list2.items.find((i: { key: string }) => i.key === rice.key);
    expect(tickedRice.ticked).toBe(true);
    expect(tickedRice.tickedByName).toBe("Brian B");

    // ── Step 2: move to inventory with an edited quantity ──
    const move1 = await (
      await pageB.request.post("/api/shopping-list/move-to-inventory", {
        data: { overrides: { [rice.key]: { quantity: 120 } } },
      })
    ).json();
    expect(move1.moved).toHaveLength(1);
    expect(move1.moved[0].quantity).toBe(120);

    const aInventory2 = await (await pageA.request.get("/api/inventory")).json();
    const movedRice = aInventory2.filter(
      (i: { name: string }) => i.name === "e2e rice"
    );
    expect(movedRice).toHaveLength(1);
    expect(movedRice[0].quantity).toBe(120);
    expect(movedRice[0].householdId).toBe(householdId);

    // Idempotency: pushing again moves nothing and double-adds nothing.
    const move2 = await (
      await pageB.request.post("/api/shopping-list/move-to-inventory", {
        data: {},
      })
    ).json();
    expect(move2.moved).toHaveLength(0);
    expect(move2.alreadyMoved.map((m: { name: string }) => m.name)).toContain(
      "e2e rice"
    );
    const aInventory3 = await (await pageA.request.get("/api/inventory")).json();
    expect(
      aInventory3.filter((i: { name: string }) => i.name === "e2e rice")
    ).toHaveLength(1);
    expect(
      aInventory3.find((i: { name: string }) => i.name === "e2e rice")?.quantity
    ).toBe(120);

    // Moved items are shown as such on the list.
    const list3 = await (
      await pageA.request.get(`/api/shopping-list?startDate=${date}&endDate=${date}`)
    ).json();
    expect(
      list3.movedItems.map((m: { name: string }) => m.name)
    ).toContain("e2e rice");

    // Attribution for the shopping actions.
    const feed2 = await (await pageA.request.get("/api/households")).json();
    const actions2 = feed2.activity.map((a: { action: string }) => a.action);
    expect(actions2).toContain("ticked_shopping_item");
    expect(actions2).toContain("moved_to_inventory");

    // ── UI: shared inventory renders for both members ───────
    await pageA.goto("/app");
    await pageA.getByRole("button", { name: "Inventory" }).first().click();
    await expect(pageA.getByText("Shared with household")).toBeVisible({
      timeout: 30_000,
    });
    await expect(pageA.getByText("E2E Chicken")).toBeVisible();
  });

  test("leave → ghost slot, block cleanup, 30-day reactivation and purge", async ({
    browser,
  }) => {
    const pageA = await newUserPage(browser, uniqueEmail(PREFIX), "Dana D");
    const pageB = await newUserPage(browser, uniqueEmail(PREFIX), "Eli E");
    const pageD = await newUserPage(browser, uniqueEmail(PREFIX), "Faye F");

    const createRes = await pageA.request.post("/api/households", {
      data: { name: `${HOUSEHOLD_PREFIX} Ghost` },
    });
    const household = (await createRes.json()).household;
    expect(
      (
        await pageB.request.post("/api/households/join", {
          data: { joinCode: household.joinCode },
        })
      ).status()
    ).toBe(200);

    // B plans their own recipe on the shared plan and blocks a slot.
    const date = todayKey();
    const recipe = await createRecipe(pageB, {
      title: "E2E HH2 Ghost Noodles",
      yield: "2 servings",
    });
    await pageB.request.post("/api/meal-plans", {
      data: { date, mealType: "dinner", recipeId: recipe.id },
    });
    await pageB.request.post("/api/meal-plans/blocks", {
      data: { date, mealType: "lunch", scope: "slot" },
    });

    // B leaves: slot stays as a ghost, B's blocks are cleaned up.
    expect((await pageB.request.post("/api/households/leave")).status()).toBe(200);
    const aView = await (
      await pageA.request.get(`/api/meal-plans?startDate=${date}&endDate=${date}`)
    ).json();
    const ghostSlot = aView.plans.find(
      (p: { recipeId: number }) => p.recipeId === recipe.id
    );
    expect(ghostSlot).toBeTruthy();
    expect(ghostSlot.ghostTitle).toBe("E2E HH2 Ghost Noodles");
    expect(ghostSlot.addedByName).toBe("Eli E");
    expect(
      aView.memberBlocks.filter((b: { userName: string }) => b.userName === "Eli E")
    ).toHaveLength(0);

    // The ghost slot is still viewable in A's planner UI.
    await pageA.goto("/app");
    await pageA.getByRole("button", { name: /^(Meal )?Plan$/ }).first().click();
    await expect(
      pageA.getByText("E2E HH2 Ghost Noodles").first()
    ).toBeVisible({ timeout: 30_000 });

    // A (last member) leaves → the 30-day deletion flow starts.
    const leaveRes = await pageA.request.post("/api/households/leave");
    expect((await leaveRes.json()).householdDeleted).toBe(true);
    expect(
      (await (await pageA.request.get("/api/households")).json()).household
    ).toBeNull();

    // Within the window the join code reactivates the household wholesale,
    // with the reactivating user as admin.
    const rejoin = await pageA.request.post("/api/households/join", {
      data: { joinCode: household.joinCode },
    });
    expect(rejoin.status()).toBe(200);
    const rejoined = await rejoin.json();
    expect(rejoined.reactivated).toBe(true);
    expect(rejoined.household.myRole).toBe("admin");
    expect(rejoined.household.id).toBe(household.id);

    // Everything survived: the ghost slot is still on the plan.
    const restored = await (
      await pageA.request.get(`/api/meal-plans?startDate=${date}&endDate=${date}`)
    ).json();
    expect(
      restored.plans.find((p: { recipeId: number }) => p.recipeId === recipe.id)
    ).toBeTruthy();

    // Admin delete starts the flow too.
    expect((await pageA.request.delete("/api/households")).status()).toBe(200);
    expect(
      (await (await pageA.request.get("/api/households")).json()).household
    ).toBeNull();

    // Past the window the join code fails cleanly and the row is purged.
    // (Time-travel the deleted_at directly — synthetic dev DB only.)
    const db = devDb();
    await db.execute({
      sql: "UPDATE households SET deleted_at = ? WHERE id = ?",
      args: [
        new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString(),
        household.id,
      ],
    });
    const lateJoin = await pageD.request.post("/api/households/join", {
      data: { joinCode: household.joinCode },
    });
    expect(lateJoin.status()).toBe(410);
    expect((await lateJoin.json()).error).toMatch(/permanently deleted/i);

    const { rows } = await db.execute({
      sql: "SELECT id FROM households WHERE id = ?",
      args: [household.id],
    });
    expect(rows).toHaveLength(0); // lazy purge ran on the join path
  });
});
