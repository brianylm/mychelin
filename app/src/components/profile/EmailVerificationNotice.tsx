"use client";

import { useState, useSyncExternalStore } from "react";
import { X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";

// Dismissal is per device and lasts 7 days.
export const VERIFY_NOTICE_DISMISS_KEY = "mychelin.verifyEmailNoticeDismissedUntil";
const DISMISS_MS = 7 * 24 * 60 * 60 * 1000;

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function readDismissed(): boolean {
  try {
    const until = Number(localStorage.getItem(VERIFY_NOTICE_DISMISS_KEY));
    return Number.isFinite(until) && until > Date.now();
  } catch {
    return false;
  }
}

function dismissForAWeek() {
  try {
    localStorage.setItem(VERIFY_NOTICE_DISMISS_KEY, String(Date.now() + DISMISS_MS));
  } catch {
    // Storage blocked: the notice returns on the next visit.
  }
  listeners.forEach((listener) => listener());
}

/**
 * Quiet "please verify" line for signed-in users whose email is unverified.
 * Renders nothing when the flag is unknown (undefined) or true.
 */
export function EmailVerificationNotice() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [sending, setSending] = useState(false);
  const [hidden, setHidden] = useState(false);
  // Server snapshot says "dismissed" so nothing flashes before hydration.
  const dismissed = useSyncExternalStore(subscribe, readDismissed, () => true);

  if (!user || user.emailVerified !== false || dismissed || hidden) return null;

  const resend = async () => {
    setSending(true);
    try {
      const res = await fetch("/api/auth/verify-email/send", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.alreadyVerified) {
        setHidden(true);
        addToast("Your email is already verified.", "success");
      } else if (res.ok) {
        addToast(`New link sent to ${user.email}.`, "success");
      } else if (res.status === 429) {
        addToast(data.error || "Too many emails. Please try again later.", "error");
      } else {
        addToast(data.error || "Couldn't send the email. Please try again later.", "error");
      }
    } catch {
      addToast("Couldn't send the email. Please try again later.", "error");
    } finally {
      setSending(false);
    }
  };

  return (
    <div role="status" className="mt-3 flex items-start gap-2 border-t border-ui-border pt-3 text-sm text-ui-muted">
      <p className="min-w-0 flex-1 leading-6">
        Please verify your email — we sent a link to{" "}
        <span className="break-all font-medium text-ui-text">{user.email}</span>.{" "}
        <button
          type="button"
          onClick={resend}
          disabled={sending}
          className="font-medium text-ui-accent underline underline-offset-2 disabled:opacity-55"
        >
          {sending ? "Sending…" : "Resend"}
        </button>
      </p>
      <button
        type="button"
        onClick={dismissForAWeek}
        aria-label="Hide for a week"
        className="-mr-2 -mt-1 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ui-muted transition hover:text-ui-text"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
