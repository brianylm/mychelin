import { test, expect, type Page, type Browser } from "@playwright/test";
import { signup, createRecipe, cleanupUsers, uniqueEmail } from "./helpers";

const PREFIX = "e2e-households";
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
  await cleanupUsers(PREFIX);
});

test.describe("households slice 1", () => {
  test("membership, shared plan, per-member blocking, and isolation", async ({
    browser,
  }) => {
    const pageA = await newUserPage(browser, uniqueEmail(PREFIX), "Alice A");
    const pageB = await newUserPage(browser, uniqueEmail(PREFIX), "Brian B");
    const pageC = await newUserPage(browser, uniqueEmail(PREFIX), "Carol C");

    // ── Create + one-household-per-user gate ────────────────
    const createRes = await pageA.request.post("/api/households", {
      data: { name: "Test Flat" },
    });
    expect(createRes.status()).toBe(201);
    const created = await createRes.json();
    const joinCode = created.household.joinCode as string;
    expect(joinCode).toMatch(/^[A-Z2-9]{6}$/);
    expect(created.household.myRole).toBe("admin");

    expect(
      (await pageA.request.post("/api/households", { data: { name: "Again" } })).status()
    ).toBe(409);

    // ── Join by code ────────────────────────────────────────
    expect(
      (await pageB.request.post("/api/households/join", { data: { joinCode: "ZZZZZZ" } })).status()
    ).toBe(404);
    const joinRes = await pageB.request.post("/api/households/join", {
      data: { joinCode: joinCode.toLowerCase() }, // codes are case-insensitive
    });
    expect(joinRes.status()).toBe(200);
    expect(
      (await pageB.request.post("/api/households/join", { data: { joinCode } })).status()
    ).toBe(409);

    const hhRes = await pageA.request.get("/api/households");
    const hh = await hhRes.json();
    expect(hh.household.memberCount).toBe(2);
    expect(hh.members).toHaveLength(2);
    const memberB = hh.members.find((m: { name: string }) => m.name === "Brian B");
    const memberA = hh.members.find((m: { name: string }) => m.name === "Alice A");
    expect(memberA.role).toBe("admin");
    expect(memberB.role).toBe("member");

    // ── Shared plan visibility + attribution ────────────────
    const date = todayKey();
    const recipe = await createRecipe(pageA, {
      title: "E2E Household Chicken Rice",
      yield: "4 servings",
    });
    const planRes = await pageA.request.post("/api/meal-plans", {
      data: { date, mealType: "dinner", recipeId: recipe.id },
    });
    expect(planRes.status()).toBe(201);
    const plan = await planRes.json();
    expect(plan.householdId).toBe(hh.household.id);
    expect(plan.addedByName).toBe("Alice A");

    const bView = await (
      await pageB.request.get(`/api/meal-plans?startDate=${date}&endDate=${date}`)
    ).json();
    expect(bView.household?.id).toBe(hh.household.id);
    expect(bView.household.memberCount).toBe(2);
    const seenByB = bView.plans.find((p: { id: number }) => p.id === plan.id);
    expect(seenByB).toBeTruthy();
    expect(seenByB.addedByName).toBe("Alice A");

    // ── Isolation: solo user C sees and touches nothing ─────
    const cView = await (
      await pageC.request.get(`/api/meal-plans?startDate=${date}&endDate=${date}`)
    ).json();
    expect(cView.household ?? null).toBeNull();
    expect(cView.plans.find((p: { id: number }) => p.id === plan.id)).toBeFalsy();
    expect((await pageC.request.delete(`/api/meal-plans/${plan.id}`)).status()).toBe(404);
    expect(
      (
        await pageC.request.patch(`/api/meal-plans/${plan.id}`, {
          data: { notes: "intruder" },
        })
      ).status()
    ).toBe(404);

    // ── Per-member blocking with attribution ────────────────
    const blockRes = await pageB.request.post("/api/meal-plans/blocks", {
      data: { date, mealType: "dinner", scope: "slot" },
    });
    expect(blockRes.status()).toBe(201);

    // Blocking must NOT clear the shared slot's plans.
    const aView = await (
      await pageA.request.get(`/api/meal-plans?startDate=${date}&endDate=${date}`)
    ).json();
    expect(aView.plans.find((p: { id: number }) => p.id === plan.id)).toBeTruthy();
    const bBlock = aView.memberBlocks.find(
      (b: { date: string; mealType: string }) =>
        b.date === date && b.mealType === "dinner"
    );
    expect(bBlock).toBeTruthy();
    expect(bBlock.userName).toBe("Brian B");
    expect(bBlock.scope).toBe("slot");

    // Week scope normalizes to the week's Monday; month to the 1st.
    const weekBlockRes = await pageB.request.post("/api/meal-plans/blocks", {
      data: { date, mealType: "lunch", scope: "week" },
    });
    expect(weekBlockRes.status()).toBe(201);
    const weekBlock = await weekBlockRes.json();
    expect(weekBlock.scope).toBe("week");
    expect(new Date(weekBlock.date + "T00:00:00Z").getUTCDay()).toBe(1); // Monday

    const monthBlockRes = await pageB.request.post("/api/meal-plans/blocks", {
      data: { date, scope: "month" },
    });
    expect(monthBlockRes.status()).toBe(201);
    expect((await monthBlockRes.json()).date).toBe(`${date.slice(0, 7)}-01`);

    // Lifting the slot block removes only that scope.
    expect(
      (
        await pageB.request.delete("/api/meal-plans/blocks", {
          data: { date, mealType: "dinner", scope: "slot" },
        })
      ).status()
    ).toBe(200);
    const afterUnblock = await (
      await pageA.request.get(`/api/meal-plans?startDate=${date}&endDate=${date}`)
    ).json();
    expect(
      afterUnblock.memberBlocks.find(
        (b: { scope: string; mealType: string }) =>
          b.scope === "slot" && b.mealType === "dinner"
      )
    ).toBeFalsy();
    // The week/month blocks still cover the slot.
    expect(afterUnblock.memberBlocks.length).toBeGreaterThanOrEqual(2);

    // ── Any member can edit the shared plan ─────────────────
    expect((await pageB.request.delete(`/api/meal-plans/${plan.id}`)).status()).toBe(200);

    // ── Activity feed attribution ───────────────────────────
    const feed = await (await pageA.request.get("/api/households")).json();
    const actions = feed.activity.map((a: { action: string }) => a.action);
    expect(actions).toContain("created_household");
    expect(actions).toContain("joined_household");
    expect(actions).toContain("added_meal");
    expect(actions).toContain("blocked_slot");
    expect(actions).toContain("removed_meal");

    // ── Flat admin hierarchy ────────────────────────────────
    expect(
      (
        await pageA.request.patch("/api/households/members", {
          data: { userId: memberB.userId },
        })
      ).status()
    ).toBe(200);
    // B, now an admin, can remove the original creator.
    expect(
      (
        await pageB.request.delete("/api/households/members", {
          data: { userId: memberA.userId },
        })
      ).status()
    ).toBe(200);
    const aAfter = await (await pageA.request.get("/api/households")).json();
    expect(aAfter.household).toBeNull();

    // ── Leave ───────────────────────────────────────────────
    expect((await pageB.request.post("/api/households/leave")).status()).toBe(200);
    const bAfter = await (await pageB.request.get("/api/households")).json();
    expect(bAfter.household).toBeNull();
  });

  test("household UI: create/join surfaces, planner chips and scaled servings", async ({
    browser,
  }) => {
    const pageA = await newUserPage(browser, uniqueEmail(PREFIX), "Dan D");
    const pageB = await newUserPage(browser, uniqueEmail(PREFIX), "Eve E");

    // A creates a household through the UI. First-hit route compiles in
    // the dev server can be slow, so the wait is generous.
    await pageA.goto("/app");
    await pageA.getByRole("button", { name: "Household" }).first().click();
    await pageA.getByLabel("Household name").fill("UI Test Home");
    await pageA.getByRole("button", { name: "Create" }).click();
    await expect(pageA.getByText("Join code", { exact: true })).toBeVisible({ timeout: 30_000 });
    await expect(pageA.getByText("Admin", { exact: true })).toBeVisible();

    const joinCode = (
      await (await pageA.request.get("/api/households")).json()
    ).household.joinCode as string;

    // B joins, plans a meal; A sees it with attribution.
    expect(
      (await pageB.request.post("/api/households/join", { data: { joinCode } })).status()
    ).toBe(200);
    const date = todayKey();
    const recipe = await createRecipe(pageB, {
      title: "E2E Shared Noodles",
      yield: "4 servings",
    });
    await pageB.request.post("/api/meal-plans", {
      data: { date, mealType: "dinner", recipeId: recipe.id },
    });

    await pageA.goto("/app");
    await pageA.getByRole("button", { name: /^(Meal )?Plan$/ }).first().click();
    await expect(pageA.getByText("E2E Shared Noodles").first()).toBeVisible({ timeout: 30_000 });
    await expect(pageA.getByText("added by Eve E").first()).toBeVisible();

    // B blocks the slot for themselves; A sees the chip + scaled servings
    // (4-yield recipe, 2 members, 1 out → serves 2 of 4).
    await pageB.request.post("/api/meal-plans/blocks", {
      data: { date, mealType: "dinner", scope: "slot" },
    });
    await pageA.goto("/app");
    await pageA.getByRole("button", { name: /^(Meal )?Plan$/ }).first().click();
    await expect(pageA.getByText("Out: Eve E").first()).toBeVisible({ timeout: 30_000 });
    await expect(pageA.getByText("serves 2 of 4").first()).toBeVisible();
    // The plan itself stays — blocking never clears shared slots.
    await expect(pageA.getByText("E2E Shared Noodles").first()).toBeVisible();

    // A's activity feed shows the join + block attribution.
    await pageA.getByRole("button", { name: "Household" }).first().click();
    await expect(pageA.getByText("Eve E joined")).toBeVisible();
    await expect(
      pageA.getByText(`Eve E is out for dinner on ${date}`)
    ).toBeVisible();

    // B sees the same shared plan in their own UI.
    await pageB.goto("/app");
    await pageB.getByRole("button", { name: /^(Meal )?Plan$/ }).first().click();
    await expect(pageB.getByText("E2E Shared Noodles").first()).toBeVisible();
  });
});
