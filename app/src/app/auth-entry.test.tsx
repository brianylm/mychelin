import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}));

vi.mock("@/components/LandingPage", () => ({
  LandingPage: () => null,
}));

vi.mock("@/components/auth/LoginPageClient", () => ({
  LoginPageClient: () => null,
}));

vi.mock("@/components/RecipeWorkspace", () => ({
  RecipeWorkspace: () => null,
}));

vi.mock("@/context/AuthContext", () => ({
  AuthProvider: ({ children }: { children: unknown }) => children,
}));

import AppPage from "./app/page";
import Home from "./page";
import LoginPage from "./login/page";

describe("authenticated entry routing", () => {
  beforeEach(() => {
    mocks.getCurrentUser.mockReset();
    mocks.redirect.mockReset();
  });

  it("sends a valid session from the public root to the app", async () => {
    mocks.getCurrentUser.mockResolvedValue({
      id: 7,
      name: "Synthetic cook",
      email: "cook@example.com",
    });

    await Home();

    expect(mocks.redirect).toHaveBeenCalledWith("/app");
  });

  it("keeps missing or expired sessions on the public root", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);

    const page = await Home();

    expect(mocks.redirect).not.toHaveBeenCalled();
    expect(page).toBeTruthy();
  });

  it("bootstraps the app from a server-verified session", async () => {
    mocks.getCurrentUser.mockResolvedValue({
      id: 7,
      name: "Synthetic cook",
      email: "cook@example.com",
    });

    const page = await AppPage();

    expect(mocks.redirect).not.toHaveBeenCalled();
    expect(page.props.initialUser).toMatchObject({ id: 7 });
  });

  it("sends missing or expired app sessions to login", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);

    await AppPage();

    expect(mocks.redirect).toHaveBeenCalledWith("/login");
  });

  it("sends a valid session away from login and preserves a shared-recipe return", async () => {
    mocks.getCurrentUser.mockResolvedValue({
      id: 7,
      name: "Synthetic cook",
      email: "cook@example.com",
    });

    await LoginPage({
      searchParams: Promise.resolve({ returnTo: "/shared/family-recipe" }),
    });

    expect(mocks.redirect).toHaveBeenCalledWith("/shared/family-recipe");
  });

  it("falls back to the app for an unsafe or unrelated login return", async () => {
    mocks.getCurrentUser.mockResolvedValue({
      id: 7,
      name: "Synthetic cook",
      email: "cook@example.com",
    });

    await LoginPage({
      searchParams: Promise.resolve({ returnTo: "https://example.com/phish" }),
    });

    expect(mocks.redirect).toHaveBeenCalledWith("/app");
  });

  it("keeps a signed-out visitor on login with the requested form mode", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);

    const page = await LoginPage({
      searchParams: Promise.resolve({ mode: "signup" }),
    });

    expect(mocks.redirect).not.toHaveBeenCalled();
    expect(page.props).toMatchObject({
      authenticatedDestination: "/app",
      defaultMode: "signup",
    });
  });
});
