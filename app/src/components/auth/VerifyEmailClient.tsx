"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui";

type Status =
  | { kind: "ready" }
  | { kind: "submitting" }
  | { kind: "success" }
  | { kind: "failed"; message: string };

const FAILURE_MESSAGES: Record<string, string> = {
  expired: "This link has expired.",
  used: "This link has already been used, or a newer one was sent.",
  email_changed: "This link was sent to an address your account no longer uses.",
  invalid: "This link isn't valid.",
};

function VerifyEmailShell({ children }: { children: ReactNode }) {
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
          <p className="mt-2 text-sm text-ui-muted">Cook like home, even in your new home.</p>
        </div>
        <div className="rounded-2xl border border-ui-border bg-ui-surface-raised p-6">{children}</div>
      </div>
    </div>
  );
}

function OpenAppButton({ label }: { label: string }) {
  return (
    <Button
      type="button"
      variant="primary"
      size="lg"
      style={{ width: "100%" }}
      className="!rounded-full !font-semibold"
      onClick={() => window.location.assign("/app")}
    >
      {label}
    </Button>
  );
}

export function VerifyEmailClient({ token }: { token: string }) {
  const [status, setStatus] = useState<Status>(
    token ? { kind: "ready" } : { kind: "failed", message: FAILURE_MESSAGES.invalid }
  );

  const confirm = async () => {
    setStatus({ kind: "submitting" });
    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.verified) {
        setStatus({ kind: "success" });
        return;
      }
      const message =
        res.status === 429
          ? data.error || "Too many tries. Please wait a few minutes."
          : FAILURE_MESSAGES[data.reason as string] ?? "Couldn't confirm your email. Please try again.";
      setStatus({ kind: "failed", message });
    } catch {
      setStatus({ kind: "failed", message: "Couldn't confirm your email. Please try again." });
    }
  };

  return (
    <VerifyEmailShell>
      {(status.kind === "ready" || status.kind === "submitting") && (
        <>
          <h2 className="app-editorial-title mb-2 text-3xl leading-tight text-ui-text">Confirm your email</h2>
          <p className="mb-5 text-sm leading-6 text-ui-muted">
            One tap to confirm this address belongs to you.
          </p>
          <Button
            type="button"
            variant="primary"
            size="lg"
            style={{ width: "100%" }}
            className="!rounded-full !font-semibold"
            onClick={confirm}
            disabled={status.kind === "submitting"}
          >
            {status.kind === "submitting" ? "Confirming…" : "Confirm my email"}
          </Button>
        </>
      )}

      {status.kind === "success" && (
        <>
          <h2 className="app-editorial-title mb-2 text-3xl leading-tight text-ui-text">Email verified</h2>
          <p className="mb-5 text-sm leading-6 text-ui-muted">Thank you. Your account is all set.</p>
          <OpenAppButton label="Open Mychelin" />
        </>
      )}

      {status.kind === "failed" && (
        <>
          <h2 className="app-editorial-title mb-2 text-3xl leading-tight text-ui-text">Can&apos;t confirm this link</h2>
          <p className="mb-2 text-sm leading-6 text-ui-muted">{status.message}</p>
          <p className="mb-5 text-sm leading-6 text-ui-muted">
            Sign in and choose <span className="font-medium text-ui-text">Resend</span> on your Profile to get a new link.
          </p>
          <OpenAppButton label="Open Mychelin" />
        </>
      )}
    </VerifyEmailShell>
  );
}
