import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import VerifyEmailPage from "./page";

afterEach(() => {
  vi.unstubAllGlobals();
});

async function render(params: Record<string, string | string[] | undefined>) {
  const page = await VerifyEmailPage({ searchParams: Promise.resolve(params) });
  return renderToStaticMarkup(page);
}

describe("/verify-email", () => {
  it("opening the link only shows a button; it makes no request (safe for mail scanners)", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const html = await render({ token: "abc" });
    expect(html).toContain("Confirm my email");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("missing token shows the invalid state with a resend hint", async () => {
    const html = await render({});
    expect(html).toContain("Can&#x27;t confirm this link");
    expect(html).toContain("Resend");
    expect(html).not.toContain("Confirm my email");
  });
});
