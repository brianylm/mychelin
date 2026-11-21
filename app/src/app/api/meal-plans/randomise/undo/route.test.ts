import { beforeEach, describe, expect, it, vi } from "vitest";

type PlanRow = { id: number; userId: number | null; householdId: number | null };

const state = vi.hoisted(() => ({
  plans: [] as PlanRow[],
  memberships: new Set<number>(),
  deletes: 0,
  activity: [] as Array<{ householdId: number; userId: number; action: string; target: string | null }>,
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: vi.fn(async () => ({ id: 7, name: "Test user", email: "test@example.com" })),
}));

vi.mock("@/db/ensure-schema", () => ({
  ensurePlanningOwnershipColumns: vi.fn(async () => undefined),
  ensureMealPlanCookedAtColumn: vi.fn(async () => undefined),
  ensureHouseholdTables: vi.fn(async () => undefined),
  ensureMealPilotTables: vi.fn(async () => undefined),
}));

vi.mock("@/lib/households", () => ({
  isHouseholdMember: vi.fn(async (_userId: number, householdId: number) => state.memberships.has(householdId)),
  logHouseholdActivity: vi.fn(async (householdId: number, userId: number, action: string, target?: string | null) => {
    state.activity.push({ householdId, userId, action, target: target ?? null });
  }),
}));

vi.mock("@/db", () => ({
  db: {
    // The mock returns every seeded row; tests only seed rows they request.
    select: () => ({
      from: () => ({ where: async () => state.plans }),
    }),
    delete: () => ({
      where: async () => {
        state.deletes += 1;
      },
    }),
  },
}));

import { POST } from "./route";

function request(body: unknown) {
  return new Request("http://localhost/api/meal-plans/randomise/undo", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as unknown as Parameters<typeof POST>[0];
}

describe("POST /api/meal-plans/randomise/undo", () => {
  beforeEach(() => {
    state.plans = [];
    state.memberships = new Set([3]);
    state.deletes = 0;
    state.activity = [];
  });

  it("deletes only the caller's own rows and logs one household entry", async () => {
    state.plans = [
      { id: 1, userId: 7, householdId: 3 }, // caller's rolled meal on the shared plan
      { id: 2, userId: 7, householdId: 3 },
      { id: 3, userId: 8, householdId: 3 }, // another member's meal, same household
      { id: 4, userId: 9, householdId: 5 }, // a household the caller is not in
      { id: 5, userId: 9, householdId: null }, // someone else's personal plan
    ];
    const response = await POST(request({ ids: [1, 2, 3, 4, 5, 99] }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.deleted).toEqual([1, 2]);
    expect(body.failed).toEqual([3, 4, 5, 99]);
    expect(state.deletes).toBe(1);
    expect(state.activity).toEqual([
      { householdId: 3, userId: 7, action: "undid_randomize", target: "2 meals" },
    ]);
  });

  it("logs nothing for personal plans", async () => {
    state.plans = [{ id: 1, userId: 7, householdId: null }];
    const body = await (await POST(request({ ids: [1] }))).json();
    expect(body).toEqual({ deleted: [1], failed: [] });
    expect(state.activity).toEqual([]);
  });

  it("deletes nothing when no id is authorized", async () => {
    state.plans = [{ id: 4, userId: 9, householdId: 5 }];
    const body = await (await POST(request({ ids: [4] }))).json();
    expect(body).toEqual({ deleted: [], failed: [4] });
    expect(state.deletes).toBe(0);
    expect(state.activity).toEqual([]);
  });

  it("rejects bad or oversized id lists", async () => {
    expect((await POST(request({ ids: [] }))).status).toBe(400);
    expect((await POST(request({ ids: ["1"] }))).status).toBe(400);
    expect((await POST(request({ ids: [1.5] }))).status).toBe(400);
    expect((await POST(request({ ids: Array.from({ length: 51 }, (_, i) => i + 1) }))).status).toBe(400);
    expect(state.deletes).toBe(0);
  });

  it("requires a signed-in user", async () => {
    const auth = await import("@/lib/auth");
    vi.mocked(auth.getCurrentUser).mockResolvedValueOnce(null);
    expect((await POST(request({ ids: [1] }))).status).toBe(401);
  });
});
