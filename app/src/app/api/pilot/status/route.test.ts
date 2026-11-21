import { beforeEach, describe, expect, it, vi } from "vitest";

type EventRow = { eventName: string; properties: string | null; createdAt: string };
type RecipeRow = { firstActiveAt: string | null };

const state = vi.hoisted(() => ({
  events: [] as EventRow[],
  recipes: [{ firstActiveAt: null }] as RecipeRow[],
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: vi.fn(async () => ({ id: 7, name: "Test user", email: "test@example.com" })),
}));

vi.mock("@/db/ensure-schema", () => ({
  ensureUsageEventsTable: vi.fn(async () => undefined),
  ensurePilotFeedbackTable: vi.fn(async () => undefined),
}));

vi.mock("@/db", async () => {
  const schema = await vi.importActual<typeof import("@/db/schema")>("@/db/schema");
  // A chainable query that resolves to the rows for the table it reads.
  function query(rows: unknown[]) {
    const chain: Record<string, unknown> = {};
    for (const method of ["where", "orderBy", "limit"]) chain[method] = () => chain;
    chain.then = (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
      Promise.resolve(rows).then(resolve, reject);
    return chain;
  }
  return {
    db: {
      select: () => ({
        from: (table: unknown) => {
          if (table === schema.usageEvents) return query(state.events);
          if (table === schema.recipes) return query(state.recipes);
          return query([]);
        },
      }),
    },
  };
});

import { GET } from "./route";

async function checklist() {
  const response = await GET();
  expect(response.status).toBe(200);
  const body = (await response.json()) as {
    checklist: Array<{ id: string; completed: boolean; completedAt: string | null }>;
  };
  return Object.fromEntries(body.checklist.map((item) => [item.id, item]));
}

function event(eventName: string, properties: Record<string, unknown> | null, createdAt = "2026-11-20T10:00:00.000Z"): EventRow {
  return { eventName, properties: properties ? JSON.stringify(properties) : null, createdAt };
}

describe("GET /api/pilot/status", () => {
  beforeEach(() => {
    state.events = [];
    state.recipes = [{ firstActiveAt: null }];
  });

  it("does not tick goals for onboarding without a goal", async () => {
    state.events = [event("onboarding_completed", { has_goal: false, first_capture_mode: "voice" })];
    expect((await checklist()).onboarding.completed).toBe(false);
  });

  it("ticks goals for an old-flow onboarding that set a goal", async () => {
    state.events = [event("onboarding_completed", { has_goal: true })];
    expect((await checklist()).onboarding.completed).toBe(true);
  });

  it("ticks goals when a weekly goal is set", async () => {
    state.events = [event("weekly_goal_set", { weekly_cooking_goal: 3 }, "2026-11-19T08:00:00.000Z")];
    const item = (await checklist()).onboarding;
    expect(item.completed).toBe(true);
    expect(item.completedAt).toBe("2026-11-19T08:00:00.000Z");
  });

  it("ignores an empty shopping list", async () => {
    state.events = [event("shopping_list_generated", { item_count: 0, meal_count: 0 })];
    expect((await checklist()).shopping.completed).toBe(false);
  });

  it("ticks shopping for a list with items", async () => {
    state.events = [
      event("shopping_list_generated", { item_count: 0, meal_count: 0 }, "2026-11-18T08:00:00.000Z"),
      event("shopping_list_generated", { item_count: 4, meal_count: 1 }, "2026-11-20T08:00:00.000Z"),
    ];
    const item = (await checklist()).shopping;
    expect(item.completed).toBe(true);
    expect(item.completedAt).toBe("2026-11-20T08:00:00.000Z");
  });

  it("does not tick capture from events without an active recipe", async () => {
    state.events = [event("recipe_created", { status: "draft" }), event("ai_draft_completed", null)];
    expect((await checklist()).capture.completed).toBe(false);
  });

  it("ticks capture when an active recipe exists", async () => {
    state.recipes = [{ firstActiveAt: "2026-11-15T09:00:00.000Z" }];
    const item = (await checklist()).capture;
    expect(item.completed).toBe(true);
    expect(item.completedAt).toBe("2026-11-15T09:00:00.000Z");
  });

  it("keeps plan, cook and version event-based", async () => {
    state.events = [event("meal_planned", null), event("cook_attempt_created", null)];
    const items = await checklist();
    expect(items.plan.completed).toBe(true);
    expect(items.cook.completed).toBe(true);
    expect(items.version.completed).toBe(false);
  });
});
