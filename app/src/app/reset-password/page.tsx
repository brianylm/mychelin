"use client";

import Image from "next/image";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";

type Status =
  | { kind: "checking" }
  | { kind: "ready" }
  | { kind: "invalid"; message: string }
  | { kind: "submitting" }
  | { kind: "success" };

const fieldClass =
  "h-11 w-full rounded-lg border border-[var(--ui-border-strong)] bg-[var(--ui-surface-raised)] px-3 text-sm outline-none transition-[border-color,box-shadow] placeholder:text-[var(--ui-muted)] focus:border-[var(--ui-accent)] focus:ring-2 focus:ring-[var(--ui-focus)]";

function ResetPasswordShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--ui-canvas)] px-4 py-10">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="mb-8 text-center">
          <Image src="/images/mychelin-icon-96.webp" alt="" width={56} height={56} className="mx-auto mb-3 h-14 w-14 object-contain" />
          <h1 className="logo-serif text-2xl font-bold">
            <span className="text-[#800020]">my</span><span className="text-[#1A1A1A]">chelin</span>
          </h1>
          <p className="mt-2 text-sm text-stone-500">
            Cook like home, even in your new home.
          </p>
        </div>

        <div className="rounded-lg border border-[var(--ui-border-strong)] bg-[var(--ui-surface-raised)] p-6">{children}</div>
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <ResetPasswordShell>
          <h2 className="app-editorial-title mb-2 text-2xl leading-tight text-[#1A1A1A]">Checking your link…</h2>
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
                className="w-full"
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
                  <label htmlFor="reset-password" className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">
                    New password
                  </label>
                  <input
                    id="reset-password"
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
                  <label htmlFor="reset-password-confirm" className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">
                    Confirm password
                  </label>
                  <input
                    id="reset-password-confirm"
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
                <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
                  {error}
                </p>
              )}

              <Button
                type="submit"
                className="mt-8 w-full"
                loading={status.kind === "submitting"}
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
            className="w-full"
            onClick={() => router.replace("/login")}
          >
            Sign in
          </Button>
        </>
      )}
    </ResetPasswordShell>
  );
}
