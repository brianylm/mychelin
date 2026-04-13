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
  "w-full rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100 focus:bg-white placeholder:text-neutral-400";

function ResetPasswordShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="mb-8 text-center">
          <div className="mb-3 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100">
            <img src="/icons/icon-96.png" alt="Mychelin" className="h-10 w-10 rounded-lg" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight">Mychelin</h1>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-6">{children}</div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <ResetPasswordShell>
          <h2 className="mb-2 text-base font-semibold">Checking your link…</h2>
          <p className="text-sm text-neutral-500">One moment.</p>
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
      router.replace("/");
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
              <h2 className="mb-2 text-base font-semibold">Checking your link…</h2>
              <p className="text-sm text-neutral-500">One moment.</p>
            </>
          )}

          {status.kind === "invalid" && (
            <>
              <h2 className="mb-2 text-base font-semibold">Can&apos;t reset password</h2>
              <p className="mb-4 text-sm text-neutral-600">{status.message}</p>
              <Button
                type="button"
                variant="solid"
                size="3"
                style={{ width: "100%" }}
                onClick={() => router.replace("/")}
              >
                Back to sign in
              </Button>
            </>
          )}

          {(status.kind === "ready" || status.kind === "submitting") && (
            <form onSubmit={handleSubmit}>
              <h2 className="mb-4 text-base font-semibold">Choose a new password</h2>

              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-neutral-500">
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
                  <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-neutral-500">
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
                <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
                  {error}
                </p>
              )}

              <Button
                type="submit"
                variant="solid"
                size="3"
                style={{ width: "100%", marginTop: "32px" }}
                disabled={status.kind === "submitting"}
              >
                {status.kind === "submitting" ? "Updating…" : "Reset password"}
              </Button>
            </form>
          )}

      {status.kind === "success" && (
        <>
          <h2 className="mb-2 text-base font-semibold">Password updated</h2>
          <p className="mb-4 text-sm text-neutral-600">
            Your password has been reset. Sign in with your new password.
          </p>
          <Button
            type="button"
            variant="solid"
            size="3"
            style={{ width: "100%" }}
            onClick={() => router.replace("/")}
          >
            Sign in
          </Button>
        </>
      )}
    </ResetPasswordShell>
  );
}
