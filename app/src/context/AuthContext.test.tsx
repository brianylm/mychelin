import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AuthProvider, useAuth } from "./AuthContext";

function SessionProbe() {
  const { loading, user } = useAuth();
  return (
    <span>
      {loading ? "loading" : "ready"}:{user?.email ?? "signed-out"}
    </span>
  );
}

describe("AuthProvider server bootstrap", () => {
  it("makes a server-verified user available on the first render", () => {
    const html = renderToStaticMarkup(
      <AuthProvider
        initialUser={{
          id: 7,
          name: "Synthetic cook",
          email: "cook@example.com",
        }}
      >
        <SessionProbe />
      </AuthProvider>
    );

    expect(html).toContain("ready:cook@example.com");
  });

  it("keeps the client session check for routes without a server bootstrap", () => {
    const html = renderToStaticMarkup(
      <AuthProvider>
        <SessionProbe />
      </AuthProvider>
    );

    expect(html).toContain("loading:signed-out");
  });
});
