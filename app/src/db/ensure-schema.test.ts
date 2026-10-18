import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Fake libsql client: a fixed schema answered by batch() (the shared
// snapshot) and by execute() (targeted fallback probes and DDL).
const fake = {
  objects: [] as string[],
  columns: {} as Record<string, string[]>,
  batchFails: false,
  batch: vi.fn(),
  execute: vi.fn(),
};

vi.mock("@libsql/client/web", () => ({ createClient: () => fake }));

function rows(values: Record<string, string>[]) {
  return { rows: values };
}

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("TURSO_DATABASE_URL", "libsql://test");
  fake.objects = ["recipe_attempts", "meal_plans"];
  fake.columns = { meal_plans: ["id", "cooked_at"], recipe_attempts: ["id"] };
  fake.batchFails = false;
  fake.batch.mockReset().mockImplementation(async () => {
    if (fake.batchFails) throw new Error("batch unsupported");
    return [
      rows(fake.objects.map((name) => ({ name }))),
      rows(
        Object.entries(fake.columns).flatMap(([tbl, cols]) => cols.map((col) => ({ tbl, col })))
      ),
    ];
  });
  fake.execute.mockReset().mockImplementation(async (stmt: string | { sql: string }) => {
    const sql = typeof stmt === "string" ? stmt : stmt.sql;
    const pragma = sql.match(/^PRAGMA table_info\((\w+)\)/);
    if (pragma) return rows((fake.columns[pragma[1]] ?? []).map((name) => ({ name })));
    if (sql.startsWith("SELECT name FROM sqlite_master")) {
      return rows(fake.objects.map((name) => ({ name })));
    }
    return rows([]);
  });
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("ensure-schema probes", () => {
  it("answers every ensure from one snapshot batch when the schema is current", async () => {
    const schema = await import("./ensure-schema");
    await Promise.all([schema.ensureMealPlanCookedAtColumn(), schema.ensureRecipeAttemptsTable()]);

    expect(fake.batch).toHaveBeenCalledTimes(1);
    expect(fake.execute).not.toHaveBeenCalled();
  });

  it("falls back to targeted probes when the snapshot batch fails", async () => {
    fake.batchFails = true;
    const schema = await import("./ensure-schema");
    await Promise.all([schema.ensureMealPlanCookedAtColumn(), schema.ensureRecipeAttemptsTable()]);

    const sql = fake.execute.mock.calls.map(([stmt]) => (typeof stmt === "string" ? stmt : stmt.sql));
    expect(sql.some((s) => s.startsWith("PRAGMA table_info(meal_plans)"))).toBe(true);
    expect(sql.some((s) => s.startsWith("SELECT name FROM sqlite_master"))).toBe(true);
    expect(sql.some((s) => /^(ALTER|CREATE)/.test(s))).toBe(false);
  });

  it("runs DDL for a missing column and re-reads the schema afterwards", async () => {
    fake.columns.meal_plans = ["id"];
    const schema = await import("./ensure-schema");
    await schema.ensureMealPlanCookedAtColumn();

    const sql = fake.execute.mock.calls.map(([stmt]) => (typeof stmt === "string" ? stmt : stmt.sql));
    expect(sql.some((s) => s.includes("ADD COLUMN cooked_at"))).toBe(true);

    await schema.ensureRecipeAttemptsTable();
    expect(fake.batch).toHaveBeenCalledTimes(2);
  });
});
