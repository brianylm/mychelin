"use client";

import { useState } from "react";
import { Button } from "@radix-ui/themes";
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
    title: "How was that first recipe capture?",
    body: "A short note helps us find the rough edges before pilot users hit them.",
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
    <div className="w-full max-w-md rounded-2xl border border-[#e7ded1] bg-white p-5 shadow-[0_28px_90px_rgba(40,26,19,0.18)]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#800020]/10 text-[#800020]">
            <MessageSquare className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-base font-semibold text-neutral-900">{copy.title}</h2>
            <p className="mt-1 text-sm leading-5 text-neutral-500">{copy.body}</p>
          </div>
        </div>
        <button type="button" onClick={onClose} className="rounded-full p-2 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700" aria-label="Close feedback">
          <X className="h-4 w-4" />
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
                "h-10 rounded-lg border text-sm font-semibold transition " +
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
        className="mt-2 w-full resize-none rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm outline-none transition placeholder:text-neutral-400 focus:border-[#800020]/45 focus:bg-white focus:ring-2 focus:ring-[#800020]/10"
      />
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      <div className="mt-4 flex justify-end gap-2">
        <Button type="button" variant="outline" size="2" onClick={onClose} disabled={saving}>Skip</Button>
        <Button type="button" size="2" onClick={submit} disabled={saving} className="!bg-[#17131f] !text-white hover:!bg-[#800020]">
          {saving ? "Saving..." : "Send feedback"}
        </Button>
      </div>
    </div>
  );

  if (compact) return panel;

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-stone-950/30 px-4 py-5 backdrop-blur-sm sm:items-center">
      {panel}
    </div>
  );
}
