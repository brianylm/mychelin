import {
  test,
  expect,
  type APIResponse,
  type Browser,
  type Page,
} from "@playwright/test";
import {
  cleanupHouseholds,
  cleanupUsers,
  createRecipe,
  devDb,
  signup,
  uniqueEmail,
} from "./helpers";
import type {
  ApiErrorResponse,
  MealGroupResponse,
  MealGroupView,
  PreparedBatchResponse,
  PreparedBatchView,
  PreparedLotView,
  PreparedStorage,
} from "@/lib/meal-pilot/types";

const PREFIX = "e2e-meal-pilot";
const HOUSEHOLD_PREFIX = "E2E MP HH";
const PASSWORD = "E2eMealPilot123!";

function dateKeyOffset(offsetDays: number): string {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function serveAtFor(dateKey: string, hour = 19): string {
  return new Date(
    `${dateKey}T${String(hour).padStart(2, "0")}:00:00+08:00`
  ).toISOString();
}

async function json<T>(res: APIResponse): Promise<T> {
  if (!res.ok()) {
    throw new Error(`Request failed: ${res.status()} ${await res.text()}`);
  }
  return (await res.json()) as T;
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

async function createPreparedBatch(
  page: Page,
  title: string,
  lots: Array<{ storage: PreparedStorage; portions: number }>
): Promise<PreparedBatchView> {
  const res = await page.request.post("/api/prepared-batches", {
    data: { title, lots },
  });
  const body = await json<PreparedBatchResponse>(res);
  return body.batch;
}

async function getPreparedBatch(
  page: Page,
  id: number
): Promise<PreparedBatchView> {
  const res = await page.request.get(`/api/prepared-batches/${id}`);
  const body = await json<PreparedBatchResponse>(res);
  return body.batch;
}

function lotFor(
  batch: PreparedBatchView,
  storage: PreparedStorage
): PreparedLotView {
  const lot = batch.lots.find((candidate) => candidate.storage === storage);
  if (!lot) {
    throw new Error(`Prepared batch "${batch.title}" has no ${storage} lot`);
  }
  return lot;
}

async function createMealGroup(
  page: Page,
  date: string
): Promise<MealGroupView> {
  const res = await page.request.post("/api/meal-groups", {
    data: {
      date,
      mealType: "dinner",
      serveAt: serveAtFor(date),
      timezone: "Asia/Singapore",
      dinerCount: 2,
    },
  });
  const body = await json<MealGroupResponse>(res);
  return body.mealGroup;
}

async function addPreparedDish(
  page: Page,
  meal: MealGroupView,
  lotId: number,
  portions: number,
  idempotencyKey: string
): Promise<APIResponse> {
  return page.request.post(`/api/meal-groups/${meal.id}/prepared-dishes`, {
    data: {
      expectedRevision: meal.revision,
      lotId,
      portions,
      idempotencyKey,
    },
  });
}

async function dismissPastMealReviewIfNeeded(
  page: Page,
  serveAt: string
): Promise<void> {
  // A today/19:00 meal is already reviewable when the suite runs after
  // dinner. Park the prompt so it cannot cover the planner; test 4 covers
  // the review flow itself.
  if (new Date(serveAt).getTime() >= Date.now()) return;
  await page
    .getByRole("button", { name: "Later", exact: true })
    .click({ timeout: 30_000 });
  await expect(page.getByText("Did you complete these meals?")).toBeHidden();
}

test.afterAll(async () => {
  await cleanupHouseholds(HOUSEHOLD_PREFIX);
  await cleanupUsers(PREFIX);
});

test.describe("meal pilot slice 1", () => {
  test("six portions split fridge/freezer and allocated 2+2+2; excess and racing allocations rejected", async ({
    browser,
  }) => {
    const page = await newUserPage(browser, uniqueEmail(PREFIX), "MP Cook One");

    const batch = await createPreparedBatch(page, "E2E MP Batch Six", [
      { storage: "fridge", portions: 2 },
      { storage: "freezer", portions: 4 },
    ]);
    const fridgeLot = lotFor(batch, "fridge");
    const freezerLot = lotFor(batch, "freezer");

    const meal1 = await createMealGroup(page, dateKeyOffset(1));
    const meal2 = await createMealGroup(page, dateKeyOffset(2));
    const meal3 = await createMealGroup(page, dateKeyOffset(3));

    const allocation1 = await addPreparedDish(
      page,
      meal1,
      fridgeLot.id,
      2,
      crypto.randomUUID()
    );
    expect(allocation1.ok()).toBe(true);
    const allocated1 = await json<MealGroupResponse>(allocation1);

    const allocation2 = await addPreparedDish(
      page,
      meal2,
      freezerLot.id,
      2,
      crypto.randomUUID()
    );
    expect(allocation2.ok()).toBe(true);
    const allocated2 = await json<MealGroupResponse>(allocation2);

    const allocation3 = await addPreparedDish(
      page,
      meal3,
      freezerLot.id,
      2,
      crypto.randomUUID()
    );
    expect(allocation3.ok()).toBe(true);
    const allocated3 = await json<MealGroupResponse>(allocation3);

    expect(allocated1.mealGroup.dishes).toHaveLength(1);
    expect(allocated2.mealGroup.dishes).toHaveLength(1);
    expect(allocated3.mealGroup.dishes).toHaveLength(1);

    const fullyAllocated = await getPreparedBatch(page, batch.id);
    expect(fullyAllocated.totalPhysicalPortions).toBe(6);
    expect(fullyAllocated.totalReservedPortions).toBe(6);
    expect(fullyAllocated.totalUnallocatedPortions).toBe(0);

    // A fourth meal cannot reserve the already-allocated freezer stock.
    const meal4 = await createMealGroup(page, dateKeyOffset(4));
    const excess = await addPreparedDish(
      page,
      meal4,
      freezerLot.id,
      1,
      crypto.randomUUID()
    );
    expect(excess.status()).toBe(409);
    const excessBody = (await excess.json()) as ApiErrorResponse;
    expect(excessBody.code).toBe("INSUFFICIENT_PORTIONS");

    // Two meals race for the only portion in a fresh one-portion lot.
    const raceBatch = await createPreparedBatch(page, "E2E MP Batch Race", [
      { storage: "freezer", portions: 1 },
    ]);
    const raceLot = lotFor(raceBatch, "freezer");
    const raceMealA = await createMealGroup(page, dateKeyOffset(5));
    const raceMealB = await createMealGroup(page, dateKeyOffset(6));
    const raceKeyA = crypto.randomUUID();
    const raceKeyB = crypto.randomUUID();

    const raceResults = await Promise.all([
      addPreparedDish(page, raceMealA, raceLot.id, 1, raceKeyA),
      addPreparedDish(page, raceMealB, raceLot.id, 1, raceKeyB),
    ]);
    const raceSuccesses = raceResults.filter((res) => res.ok());
    const raceFailures = raceResults.filter((res) => !res.ok());
    expect(raceSuccesses).toHaveLength(1);
    expect(raceFailures).toHaveLength(1);
    expect(raceFailures[0].status()).toBe(409);

    const winnerIndex = raceResults.findIndex((res) => res.ok());
    const winner = await json<MealGroupResponse>(raceResults[winnerIndex]);
    const winnerKey = winnerIndex === 0 ? raceKeyA : raceKeyB;

    // Replaying the same key is a no-op, even with the meal's latest revision.
    const replay = await addPreparedDish(
      page,
      winner.mealGroup,
      raceLot.id,
      1,
      winnerKey
    );
    expect(replay.ok()).toBe(true);
    const replayed = await json<MealGroupResponse>(replay);
    expect(replayed.mealGroup.revision).toBe(winner.mealGroup.revision);

    const raceAfter = await getPreparedBatch(page, raceBatch.id);
    expect(raceAfter.totalReservedPortions).toBe(1);
  });

  test("a meal with two fresh dishes and a frozen dish shows in the planner with source labels", async ({
    browser,
  }) => {
    const page = await newUserPage(browser, uniqueEmail(PREFIX), "MP Cook Two");
    const rice = await createRecipe(page, { title: "E2E MP Rice" });
    const greens = await createRecipe(page, { title: "E2E MP Greens" });
    const batch = await createPreparedBatch(page, "E2E MP Frozen Soup", [
      { storage: "freezer", portions: 2 },
    ]);
    const freezerLot = lotFor(batch, "freezer");

    const todayKey = dateKeyOffset(0);
    const meal = await createMealGroup(page, todayKey);
    let revision = meal.revision;
    for (const recipe of [rice, greens]) {
      const res = await page.request.post(
        `/api/meal-groups/${meal.id}/fresh-dishes`,
        {
          data: {
            expectedRevision: revision,
            recipeId: recipe.id,
            targetPortions: 2,
          },
        }
      );
      revision = (await json<MealGroupResponse>(res)).mealGroup.revision;
    }

    const preparedRes = await page.request.post(
      `/api/meal-groups/${meal.id}/prepared-dishes`,
      {
        data: {
          expectedRevision: revision,
          lotId: freezerLot.id,
          portions: 2,
          idempotencyKey: crypto.randomUUID(),
        },
      }
    );
    await json<MealGroupResponse>(preparedRes);

    await page.goto("/app");
    await dismissPastMealReviewIfNeeded(page, serveAtFor(todayKey));
    await page
      .getByRole("button", { name: /^(Meal )?Plan$/ })
      .first()
      .click();
    await expect(page.getByText("E2E MP Rice").first()).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText("E2E MP Greens")).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText("E2E MP Frozen Soup")).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText("Ready — frozen").first()).toBeVisible();
    await expect(page.getByText("Cook fresh").first()).toBeVisible();
  });

  test("ready meals show in inventory", async ({ browser }) => {
    const page = await newUserPage(
      browser,
      uniqueEmail(PREFIX),
      "MP Cook Three"
    );
    await createPreparedBatch(page, "E2E MP Curry", [
      { storage: "fridge", portions: 3 },
    ]);

    await page.goto("/app");
    await page
      .getByRole("button", { name: "Inventory", exact: true })
      .first()
      .click();
    await expect(
      page.getByRole("heading", { name: "Ready meals" })
    ).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("E2E MP Curry")).toBeVisible();
    await expect(page.getByText("3 portions · 0 planned · 3 free")).toBeVisible();
  });

  test("next-visit review confirms a past meal exactly once", async ({
    browser,
  }) => {
    const page = await newUserPage(
      browser,
      uniqueEmail(PREFIX),
      "MP Cook Four"
    );
    const batch = await createPreparedBatch(page, "E2E MP Laksa", [
      { storage: "freezer", portions: 4 },
    ]);
    const freezerLot = lotFor(batch, "freezer");
    const meal = await createMealGroup(page, dateKeyOffset(-1));
    const allocation = await addPreparedDish(
      page,
      meal,
      freezerLot.id,
      2,
      crypto.randomUUID()
    );
    expect(allocation.ok()).toBe(true);

    await page.goto("/app");
    await expect(page.getByText("Did you complete these meals?")).toBeVisible({
      timeout: 30_000,
    });
    await page
      .getByRole("button", { name: "Yes, as planned" })
      .first()
      .click();
    await expect(
      page.getByText("Did you complete these meals?")
    ).toBeHidden({ timeout: 30_000 });

    const confirmed = await getPreparedBatch(page, batch.id);
    expect(confirmed.totalPhysicalPortions).toBe(2);
    expect(confirmed.totalReservedPortions).toBe(0);

    await page.reload();
    await expect(
      page.getByRole("button", { name: "Inventory", exact: true }).first()
    ).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("Did you complete these meals?")).toHaveCount(
      0
    );
  });

  test("purging a household with reserved ready food succeeds", async ({
    browser,
  }) => {
    const page = await newUserPage(browser, uniqueEmail(PREFIX), "MP Cook Five");

    const createRes = await page.request.post("/api/households", {
      data: { name: `${HOUSEHOLD_PREFIX} Purge` },
    });
    expect(createRes.status()).toBe(201);
    const household = (await createRes.json()).household as {
      id: number;
      joinCode: string;
    };

    const batch = await createPreparedBatch(page, "E2E MP Household Curry", [
      { storage: "fridge", portions: 2 },
    ]);
    const fridgeLot = lotFor(batch, "fridge");
    const meal = await createMealGroup(page, dateKeyOffset(1));
    const allocation = await addPreparedDish(
      page,
      meal,
      fridgeLot.id,
      2,
      crypto.randomUUID()
    );
    expect(allocation.ok()).toBe(true);

    const db = devDb();
    const scopedBatch = await db.execute({
      sql: "SELECT household_id FROM prepared_batches WHERE id = ?",
      args: [batch.id],
    });
    expect(Number(scopedBatch.rows[0]?.household_id)).toBe(household.id);

    const leaveRes = await page.request.post("/api/households/leave");
    expect(leaveRes.status()).toBe(200);
    expect((await leaveRes.json()).householdDeleted).toBe(true);

    await db.execute({
      sql: "UPDATE households SET deleted_at = ? WHERE id = ?",
      args: [
        new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString(),
        household.id,
      ],
    });

    const lateJoin = await page.request.post("/api/households/join", {
      data: { joinCode: household.joinCode },
    });
    expect(lateJoin.status()).toBe(410);
    expect((await lateJoin.json()).error).toMatch(/permanently deleted/i);

    const householdCount = await db.execute({
      sql: "SELECT count(*) AS count FROM households WHERE id = ?",
      args: [household.id],
    });
    expect(Number(householdCount.rows[0].count)).toBe(0);

    const batchCount = await db.execute({
      sql: "SELECT count(*) AS count FROM prepared_batches WHERE household_id = ?",
      args: [household.id],
    });
    expect(Number(batchCount.rows[0].count)).toBe(0);
  });
});
