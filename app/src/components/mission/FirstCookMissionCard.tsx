"use client";

import { ChefHat, X } from "lucide-react";

interface FirstCookMissionCardProps {
  onStart: () => void;
  onDismiss: () => void;
}

// Post-onboarding dashboard prompt that launches the First Recipe Guided
// Mission. "Not now" hides it for this session only — per the locked
// decision it stays resumable (and reappears on the next visit) until the
// user records their first attempt.
export function FirstCookMissionCard({ onStart, onDismiss }: FirstCookMissionCardProps) {
  return (
    <div className="border-b border-[var(--ui-border)] bg-[var(--ui-surface-raised)] px-4 py-3 sm:px-6">
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#800020]/10 text-[#800020]">
            <ChefHat className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="logo-serif text-base font-bold leading-tight text-[var(--ui-text)]">
              Cook your first dish
            </p>
            <p className="mt-0.5 text-xs leading-5 text-[var(--ui-muted)]">
              You&rsquo;ve got a recipe. Let&rsquo;s take it from the page to the pan — plan it,
              cook it with guidance, and record how it went.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={onStart}
            className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-full bg-[var(--ui-action)] px-4 text-xs font-semibold text-[var(--ui-action-text)] transition-colors hover:bg-[var(--ui-action-hover)]"
          >
            Cook with me
          </button>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Not now — keep the mission for later"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[var(--ui-muted)] transition-colors hover:bg-[var(--ui-surface-subtle)] hover:text-[var(--ui-text)]"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
