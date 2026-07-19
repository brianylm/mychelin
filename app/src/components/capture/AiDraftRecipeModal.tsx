"use client";

import { useState } from "react";
import { Sparkles, X } from "lucide-react";
import { LoadingAnimation } from "@/components/ui/LoadingAnimation";

interface DraftRecipe {
  title: string;
  description?: string;
  cuisine?: string;
  yield?: string;
  prepTime?: number | null;
  cookTime?: number | null;
  story?: string;
  ingredients: Array<{
    name: string;
    quantity?: number | null;
    unit?: string | null;
    approximate?: boolean;
    quantityText?: string | null;
    notes?: string;
  }>;
  instructions: Array<{ content: string; tip?: string }>;
}

interface AiDraftRecipeModalProps {
  onClose: () => void;
  onCreateDraft: (recipe: DraftRecipe) => Promise<void>;
}

const examples = [
  "Chicken curry for 2, not too spicy",
  "A quick tofu dinner using mushrooms",
  "Tau yu bak like a first draft for a beginner",
];

export function AiDraftRecipeModal({ onClose, onCreateDraft }: AiDraftRecipeModalProps) {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/capture/draft-recipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Failed to draft recipe");
      await onCreateDraft(body.recipe as DraftRecipe);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to draft recipe");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-stone-950/45 p-3 sm:items-center" onClick={onClose}>
      <div className="w-full max-w-lg rounded-lg border border-ui-border-strong bg-ui-surface p-5 shadow-xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#800020]">Create recipe</p>
            <h2 className="app-editorial-title mt-2 text-3xl leading-tight text-[#1A1A1A]">Ask Mychelin for a first draft</h2>
            <p className="mt-2 text-sm leading-6 text-stone-600">Tell Mychelin what you want to cook. You will get an editable draft, not a definitive family recipe.</p>
          </div>
          <button type="button" onClick={onClose} className="flex h-11 w-11 items-center justify-center rounded-lg text-ui-muted hover:bg-ui-surface-subtle hover:text-ui-text" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        {loading ? (
          <div className="mt-5 rounded-2xl border border-[#800020]/10 bg-white px-4 py-6">
            <LoadingAnimation
              variant="hei-burst"
              size={132}
              label="Drafting your first recipe..."
            />
          </div>
        ) : (
          <textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="e.g. I want to cook chicken curry for 2, not too spicy, beginner friendly"
            className="mt-5 min-h-32 w-full rounded-lg border border-ui-border-strong bg-ui-surface-raised px-4 py-3 text-sm leading-6 outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-ui-muted focus:border-ui-accent focus:ring-2 focus:ring-ui-focus-soft"
            autoFocus
          />
        )}

        <div className="mt-3 flex flex-wrap gap-2">
          {examples.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => setPrompt(example)}
              disabled={loading}
              className="min-h-11 rounded-lg border border-ui-border-strong bg-ui-surface-raised px-3 text-xs text-ui-muted transition-[background-color,border-color,color] duration-200 hover:border-ui-accent/35 hover:bg-ui-accent-muted hover:text-ui-accent disabled:cursor-not-allowed disabled:opacity-50"
            >
              {example}
            </button>
          ))}
        </div>

        {error && <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">{error}</p>}

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="h-11 rounded-lg px-4 text-sm font-semibold text-ui-muted transition-colors duration-200 hover:bg-ui-surface-subtle hover:text-ui-text">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={loading || prompt.trim().length < 4}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-ui-action px-5 text-sm font-semibold text-ui-action-text transition-colors duration-200 hover:bg-ui-action-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Sparkles className="h-4 w-4" />
            {loading ? "Drafting..." : "Create draft"}
          </button>
        </div>
      </div>
    </div>
  );
}
