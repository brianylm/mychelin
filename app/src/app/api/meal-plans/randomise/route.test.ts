import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  householdId: 3 as number | null,
  calls: [] as Array<{ logActivity: boolean; householdId: number | null; recipeId: unknown }>,
  activity: [] as Array<{ action: string; target: string | null }>,
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: vi.fn(async () => ({ id: 7, name: "Test user", email: "test@example.com" })),
}));

vi.mock("@/db/ensure-schema", () => ({
  ensurePlanningOwnershipColumns: vi.fn(async () => undefined),
  ensureMealPlanCookedAtColumn: vi.fn(async () => undefined),
  ensureMealPlanBlocksTable: vi.fn(async () => undefined),
  ensureHouseholdTables: vi.fn(async () => undefined),
  ensureMealPilotTables: vi.fn(async () => undefined),
}));

vi.mock("@/lib/households", () => ({
  getUserHousehold: vi.fn(async () => (state.householdId == null ? null : { household: { id: state.householdId } })),
  logHouseholdActivity: vi.fn(async (_h: number, _u: number, action: string, target?: string | null) => {
    state.activity.push({ action, target: target ?? null });
  }),
}));

vi.mock("@/lib/meal-plan-writes", async () => {
  const actual = await vi.importActual<typeof import("@/lib/meal-plan-writes")>("@/lib/meal-plan-writes");
  return {
    ...actual,
    createMealPlanForUser: vi.fn(async (params: { logActivity: boolean; householdId: number | null; input: { recipeId: unknown } }) => {
      state.calls.push({ logActivity: params.logActivity, householdId: params.householdId, recipeId: params.input.recipeId });
      if (params.input.recipeId === 404) return { error: "Recipe not found", status: 404 };
      return { plan: { id: state.calls.length, recipeId: params.input.recipeId } };
    }),
  };
});

import { POST } from "./route";

function request(body: unknown) {
  return new Request("http://localhost/api/meal-plans/randomise", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as unknown as Parameters<typeof POST>[0];
}

const slot = (recipeId: number) => ({ date: "2026-11-23", mealType: "dinner", recipeId, servings: 1 });

describe("POST /api/meal-plans/randomise", () => {
  beforeEach(() => {
    state.householdId = 3;
    state.calls = [];
    state.activity = [];
  });

  it("creates every slot without per-meal logs and logs one summary entry", async () => {
    const response = await POST(request({ slots: [slot(1), slot(2), slot(404)] }));
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.plans).toHaveLength(2);
    expect(body.failed).toEqual([{ index: 2, error: "Recipe not found" }]);
    expect(state.calls.every((call) => call.logActivity === false && call.householdId === 3)).toBe(true);
    expect(state.activity).toEqual([{ action: "randomized_plan", target: "2 meals" }]);
  });

  it("logs nothing for a solo user", async () => {
    state.householdId = null;
    await POST(request({ slots: [slot(1)] }));
    expect(state.activity).toEqual([]);
  });

  it("rejects empty and oversized rolls", async () => {
    expect((await POST(request({ slots: [] }))).status).toBe(400);
    expect((await POST(request({ slots: Array.from({ length: 51 }, () => slot(1)) }))).status).toBe(400);
    expect(state.calls).toHaveLength(0);
  });
});
