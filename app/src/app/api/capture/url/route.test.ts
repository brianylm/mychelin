import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  getCurrentUser: vi.fn(async () => ({ id: 1, name: "T", email: "t@example.com" })),
}));
vi.mock("@/lib/ai-rate-limit", () => ({ enforceAiLimit: vi.fn(async () => null) }));
vi.mock("@/lib/ai-extract", () => ({
  extractRecipeText: vi.fn(async () => ({ ok: false })),
}));

import { POST } from "./route";

function req(url: string) {
  return new Request("http://localhost/api/capture/url", {
    method: "POST",
    body: JSON.stringify({ url }),
  }) as never;
}

afterEach(() => vi.unstubAllGlobals());

describe("POST /api/capture/url SSRF guard", () => {
  it("refuses a direct private URL without fetching", async () => {
    const f = vi.fn();
    vi.stubGlobal("fetch", f);
    const res = await POST(req("http://2130706433/"));
    expect(res.status).toBe(400);
    expect(f).not.toHaveBeenCalled();
  });

  it("refuses a redirect to the metadata IP", async () => {
    const f = vi.fn(async () =>
      new Response(null, { status: 302, headers: { location: "http://169.254.169.254/latest/meta-data/" } })
    );
    vi.stubGlobal("fetch", f);
    const res = await POST(req("https://example.com/recipe"));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("That link can't be imported.");
    expect(f).toHaveBeenCalledTimes(1);
  });

  it("follows a safe redirect and reads the page", async () => {
    const html = "<html><body>" + "Mix flour and water. ".repeat(5) + "</body></html>";
    const f = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 301, headers: { location: "/final" } }))
      .mockResolvedValueOnce(new Response(html, { status: 200, headers: { "content-type": "text/html" } }));
    vi.stubGlobal("fetch", f);
    const res = await POST(req("https://example.com/a"));
    expect(res.status).toBe(200);
    expect(f.mock.calls[1][0]).toBe("https://example.com/final");
  });

  it("gives up after 5 redirects", async () => {
    const f = vi.fn(async () =>
      new Response(null, { status: 302, headers: { location: "https://example.com/loop" } })
    );
    vi.stubGlobal("fetch", f);
    const res = await POST(req("https://example.com/loop"));
    expect(res.status).toBe(400);
  });

  it("rejects an oversize Content-Length early", async () => {
    vi.stubGlobal("fetch", vi.fn(async () =>
      new Response("x", { status: 200, headers: { "content-type": "text/html", "content-length": "99999999" } })
    ));
    const res = await POST(req("https://example.com/big"));
    expect(res.status).toBe(413);
  });
});
