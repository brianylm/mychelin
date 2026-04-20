"use client";

import { useState } from "react";

type State =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "error"; message: string }
  | { kind: "success" };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function WaitlistForm({
  source,
  buttonLabel = "Join the waitlist",
  placeholder = "your@email.com",
}: {
  source?: string;
  buttonLabel?: string;
  placeholder?: string;
}) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<State>({ kind: "idle" });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!EMAIL_RE.test(trimmed)) {
      setState({ kind: "error", message: "Please enter a valid email." });
      return;
    }

    setState({ kind: "submitting" });
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed, source }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setState({
          kind: "error",
          message: data.error || "Couldn't save your email. Please try again.",
        });
        return;
      }
      setState({ kind: "success" });
    } catch {
      setState({
        kind: "error",
        message: "Network error. Please try again.",
      });
    }
  };

  if (state.kind === "success") {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900">
        <p className="font-medium">Saved.</p>
        <p className="mt-1 text-amber-800">
          We&apos;ll email you when it&apos;s your turn.
        </p>
      </div>
    );
  }

  const submitting = state.kind === "submitting";

  return (
    <form onSubmit={submit} className="w-full" noValidate>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          spellCheck={false}
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (state.kind === "error") setState({ kind: "idle" });
          }}
          placeholder={placeholder}
          disabled={submitting}
          required
          aria-invalid={state.kind === "error"}
          className="min-w-0 flex-1 rounded-xl border border-neutral-300 bg-white px-4 py-3 text-base outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-100 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={submitting}
          className="shrink-0 rounded-xl bg-amber-600 px-6 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-70 min-h-[48px]"
        >
          {submitting ? "Saving…" : buttonLabel}
        </button>
      </div>
      {state.kind === "error" && (
        <p className="mt-2 text-sm text-red-600">{state.message}</p>
      )}
    </form>
  );
}
