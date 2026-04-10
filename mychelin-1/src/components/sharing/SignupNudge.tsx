"use client";

import { useEffect, useState } from "react";

interface SignupNudgeProps {
  // What the nudge is promoting — affects copy
  context: "recipe" | "book";
  resourceName: string;
}

// Shown to anonymous viewers of a shared recipe or book. Checks
// /api/auth/me once on mount and renders nothing if the viewer is
// already logged in (so real users don't get a redundant prompt).
// Otherwise it mounts as a dismissible bottom banner that opens into
// a full modal with sign up / log in actions.
export function SignupNudge({ context, resourceName }: SignupNudgeProps) {
  const [checkedAuth, setCheckedAuth] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) {
          setIsAuthed(!!data?.user);
          setCheckedAuth(true);
        }
      })
      .catch(() => {
        if (!cancelled) setCheckedAuth(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Auto-open the full modal once after ~2 seconds so new visitors
  // get a clear invitation, but only on first view per session. A
  // session-scoped sessionStorage flag means normal navigation doesn't
  // re-trigger it.
  useEffect(() => {
    if (!checkedAuth || isAuthed || dismissed) return;
    try {
      const seen = sessionStorage.getItem("mychelin_signup_nudge_seen");
      if (seen) return;
      const t = setTimeout(() => {
        setExpanded(true);
        sessionStorage.setItem("mychelin_signup_nudge_seen", "1");
      }, 2000);
      return () => clearTimeout(t);
    } catch {
      /* sessionStorage might be unavailable in private mode */
    }
  }, [checkedAuth, isAuthed, dismissed]);

  if (!checkedAuth || isAuthed || dismissed) return null;

  const noun = context === "book" ? "cookbook" : "recipe";
  const signupHref = `/?signup=1`;
  const loginHref = `/`;

  return (
    <>
      {/* Sticky bottom banner */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-amber-200 bg-gradient-to-br from-amber-50 to-white px-4 py-3 shadow-lg">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <span className="hidden text-2xl sm:inline">📖</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-900">
              Save this {noun}, discover more heritage recipes
            </p>
            <p className="text-[11px] text-neutral-600 truncate">
              Join Mychelin to build your own family cookbook.
            </p>
          </div>
          <button
            onClick={() => setExpanded(true)}
            className="shrink-0 rounded-full bg-amber-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-amber-700"
          >
            Sign up
          </button>
          <button
            onClick={() => setDismissed(true)}
            aria-label="Dismiss"
            className="shrink-0 rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {/* Expanded modal */}
      {expanded && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setExpanded(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex justify-center text-4xl">🍳</div>
            <h2 className="text-center text-xl font-bold text-neutral-900">
              Welcome to Mychelin
            </h2>
            <p className="mt-2 text-center text-sm text-neutral-600">
              You&apos;re viewing{" "}
              <span className="font-semibold text-amber-800">
                &ldquo;{resourceName}&rdquo;
              </span>
              . Join Mychelin to save it, capture family recipes from
              conversations in any dialect, and build your own heritage
              cookbook.
            </p>
            <ul className="mt-5 space-y-2 text-sm text-neutral-700">
              <li className="flex items-center gap-2">
                <span className="text-amber-600">✓</span>
                Save shared recipes to your own collection
              </li>
              <li className="flex items-center gap-2">
                <span className="text-amber-600">✓</span>
                Capture recipes from conversations in Cantonese, Hokkien,
                Mandarin, or English
              </li>
              <li className="flex items-center gap-2">
                <span className="text-amber-600">✓</span>
                Collaborate on cookbooks with your family
              </li>
            </ul>
            <div className="mt-6 flex flex-col gap-2">
              <a
                href={signupHref}
                className="w-full rounded-xl bg-amber-600 px-4 py-3 text-center text-sm font-semibold text-white shadow-sm transition-colors hover:bg-amber-700"
              >
                Create a free account
              </a>
              <a
                href={loginHref}
                className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-center text-sm font-medium text-neutral-700 transition-colors hover:border-amber-300 hover:bg-amber-50"
              >
                I already have an account
              </a>
              <button
                onClick={() => setExpanded(false)}
                className="mt-1 text-center text-xs text-neutral-400 hover:text-neutral-600"
              >
                Keep reading as a guest
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
