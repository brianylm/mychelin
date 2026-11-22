import { describe, expect, it } from "vitest";
import nextConfig from "../next.config";

describe("next.config headers()", () => {
  it("sets security headers on /:path*", async () => {
    const rules = await nextConfig.headers!();
    const rule = rules.find((r) => r.source === "/:path*");
    expect(rule).toBeDefined();
    const names = rule!.headers.map((h) => h.key);
    expect(names).toEqual(
      expect.arrayContaining([
        "Referrer-Policy",
        "X-Content-Type-Options",
        "X-Frame-Options",
        "Permissions-Policy",
        "Strict-Transport-Security",
        "Content-Security-Policy-Report-Only",
      ])
    );
    const csp = rule!.headers.find((h) => h.key === "Content-Security-Policy-Report-Only")!;
    expect(csp.value).toContain("frame-ancestors 'none'");
    expect(csp.value).toMatch(/'sha256-[A-Za-z0-9+/=]+'/);
  });
});
