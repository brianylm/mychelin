"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { MessageSquare, X } from "lucide-react";
import { useToast } from "@/context/ToastContext";

type PilotFeedbackStage = "first_capture" | "first_cook" | "first_version" | "pilot_general";

interface PilotFeedbackPromptProps {
  stage: PilotFeedbackStage;
  source?: string;
  onClose: () => void;
  compact?: boolean;
}

const COPY: Record<PilotFeedbackStage, { title: string; body: string }> = {
  first_capture: {
    title: "Was this recipe capture useful?",
    body: "After reviewing the generated recipe, tell us what felt useful or what still needs work.",
  },
  first_cook: {
    title: "How did cook-with-me feel?",
    body: "Tell us whether the guided cook helped or got in your way.",
  },
  first_version: {
    title: "Did versioning make sense?",
    body: "We are checking whether attempts becoming better versions feels natural.",
  },
  pilot_general: {
    title: "Pilot feedback",
    body: "Share what blocked you, confused you, or made the loop feel useful.",
  },
};

export function PilotFeedbackPrompt({ stage, source = "pilot_prompt", onClose, compact = false }: PilotFeedbackPromptProps) {
  const { addToast } = useToast();
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const copy = COPY[stage];

  const submit = async () => {
    setError(null);
    if (rating === null && !comment.trim()) {
      setError("Add a rating or a short note.");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch("/api/pilot/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage, rating, comment, source }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Failed to save feedback");
      }
      addToast("Pilot feedback saved", "success");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save feedback");
    } finally {
      setSaving(false);
    }
  };

  const panel = (
    <div className="w-full max-w-md rounded-lg border border-[var(--ui-border-strong)] bg-[var(--ui-surface-raised)] p-5 shadow-xl">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--ui-accent-muted)] text-[var(--ui-accent)]">
            <MessageSquare className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 id="pilot-feedback-title" className="text-base font-semibold text-[var(--ui-text)]">{copy.title}</h2>
            <p className="mt-1 text-sm leading-5 text-neutral-500">{copy.body}</p>
          </div>
        </div>
        <button type="button" onClick={onClose} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-[var(--ui-muted)] transition-colors hover:bg-[var(--ui-surface-subtle)] hover:text-[var(--ui-text)]" aria-label="Close feedback">
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      <div className="mt-5">
        <label className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">How useful was this step?</label>
        <div className="mt-2 grid grid-cols-5 gap-2">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setRating(value)}
              className={
                "h-11 rounded-lg border text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-focus)] " +
                (rating === value
                  ? "border-[#800020] bg-[#800020] text-white"
                  : "border-neutral-200 bg-neutral-50 text-neutral-600 hover:border-[#800020]/30")
              }
            >
              {value}
            </button>
          ))}
        </div>
      </div>

      <label className="mt-4 block text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">What should we fix?</label>
      <textarea
        value={comment}
        onChange={(event) => setComment(event.target.value)}
        rows={3}
        maxLength={600}
        placeholder="Short, privacy-safe note. Avoid family names, full recipe text, or private details."
        className="mt-2 w-full resize-none rounded-lg border border-[var(--ui-border-strong)] bg-[var(--ui-surface-raised)] px-3 py-2 text-sm outline-none transition-colors placeholder:text-[var(--ui-muted)] focus:border-[var(--ui-accent)] focus:ring-2 focus:ring-[var(--ui-focus)]"
      />
      {error && <p className="mt-2 text-sm text-red-700" role="alert">{error}</p>}
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose} disabled={saving}>Skip</Button>
        <Button onClick={submit} loading={saving}>
          {saving ? "Saving..." : "Send feedback"}
        </Button>
      </div>
    </div>
  );

  if (compact) return panel;

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-stone-950/45 px-4 py-5 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="pilot-feedback-title">
      {panel}
    </div>
  );
}
