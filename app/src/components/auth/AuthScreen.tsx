"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";

type Mode = "login" | "signup" | "forgot";

const fieldClass =
  "h-11 w-full rounded-lg border border-[var(--ui-border-strong)] bg-[var(--ui-surface-raised)] px-3 text-sm outline-none transition-[border-color,box-shadow] placeholder:text-[var(--ui-muted)] focus:border-[var(--ui-accent)] focus:ring-2 focus:ring-[var(--ui-focus)]";

export function AuthScreen({ defaultMode = "login" }: { defaultMode?: Mode }) {
  const { login, signup } = useAuth();
  const [mode, setMode] = useState<Mode>(defaultMode);

  useEffect(() => {
    setMode(defaultMode);
  }, [defaultMode]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const authError = params.get("error");
    if (!authError?.startsWith("google_")) return;
    const messages: Record<string, string> = {
      google_cancelled: "Google sign-in was cancelled.",
      google_not_configured: "Google sign-in is not configured yet.",
      google_state_mismatch: "Google sign-in expired. Please try again.",
      google_login_failed: "Google sign-in failed. Please try again.",
    };
    setError(messages[authError] || "Google sign-in failed. Please try again.");
    params.delete("error");
    const nextUrl = window.location.pathname + (params.toString() ? "?" + params.toString() : "");
    window.history.replaceState({}, "", nextUrl);
  }, []);

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
    setForgotSent(false);
  };

  const startGoogleLogin = () => {
    setGoogleLoading(true);
    setError(null);
    const params = new URLSearchParams(window.location.search);
    const returnTo = params.get("returnTo");
    const url = new URL("/api/auth/google/start", window.location.origin);
    if (returnTo && returnTo.startsWith("/shared/")) {
      url.searchParams.set("returnTo", returnTo);
    }
    window.location.href = url.toString();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (mode === "forgot") {
      try {
        const res = await fetch("/api/auth/forgot-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        if (res.status === 429) {
          // Rate limited — show the actual error so the user knows to wait.
          // This doesn't leak user existence (the limit fires before any
          // email lookup happens).
          const data = await res.json().catch(() => ({}));
          setError(data.error || "Too many requests. Please try again later.");
        } else {
          setForgotSent(true);
        }
      } catch {
        // Network failure — still show the generic success message so we
        // don't leak whether the request actually reached the server.
        setForgotSent(true);
      }
      setLoading(false);
      return;
    }

    const result =
      mode === "login"
        ? await login(email, password)
        : await signup(name, email, password);

    if (result) {
      setError(result);
    } else {
      if (mode === "signup") {
        window.localStorage.setItem("mychelin_onboarding_pending", "1");
      }
      // Login/signup succeeded — check for returnTo param (e.g. from shared page)
      const params = new URLSearchParams(window.location.search);
      const returnTo = params.get("returnTo");
      if (returnTo && returnTo.startsWith("/shared/")) {
        window.location.href = returnTo;
      }
    }
    setLoading(false);
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--ui-canvas)] px-4 py-10">
      <div className="w-full max-w-md animate-fade-in">
        {/* Logo */}
        <div className="mb-8 text-center">
          <Image src="/images/mychelin-icon-96.webp" alt="" width={56} height={56} className="mx-auto mb-3 h-14 w-14 object-contain" />
          <h1 className="logo-serif text-2xl font-bold">
            <span className="text-[#800020]">my</span><span className="text-[#1A1A1A]">chelin</span>
          </h1>
          <p className="mt-2 text-sm text-stone-500">
            Cook like home, even in your new home.
          </p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="rounded-lg border border-[var(--ui-border-strong)] bg-[var(--ui-surface-raised)] p-6"
        >
          <h2 className="app-editorial-title mb-2 text-2xl leading-tight text-[var(--ui-text)]">
            {mode === "login"
              ? "Welcome back"
              : mode === "signup"
                ? "Create account"
                : "Reset your password"}
          </h2>
          <p className="mb-5 text-sm leading-6 text-stone-500">
            {mode === "login"
              ? "Return to your family cookbook, meal plans, and saved recipes."
              : mode === "signup"
                ? "Start turning family recipes into something you can cook, share, and keep."
                : "We’ll send a reset link if this email has a Mychelin account."}
          </p>

          {mode === "forgot" && forgotSent ? (
            <div className="space-y-4">
              <p className="rounded-lg border border-[var(--ui-accent)]/20 bg-[var(--ui-accent-muted)] px-4 py-3 text-sm leading-6 text-[#521224]">
                If an account exists for <strong>{email}</strong>, we&apos;ve sent a
                password reset link. Check your inbox (and spam folder).
              </p>
              <Button
                type="button"
                className="w-full"
                onClick={() => switchMode("login")}
              >
                Back to sign in
              </Button>
            </div>
          ) : (
            <>
              {mode !== "forgot" && (
                <>
                  <button
                    type="button"
                    onClick={startGoogleLogin}
                    disabled={loading || googleLoading}
                    className="flex h-11 w-full items-center justify-center gap-3 rounded border border-[#dadce0] bg-white px-4 text-[14px] font-medium text-[#3c4043] shadow-sm transition hover:bg-[#f8fafd] hover:shadow focus:outline-none focus:ring-2 focus:ring-[#1a73e8]/30 disabled:cursor-not-allowed disabled:opacity-70"
                    style={{ fontFamily: "Roboto, Arial, sans-serif" }}
                  >
                    <svg className="h-[18px] w-[18px]" viewBox="0 0 18 18" aria-hidden="true">
                      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.71v2.25h2.91c1.7-1.57 2.69-3.88 2.69-6.6z" />
                      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.19l-2.91-2.25c-.8.54-1.83.86-3.05.86-2.35 0-4.34-1.58-5.05-3.71H.96v2.33A9 9 0 0 0 9 18z" />
                      <path fill="#FBBC05" d="M3.95 10.71A5.41 5.41 0 0 1 3.67 9c0-.59.1-1.16.28-1.71V4.96H.96A9 9 0 0 0 0 9c0 1.45.35 2.82.96 4.04l2.99-2.33z" />
                      <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 0 0 .96 4.96l2.99 2.33C4.66 5.16 6.65 3.58 9 3.58z" />
                    </svg>
                    <span>{googleLoading ? "Opening Google..." : "Continue with Google"}</span>
                  </button>
                  <div className="my-5 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-400">
                    <span className="h-px flex-1 bg-stone-200" />
                    <span>{mode === "signup" ? "or create with email" : "or sign in with email"}</span>
                    <span className="h-px flex-1 bg-stone-200" />
                  </div>
                </>
              )}

              <div className="space-y-3">
                {mode === "signup" && (
                  <div>
                    <label htmlFor="auth-name" className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">
                      Name
                    </label>
                    <input
                      id="auth-name"
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
                  <label htmlFor="auth-email" className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">
                    Email
                  </label>
                  <input
                    id="auth-email"
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
                      <label htmlFor="auth-password" className="block text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">
                        Password
                      </label>
                      {mode === "login" && (
                        <button
                          type="button"
                          onClick={() => switchMode("forgot")}
                          className="flex min-h-11 items-center text-xs font-medium text-[#800020] hover:underline"
                        >
                          Forgot?
                        </button>
                      )}
                    </div>
                    <input
                      id="auth-password"
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
                <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
                  {error}
                </p>
              )}

              <Button
                type="submit"
                className="mt-8 w-full"
                loading={loading}
              >
                {loading
                  ? "Please wait..."
                  : mode === "login"
                    ? "Log in"
                    : mode === "signup"
                      ? "Create account"
                      : "Send reset link"}
              </Button>

              <p className="mt-4 text-center text-xs text-stone-500">
                {mode === "login" && (
                  <>
                    Don&apos;t have an account?{" "}
                    <button
                      type="button"
                      onClick={() => switchMode("signup")}
                      className="font-medium text-[#800020] hover:underline"
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
                      className="font-medium text-[#800020] hover:underline"
                    >
                      Log in
                    </button>
                  </>
                )}
                {mode === "forgot" && (
                  <button
                    type="button"
                    onClick={() => switchMode("login")}
                    className="font-medium text-[#800020] hover:underline"
                  >
                    Back to sign in
                  </button>
                )}
              </p>
            </>
          )}
        </form>
      </div>
    </main>
  );
}
