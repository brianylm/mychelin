import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const send = vi.hoisted(() => vi.fn());
vi.mock("resend", () => ({
  Resend: class {
    emails = { send };
  },
}));

describe("sendPasswordResetEmail", () => {
  beforeEach(() => {
    vi.resetModules();
    send.mockReset();
    vi.stubEnv("RESEND_API_KEY", "re_test");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("logs a send that Resend refuses (returned error, not thrown) without throwing", async () => {
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
    send.mockResolvedValue({
      data: null,
      error: { name: "validation_error", message: "You can only send testing emails to your own email address" },
    });
    const { sendPasswordResetEmail } = await import("./email");
    await expect(sendPasswordResetEmail("someone@example.com", "https://x/reset?token=secret", "Sam")).resolves.toBeUndefined();
    expect(errorLog).toHaveBeenCalledTimes(1);
    const logged = errorLog.mock.calls[0].join(" ");
    expect(logged).toContain("validation_error");
    expect(logged).not.toContain("token=secret");
  });

  it("logs nothing when the send succeeds", async () => {
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
    send.mockResolvedValue({ data: { id: "1" }, error: null });
    const { sendPasswordResetEmail } = await import("./email");
    await sendPasswordResetEmail("owner@example.com", "https://x/reset", "Sam");
    expect(errorLog).not.toHaveBeenCalled();
  });
});
