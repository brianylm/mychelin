import { beforeEach, describe, expect, it, vi } from "vitest";

const getCurrentUser = vi.fn();
const rows: Array<{ email: string; emailVerified: boolean }> = [];

vi.mock("@/lib/auth", () => ({ getCurrentUser: () => getCurrentUser() }));
vi.mock("@/db", () => ({
  db: {
    select: () => ({
      from: () => ({ where: () => ({ limit: async () => rows }) }),
    }),
  },
}));
vi.mock("@/db/schema", () => ({ users: { id: "id", email: "email", emailVerified: "emailVerified" } }));

import { requireAdminUser } from "./admin-auth";

describe("requireAdminUser", () => {
  beforeEach(() => {
    process.env.ANALYTICS_ADMIN_EMAILS = "owner@example.com";
    rows.length = 0;
    getCurrentUser.mockReset();
  });

  it("rejects a listed email whose account is not verified", async () => {
    getCurrentUser.mockResolvedValue({ id: 1, email: "owner@example.com", name: "x" });
    rows.push({ email: "owner@example.com", emailVerified: false });
    const result = await requireAdminUser();
    expect(result.response?.status).toBe(403);
  });

  it("allows a listed, verified email", async () => {
    getCurrentUser.mockResolvedValue({ id: 1, email: "owner@example.com", name: "x" });
    rows.push({ email: "owner@example.com", emailVerified: true });
    const result = await requireAdminUser();
    expect(result.user?.id).toBe(1);
  });

  it("rejects an unlisted email without a database read", async () => {
    getCurrentUser.mockResolvedValue({ id: 2, email: "someone@example.com", name: "y" });
    const result = await requireAdminUser();
    expect(result.response?.status).toBe(403);
  });

  it("returns 401 when signed out", async () => {
    getCurrentUser.mockResolvedValue(null);
    const result = await requireAdminUser();
    expect(result.response?.status).toBe(401);
  });
});

describe("adminEmails", () => {
  it("combines ANALYTICS_ADMIN_EMAILS and ADMIN_EMAILS", async () => {
    const { adminEmails } = await import("./admin-auth");
    process.env.ANALYTICS_ADMIN_EMAILS = "first@example.com";
    process.env.ADMIN_EMAILS = " Second@Example.com ,";
    try {
      expect([...adminEmails()].sort()).toEqual(["first@example.com", "second@example.com"]);
    } finally {
      delete process.env.ADMIN_EMAILS;
    }
  });
});
