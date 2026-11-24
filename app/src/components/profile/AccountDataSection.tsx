"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui";
import { useConfirm } from "@/context/ConfirmContext";

// Accounts created with Google have a random password nobody knows, so they
// confirm deletion with their email address instead.
export function confirmsWithEmail(authProvider: string | null | undefined): boolean {
  return authProvider === "google";
}

export function deletionRequestBody(authProvider: string | null | undefined, value: string) {
  return confirmsWithEmail(authProvider) ? { email: value.trim() } : { password: value };
}

export const DELETE_ACCOUNT_WARNING =
  "This permanently deletes your account, your recipes, photos and voice recordings, your plans, lists and inventory. " +
  "Books you own are deleted for everyone in them. If you run a household, another member becomes its admin. " +
  "This can't be undone. Download your data first if you want a copy.";

const inputClass =
  "w-full rounded-lg border border-ui-border-strong bg-ui-surface-subtle px-3 py-2 text-sm outline-none transition focus:border-ui-accent focus:bg-ui-surface-raised focus:ring-2 focus:ring-ui-focus-soft placeholder:text-ui-muted";

export function AccountDataSection({ authProvider }: { authProvider: string | null }) {
  const confirm = useConfirm();
  const [showForm, setShowForm] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const withEmail = confirmsWithEmail(authProvider);

  const startDelete = async () => {
    const ok = await confirm({
      title: "Delete your account?",
      message: DELETE_ACCOUNT_WARNING,
      confirmLabel: "Continue",
      destructive: true,
    });
    if (ok) {
      setValue("");
      setError(null);
      setShowForm(true);
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsDeleting(true);
    try {
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(deletionRequestBody(authProvider, value)),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.deleted) {
        setError(data.error || "We couldn't delete your account. Please try again.");
        setIsDeleting(false);
        return;
      }
      // Full navigation drops every in-memory cache of the old session.
      window.location.assign("/account-deleted");
    } catch {
      setError("Something went wrong. Please try again.");
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-2">
      <h2 className="text-lg font-semibold text-ui-text">Your data</h2>
      <p className="text-sm leading-6 text-ui-muted">
        <a href="/api/account/export" download className="text-ui-accent underline">
          Download my data
        </a>{" "}
        (a file with your recipes, plans and settings)
      </p>

      {!showForm && (
        <button
          type="button"
          onClick={startDelete}
          className="inline-flex min-h-11 items-center text-sm font-medium text-ui-danger hover:underline"
        >
          Delete my account
        </button>
      )}

      {showForm && (
        <form onSubmit={submit} className="space-y-3 pt-1">
          <p className="text-sm leading-6 text-ui-muted">{DELETE_ACCOUNT_WARNING}</p>
          <div>
            <label htmlFor="delete-account-confirm" className="mb-1 block text-xs font-medium text-ui-muted">
              {withEmail ? "Type your email address to confirm" : "Enter your password to confirm"}
            </label>
            <input
              id="delete-account-confirm"
              type={withEmail ? "email" : "password"}
              autoComplete={withEmail ? "email" : "current-password"}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className={inputClass}
              required
              autoFocus
            />
          </div>
          {error && (
            <p className="rounded-lg border border-ui-border bg-ui-danger-soft px-3 py-2 text-xs text-ui-danger">
              {error}
            </p>
          )}
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="submit"
              variant="danger"
              size="lg"
              loading={isDeleting}
              className="border-ui-danger"
            >
              {isDeleting ? "Deleting..." : "Delete my account permanently"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="lg"
              disabled={isDeleting}
              onClick={() => setShowForm(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
