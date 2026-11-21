import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { LoginPageClient } from "./LoginPageClient";

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({ user: null, loading: true }),
}));

vi.mock("@/components/auth/AuthScreen", () => ({
  AuthScreen: () => <form data-testid="auth-form">auth form</form>,
}));

describe("LoginPageClient", () => {
  it("renders the form while the session check is still loading", () => {
    const html = renderToStaticMarkup(
      <LoginPageClient authenticatedDestination="/" defaultMode="signup" />,
    );
    expect(html).toContain("auth form");
  });
});
