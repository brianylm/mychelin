import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  getCurrentUser: vi.fn(async () => ({ id: 7, name: "Test user", email: "test@example.com" })),
}));

vi.mock("@/lib/usage-events", () => ({
  requestPath: (request: Request) => new URL(request.url).pathname,
  trackUsageEvent: vi.fn(async () => undefined),
}));

import { POST } from "./route";
import { trackUsageEvent } from "@/lib/usage-events";

const track = vi.mocked(trackUsageEvent);

function post(body: unknown) {
  return POST(new Request("http://localhost/api/usage-events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as never);
}

describe("POST /api/usage-events", () => {
  it("accepts onboarding events and forwards a valid option", async () => {
    const response = await post({ eventName: "onboarding_option_picked", properties: { option: "voice" } });

    expect(response.status).toBe(201);
    expect(track).toHaveBeenCalledWith(expect.objectContaining({
      eventName: "onboarding_option_picked",
      properties: { option: "voice" },
    }));
  });

  it("drops an invalid option", async () => {
    track.mockClear();
    const response = await post({ eventName: "onboarding_tool_opened", properties: { option: "other" } });

    expect(response.status).toBe(201);
    expect(track).toHaveBeenCalledWith(expect.objectContaining({ properties: undefined }));
  });

  it("drops all other client properties", async () => {
    track.mockClear();
    const response = await post({
      eventName: "onboarding_viewed",
      properties: { option: "url", goal: "cook more", arbitrary: true },
      extra: "ignored",
    });

    expect(response.status).toBe(201);
    expect(track).toHaveBeenCalledWith(expect.objectContaining({ properties: undefined }));
  });

  it("rejects unknown event names", async () => {
    track.mockClear();
    const response = await post({ eventName: "made_up_event" });

    expect(response.status).toBe(400);
    expect(track).not.toHaveBeenCalled();
  });
});
