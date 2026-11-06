"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui";

type Status =
  | { kind: "checking" }
  | { kind: "ready" }
  | { kind: "invalid"; message: string }
  | { kind: "submitting" }
  | { kind: "success" };

const fieldClass =
  "w-full rounded-2xl border border-ui-border bg-ui-surface-raised px-4 py-3 text-sm outline-none transition placeholder:text-ui-muted focus:border-ui-accent focus:bg-ui-surface-raised focus:ring-4 focus:ring-ui-focus-soft";

function ResetPasswordShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-ui-bg px-4 py-10">
      <div className="relative w-full max-w-sm animate-fade-in">
        <div className="mb-8 text-center">
          <div className="mb-3 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-ui-surface-raised ring-1 ring-ui-border">
            <img src="/images/mychelin-icon-96.webp" alt="Mychelin" className="h-11 w-11 object-contain" />
          </div>
          <h1 className="logo-serif text-2xl font-bold">
            <span className="text-ui-accent">my</span><span className="text-ui-text">chelin</span>
          </h1>
          <p className="mt-2 text-sm text-ui-muted">
            Cook like home, even in your new home.
          </p>
        </div>

        <div className="rounded-2xl border border-ui-border bg-ui-surface-raised p-6">{children}</div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <ResetPasswordShell>
          <h2 className="app-editorial-title mb-2 text-3xl leading-tight text-ui-text">Checking your link…</h2>
          <p className="text-sm leading-6 text-ui-muted">One moment.</p>
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
              <h2 className="app-editorial-title mb-2 text-3xl leading-tight text-ui-text">Checking your link…</h2>
              <p className="text-sm leading-6 text-ui-muted">One moment.</p>
            </>
          )}

          {status.kind === "invalid" && (
            <>
              <h2 className="app-editorial-title mb-2 text-3xl leading-tight text-ui-text">Can&apos;t reset password</h2>
              <p className="mb-4 text-sm leading-6 text-ui-muted">{status.message}</p>
              <Button
                type="button"
                variant="primary"
                size="lg"
                style={{ width: "100%" }}
                className="!rounded-full !font-semibold"
                onClick={() => router.replace("/login")}
              >
                Back to sign in
              </Button>
            </>
          )}

          {(status.kind === "ready" || status.kind === "submitting") && (
            <form onSubmit={handleSubmit}>
              <h2 className="app-editorial-title mb-4 text-3xl leading-tight text-ui-text">Choose a new password</h2>

              <div className="space-y-3">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-ui-muted">
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
                  <label className="mb-1.5 block text-xs font-semibold text-ui-muted">
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
                <p className="mt-3 rounded-2xl border border-ui-border bg-ui-danger-soft px-4 py-3 text-xs text-ui-danger">
                  {error}
                </p>
              )}

              <Button
                type="submit"
                variant="primary"
                size="lg"
                style={{ width: "100%", marginTop: "32px" }}
                className="!rounded-full !font-semibold"
                disabled={status.kind === "submitting"}
              >
                {status.kind === "submitting" ? "Updating…" : "Reset password"}
              </Button>
            </form>
          )}

      {status.kind === "success" && (
        <>
          <h2 className="app-editorial-title mb-2 text-3xl leading-tight text-ui-text">Password updated</h2>
          <p className="mb-4 text-sm leading-6 text-ui-muted">
            Your password has been reset. Sign in with your new password.
          </p>
          <Button
            type="button"
            variant="primary"
            size="lg"
            style={{ width: "100%" }}
            className="!rounded-full !font-semibold"
            onClick={() => router.replace("/login")}
          >
            Sign in
          </Button>
        </>
      )}
    </ResetPasswordShell>
  );
}
