"use client";

import { useState } from "react";
import { Button } from "@radix-ui/themes";
import { useAuth } from "@/context/AuthContext";

export function AuthScreen() {
  const { login, signup } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

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
            <span className="text-3xl">🍜</span>
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
            {mode === "login" ? "Welcome back" : "Create account"}
          </h2>

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
                  className="w-full rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100 focus:bg-white placeholder:text-neutral-400"
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
                className="w-full rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100 focus:bg-white placeholder:text-neutral-400"
                required
                autoFocus={mode === "login"}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-neutral-500">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={
                  mode === "signup" ? "At least 6 characters" : "Your password"
                }
                className="w-full rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100 focus:bg-white placeholder:text-neutral-400"
                required
                minLength={mode === "signup" ? 6 : undefined}
              />
            </div>
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
            className="mt-4 w-full"
            disabled={loading}
          >
            {loading
              ? "Please wait..."
              : mode === "login"
                ? "Log in"
                : "Create account"}
          </Button>

          <p className="mt-4 text-center text-xs text-neutral-500">
            {mode === "login" ? (
              <>
                Don&apos;t have an account?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("signup");
                    setError(null);
                  }}
                  className="font-medium text-amber-700 hover:underline"
                >
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("login");
                    setError(null);
                  }}
                  className="font-medium text-amber-700 hover:underline"
                >
                  Log in
                </button>
              </>
            )}
          </p>
        </form>
      </div>
    </div>
  );
}
