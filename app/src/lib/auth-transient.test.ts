/**
 * getCurrentUser must not sign people out because of one transient database
 * error (prod logged a Turso 502 on a cold instance right after signup,
 * which turned a valid session into a 401). It retries the read once, only
 * runs the schema check when the column is genuinely missing, and still
 * fails closed when the database keeps failing.
 */
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { SignJWT } from "jose";

const plan = vi.hoisted(() => ({ steps: [] as Array<"ok" | "transient" | "nocolumn">, calls: 0 }));
const row = { id: 7, name: "Ada", email: "ada@example.test", tokenVersion: 0 };

vi.mock("@/db", () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => {
            plan.calls += 1;
            const step = plan.steps.shift() ?? "ok";
            if (step === "transient") throw new Error("SERVER_ERROR: Server returned HTTP status 502");
            if (step === "nocolumn") throw new Error("SQLITE_ERROR: no such column: token_version");
            return [row];
          },
        }),
      }),
    }),
  },
}));
const ensureColumn = vi.hoisted(() => vi.fn(async () => {}));
vi.mock("@/db/ensure-schema", () => ({
  ensureUserOAuthColumns: vi.fn(async () => {}),
  ensureUserTokenVersionColumn: ensureColumn,
}));
const jar = vi.hoisted(() => new Map<string, string>());
vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: (name: string) => (jar.has(name) ? { name, value: jar.get(name)! } : undefined),
    set: () => {},
  })),
}));

import { COOKIE_NAME, getCurrentUser } from "./auth";

const SECRET = "test-secret-for-transient-auth";

beforeAll(() => {
  vi.stubEnv("JWT_SECRET", SECRET);
});

beforeEach(async () => {
  plan.steps = [];
  plan.calls = 0;
  ensureColumn.mockClear();
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  const token = await new SignJWT({ id: 7, tv: 0 })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(new TextEncoder().encode(SECRET));
  jar.set(COOKIE_NAME, token);
});

describe("getCurrentUser with an unreliable database", () => {
  it("does not run the schema check on a normal request", async () => {
    expect(await getCurrentUser()).toMatchObject({ id: 7 });
    expect(ensureColumn).not.toHaveBeenCalled();
    expect(plan.calls).toBe(1);
  });

  it("retries once after a transient error and keeps the user signed in", async () => {
    plan.steps = ["transient", "ok"];
    expect(await getCurrentUser()).toMatchObject({ id: 7, email: "ada@example.test" });
    expect(plan.calls).toBe(2);
  });

  it("still fails closed when the database keeps failing", async () => {
    plan.steps = ["transient", "transient"];
    expect(await getCurrentUser()).toBeNull();
    expect(plan.calls).toBe(2);
  });

  it("adds the token_version column only when it is missing, then reads again", async () => {
    plan.steps = ["nocolumn", "ok"];
    expect(await getCurrentUser()).toMatchObject({ id: 7 });
    expect(ensureColumn).toHaveBeenCalledTimes(1);
  });

  it("still rejects a revoked session without retrying", async () => {
    const token = await new SignJWT({ id: 7, tv: 0 })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(new TextEncoder().encode(SECRET));
    jar.set(COOKIE_NAME, token);
    row.tokenVersion = 3;
    try {
      expect(await getCurrentUser()).toBeNull();
      expect(plan.calls).toBe(1);
    } finally {
      row.tokenVersion = 0;
    }
  });
});
