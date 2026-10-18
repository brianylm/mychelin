"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { House } from "lucide-react";
import { Button } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";

// Links styled as the Button primitive's large primary/secondary variants.
const primaryLink =
  "inline-flex h-12 w-full items-center justify-center rounded-lg border border-[var(--ui-action)] bg-[var(--ui-action)] px-5 text-base font-semibold text-[var(--ui-action-text)] transition-colors hover:bg-[var(--ui-action-hover)]";
const secondaryLink =
  "inline-flex h-12 w-full items-center justify-center rounded-lg border border-[var(--ui-border-strong)] bg-[var(--ui-surface-raised)] px-5 text-base font-semibold text-[var(--ui-text)] transition-colors hover:border-[var(--ui-accent)]/40 hover:bg-[var(--ui-accent-muted)]";

type JoinState =
  | { kind: "idle" }
  | { kind: "joining" }
  | { kind: "joined"; name: string }
  | { kind: "error"; message: string };

// Household invite link: /join/<code>. The page never looks the household
// up while signed out, so a guessed link reveals nothing; joining goes
// through the same API (and checks) as typing the code by hand.
export default function JoinHouseholdPage() {
  const params = useParams();
  const code = String(params.code ?? "").trim().toUpperCase();
  const { user, loading } = useAuth();
  const [state, setState] = useState<JoinState>({ kind: "idle" });
  const returnTo = encodeURIComponent(`/join/${code}`);

  const join = async () => {
    setState({ kind: "joining" });
    try {
      const res = await fetch("/api/households/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ joinCode: code }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setState({ kind: "joined", name: data.household?.name ?? "the household" });
      } else {
        setState({ kind: "error", message: data.error ?? "Could not join. Please try again." });
      }
    } catch {
      setState({ kind: "error", message: "Could not reach Mychelin. Check your connection and try again." });
    }
  };

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-ui-bg px-4 py-10">
      <div className="w-full max-w-sm rounded-2xl border border-ui-border bg-ui-surface-raised p-6 text-center">
        <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-ui-accent-muted text-ui-accent">
          <House className="h-6 w-6" aria-hidden="true" />
        </span>

        {state.kind === "joined" ? (
          <>
            <h1 className="font-serif text-2xl text-ui-text">You&apos;ve joined {state.name}</h1>
            <p className="mt-2 text-sm text-ui-muted">
              Your meal plan, shopping list and inventory are now shared.
            </p>
            <Link href="/app" className={`mt-6 ${primaryLink}`}>
              Open Mychelin
            </Link>
          </>
        ) : (
          <>
            <h1 className="font-serif text-2xl text-ui-text">Join a household</h1>
            <p className="mt-2 text-sm text-ui-muted">
              You&apos;ve been invited to share a meal plan, shopping list and inventory on
              Mychelin.
            </p>
            <p className="mt-4 text-xs font-medium text-ui-muted">
              Invite code <span className="font-semibold tracking-widest text-ui-text">{code}</span>
            </p>

            {state.kind === "error" && (
              <p role="alert" className="mt-4 rounded-lg bg-ui-danger-soft px-3 py-2 text-sm text-ui-danger">
                {state.message}
              </p>
            )}

            {loading ? null : user ? (
              <Button
                size="lg"
                className="mt-6 w-full"
                disabled={state.kind === "joining"}
                onClick={join}
              >
                {state.kind === "joining" ? "Joining…" : "Join household"}
              </Button>
            ) : (
              <div className="mt-6 space-y-2">
                <Link href={`/login?returnTo=${returnTo}`} className={primaryLink}>
                  Sign in to join
                </Link>
                <Link href={`/login?mode=signup&returnTo=${returnTo}`} className={secondaryLink}>
                  Create an account
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
