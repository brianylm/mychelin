"use client";

import { useState } from "react";
import { Button } from "@radix-ui/themes";
import { useAuth } from "@/context/AuthContext";

type Mode = "login" | "signup" | "forgot";

const fieldClass =
  "w-full rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100 focus:bg-white placeholder:text-neutral-400";

export function AuthScreen() {
  const { login, signup } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
    setForgotSent(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (mode === "forgot") {
      try {
        await fetch("/api/auth/forgot-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        setForgotSent(true);
      } catch {
        // Still show the success message — we deliberately don't leak
        // whether the request actually reached the server.
        setForgotSent(true);
      }
      setLoading(false);
      return;
    }

    const result =
      mode === "login"
        ? await login(email, password)
        : await signup(name, email, password);

    if (result) setError(result);
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      <div className="w-full max-w-sm animate-fade-in">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mb-3 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100">
            <img src="/icons/icon-96.png" alt="Mychelin" className="h-10 w-10 rounded-lg" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight">Mychelin</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Preserve your family&apos;s food heritage
          </p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-neutral-200 bg-white p-6"
        >
          <h2 className="mb-4 text-base font-semibold">
            {mode === "login"
              ? "Welcome back"
              : mode === "signup"
                ? "Create account"
                : "Reset your password"}
          </h2>

          {mode === "forgot" && forgotSent ? (
            <div className="space-y-4">
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                If an account exists for <strong>{email}</strong>, we&apos;ve sent a
                password reset link. Check your inbox (and spam folder).
              </p>
              <Button
                type="button"
                variant="solid"
                size="3"
                style={{ width: "100%" }}
                onClick={() => switchMode("login")}
              >
                Back to sign in
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {mode === "signup" && (
                  <div>
                    <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-neutral-500">
                      Name
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your name"
                      className={fieldClass}
                      required
                      autoFocus
                    />
                  </div>
                )}

                <div>
                  <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-neutral-500">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@email.com"
                    className={fieldClass}
                    required
                    autoFocus={mode === "login" || mode === "forgot"}
                  />
                </div>

                {mode !== "forgot" && (
                  <div>
                    <div className="mb-1 flex items-center justify-between">
                      <label className="block text-xs font-medium uppercase tracking-wide text-neutral-500">
                        Password
                      </label>
                      {mode === "login" && (
                        <button
                          type="button"
                          onClick={() => switchMode("forgot")}
                          className="text-xs font-medium text-amber-700 hover:underline"
                        >
                          Forgot?
                        </button>
                      )}
                    </div>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={
                        mode === "signup" ? "At least 6 characters" : "Your password"
                      }
                      className={fieldClass}
                      required
                      minLength={mode === "signup" ? 6 : undefined}
                    />
                  </div>
                )}
              </div>

              {error && (
                <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
                  {error}
                </p>
              )}

              <Button
                type="submit"
                variant="solid"
                size="3"
                style={{ width: "100%", marginTop: "32px" }}
                disabled={loading}
              >
                {loading
                  ? "Please wait..."
                  : mode === "login"
                    ? "Log in"
                    : mode === "signup"
                      ? "Create account"
                      : "Send reset link"}
              </Button>

              <p className="mt-4 text-center text-xs text-neutral-500">
                {mode === "login" && (
                  <>
                    Don&apos;t have an account?{" "}
                    <button
                      type="button"
                      onClick={() => switchMode("signup")}
                      className="font-medium text-amber-700 hover:underline"
                    >
                      Sign up
                    </button>
                  </>
                )}
                {mode === "signup" && (
                  <>
                    Already have an account?{" "}
                    <button
                      type="button"
                      onClick={() => switchMode("login")}
                      className="font-medium text-amber-700 hover:underline"
                    >
                      Log in
                    </button>
                  </>
                )}
                {mode === "forgot" && (
                  <button
                    type="button"
                    onClick={() => switchMode("login")}
                    className="font-medium text-amber-700 hover:underline"
                  >
                    Back to sign in
                  </button>
                )}
              </p>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
