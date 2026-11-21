import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  getCurrentUser: vi.fn(async () => ({ id: 7, name: "T", email: "t@example.com" })),
}));
vi.mock("@/lib/ai-extract", () => ({
  extractRecipeText: vi.fn(async () => ({ title: "Soup" })),
}));
vi.mock("@/lib/usage-events", () => ({
  requestPath: () => "/api/capture/paste",
  trackUsageEvent: vi.fn(async () => undefined),
}));
vi.mock("@/lib/rateLimit", async (orig) => ({
  ...(await orig<typeof import("@/lib/rateLimit")>()),
  checkRateLimit: vi.fn(),
}));

import { POST } from "./route";
import { checkRateLimit } from "@/lib/rateLimit";
import { extractRecipeText } from "@/lib/ai-extract";

const check = vi.mocked(checkRateLimit);
const extract = vi.mocked(extractRecipeText);

function post() {
  return POST(
    new Request("http://localhost/api/capture/paste", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "Boil water. Add noodles. Serve hot with scallions." }),
    }) as never
  );
}

describe("POST /api/capture/paste rate limit", () => {
  beforeEach(() => {
    check.mockReset();
    extract.mockClear();
  });

  it("returns 429 with usage-limit message and does not call AI", async () => {
    check.mockResolvedValue({ allowed: false, remaining: 0, retryAfterSeconds: 120 });
    const res = await post();
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("120");
    expect(await res.json()).toEqual({
      error: "You've hit the AI usage limit for now. Try again in a bit.",
      code: "quota",
    });
    expect(check).toHaveBeenCalledWith(expect.objectContaining({ name: "ai" }), "user:7");
    expect(extract).not.toHaveBeenCalled();
  });

  it("proceeds when under the limit", async () => {
    check.mockResolvedValue({ allowed: true, remaining: 5, retryAfterSeconds: 0 });
    const res = await post();
    expect(res.status).not.toBe(429);
    expect(extract).toHaveBeenCalled();
  });

  it("checks the hourly then daily presets", async () => {
    check.mockResolvedValue({ allowed: true, remaining: 5, retryAfterSeconds: 0 });
    await post();
    expect(check.mock.calls.map((c) => c[0].name)).toEqual(["ai", "ai_daily"]);
  });
});
