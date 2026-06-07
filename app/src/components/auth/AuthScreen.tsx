"use client";

import { useEffect, useState } from "react";
import { Button } from "@radix-ui/themes";
import { useAuth } from "@/context/AuthContext";

type Mode = "login" | "signup" | "forgot";

const fieldClass =
  "w-full rounded-2xl border border-[#d8d8d2] bg-white/70 px-4 py-3 text-sm outline-none transition placeholder:text-stone-400 focus:border-[#800020]/45 focus:bg-white focus:ring-4 focus:ring-[#800020]/10";

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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-surface px-4 py-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_24%_12%,rgba(128,0,32,0.10),transparent_24rem),linear-gradient(180deg,rgba(250,250,248,0.96),rgba(246,242,235,0.92))]" />
      <div className="relative w-full max-w-md animate-fade-in">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mb-3 inline-flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-white/70 shadow-[0_18px_55px_rgba(40,26,19,0.10)] ring-1 ring-white/70 backdrop-blur-xl">
            <img src="/images/mychelin-icon.png" alt="Mychelin" className="h-11 w-11 object-contain" />
          </div>
          <h1 className="logo-serif text-2xl font-bold tracking-[-0.015em]">
            <span className="text-[#800020]">my</span><span className="text-[#1A1A1A]">chelin</span>
          </h1>
          <p className="mt-2 text-sm text-stone-500">
            Cook like home, even in your new home.
          </p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="rounded-[2rem] border border-white/70 bg-white/70 p-6 shadow-[0_24px_80px_rgba(60,43,25,0.10)] backdrop-blur-2xl"
        >
          <h2 className="app-editorial-title mb-2 text-3xl leading-tight text-[#1A1A1A]">
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
              <p className="rounded-2xl border border-[#800020]/15 bg-[#800020]/5 px-4 py-3 text-xs leading-5 text-[#521224]">
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
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
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
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
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
                      <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                        Password
                      </label>
                      {mode === "login" && (
                        <button
                          type="button"
                          onClick={() => switchMode("forgot")}
                          className="text-xs font-medium text-[#800020] hover:underline"
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
                <p className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-600">
                  {error}
                </p>
              )}

              <Button
                type="submit"
                variant="solid"
                size="3"
                className="!rounded-full !bg-[#17131f] !font-semibold !text-white hover:!bg-[#800020]"
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
    </div>
  );
}
