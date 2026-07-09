"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@radix-ui/themes";

type Status =
  | { kind: "checking" }
  | { kind: "ready" }
  | { kind: "invalid"; message: string }
  | { kind: "submitting" }
  | { kind: "success" };

const fieldClass =
  "w-full rounded-2xl border border-[#d8d8d2] bg-white/70 px-4 py-3 text-sm outline-none transition placeholder:text-stone-400 focus:border-[#800020]/45 focus:bg-white focus:ring-4 focus:ring-[#800020]/10";

function ResetPasswordShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-surface px-4 py-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_24%_12%,rgba(128,0,32,0.10),transparent_24rem),linear-gradient(180deg,rgba(250,250,248,0.96),rgba(246,242,235,0.92))]" />
      <div className="relative w-full max-w-sm animate-fade-in">
        <div className="mb-8 text-center">
          <div className="mb-3 inline-flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-white/70 shadow-[0_18px_55px_rgba(40,26,19,0.10)] ring-1 ring-white/70 backdrop-blur-xl">
            <img src="/images/mychelin-icon-96.webp" alt="Mychelin" className="h-11 w-11 object-contain" />
          </div>
          <h1 className="logo-serif text-2xl font-bold tracking-[-0.015em]">
            <span className="text-[#800020]">my</span><span className="text-[#1A1A1A]">chelin</span>
          </h1>
          <p className="mt-2 text-sm text-stone-500">
            Cook like home, even in your new home.
          </p>
        </div>

        <div className="rounded-[2rem] border border-white/70 bg-white/70 p-6 shadow-[0_24px_80px_rgba(60,43,25,0.10)] backdrop-blur-2xl">{children}</div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <ResetPasswordShell>
          <h2 className="app-editorial-title mb-2 text-3xl leading-tight text-[#1A1A1A]">Checking your link…</h2>
          <p className="text-sm leading-6 text-stone-500">One moment.</p>
        </ResetPasswordShell>
      }
    >
      <ResetPasswordInner />
    </Suspense>
  );
}

function ResetPasswordInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [status, setStatus] = useState<Status>({ kind: "checking" });
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      router.replace("/login");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/auth/reset-password?token=${encodeURIComponent(token)}`
        );
        const data = await res.json();
        if (cancelled) return;
        if (data.valid) {
          setStatus({ kind: "ready" });
        } else {
          const message =
            data.reason === "expired"
              ? "This reset link has expired. Request a new one to continue."
              : data.reason === "used"
                ? "This reset link has already been used."
                : "This reset link is invalid.";
          setStatus({ kind: "invalid", message });
        }
      } catch {
        if (!cancelled) {
          setStatus({
            kind: "invalid",
            message: "Couldn't verify the reset link. Please try again.",
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match");
      return;
    }

    setStatus({ kind: "submitting" });
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to reset password");
        setStatus({ kind: "ready" });
        return;
      }
      setStatus({ kind: "success" });
    } catch {
      setError("Something went wrong. Please try again.");
      setStatus({ kind: "ready" });
    }
  };

  return (
    <ResetPasswordShell>
      {status.kind === "checking" && (
            <>
              <h2 className="app-editorial-title mb-2 text-3xl leading-tight text-[#1A1A1A]">Checking your link…</h2>
              <p className="text-sm leading-6 text-stone-500">One moment.</p>
            </>
          )}

          {status.kind === "invalid" && (
            <>
              <h2 className="app-editorial-title mb-2 text-3xl leading-tight text-[#1A1A1A]">Can&apos;t reset password</h2>
              <p className="mb-4 text-sm leading-6 text-stone-500">{status.message}</p>
              <Button
                type="button"
                variant="solid"
                size="3"
                style={{ width: "100%" }}
                className="!rounded-full !bg-[#17131f] !font-semibold !text-white hover:!bg-[#800020]"
                onClick={() => router.replace("/login")}
              >
                Back to sign in
              </Button>
            </>
          )}

          {(status.kind === "ready" || status.kind === "submitting") && (
            <form onSubmit={handleSubmit}>
              <h2 className="app-editorial-title mb-4 text-3xl leading-tight text-[#1A1A1A]">Choose a new password</h2>

              <div className="space-y-3">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                    New password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className={fieldClass}
                    required
                    minLength={6}
                    autoFocus
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                    Confirm password
                  </label>
                  <input
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Re-enter your new password"
                    className={fieldClass}
                    required
                    minLength={6}
                  />
                </div>
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
                style={{ width: "100%", marginTop: "32px" }}
                className="!rounded-full !bg-[#17131f] !font-semibold !text-white hover:!bg-[#800020]"
                disabled={status.kind === "submitting"}
              >
                {status.kind === "submitting" ? "Updating…" : "Reset password"}
              </Button>
            </form>
          )}

      {status.kind === "success" && (
        <>
          <h2 className="app-editorial-title mb-2 text-3xl leading-tight text-[#1A1A1A]">Password updated</h2>
          <p className="mb-4 text-sm leading-6 text-stone-500">
            Your password has been reset. Sign in with your new password.
          </p>
          <Button
            type="button"
            variant="solid"
            size="3"
            style={{ width: "100%" }}
            className="!rounded-full !bg-[#17131f] !font-semibold !text-white hover:!bg-[#800020]"
            onClick={() => router.replace("/login")}
          >
            Sign in
          </Button>
        </>
      )}
    </ResetPasswordShell>
  );
}
