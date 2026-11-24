import { beforeEach, describe, expect, it, vi } from "vitest";

const dbGet = vi.fn();
vi.mock("@/db", () => ({ db: { get: (...args: unknown[]) => dbGet(...args) } }));

import { GET } from "./route";

describe("GET /api/health", () => {
  beforeEach(() => {
    dbGet.mockReset();
  });

  it("returns 200 with ok when the database answers", async () => {
    dbGet.mockResolvedValue({ ok: 1 });
    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    const body = await res.json();
    expect(body).toMatchObject({ ok: true, db: true });
    expect(typeof body.ms).toBe("number");
  });

  it("returns 503 when the database throws, without leaking the error", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    dbGet.mockRejectedValue(new Error("libsql://secret-host.turso.io refused"));
    const res = await GET();
    expect(res.status).toBe(503);
    const text = JSON.stringify(await res.json());
    expect(text).toContain('"ok":false');
    expect(text).not.toContain("turso");
  });

  it("returns 503 when the database hangs past the timeout", async () => {
    vi.useFakeTimers();
    vi.spyOn(console, "error").mockImplementation(() => {});
    dbGet.mockReturnValue(new Promise(() => {}));
    const pending = GET();
    await vi.advanceTimersByTimeAsync(8100);
    const res = await pending;
    vi.useRealTimers();
    expect(res.status).toBe(503);
  });
});
