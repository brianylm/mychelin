"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui";
import { LoadingAnimation } from "@/components/ui/LoadingAnimation";
import { WorkflowDialog, WorkflowError } from "@/components/ui/WorkflowDialog";

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
    <WorkflowDialog
      open
      onClose={onClose}
      title="Ask Mychelin for a first draft"
      subtitle="Tell Mychelin what you want to cook. You will get an editable draft, not a definitive family recipe."
      mobileFullHeight={false}
      footer={
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className="flex-1"
            onClick={() => void submit()}
            disabled={loading || prompt.trim().length < 4}
            loading={loading}
            iconStart={<Sparkles className="h-4 w-4" />}
          >
            {loading ? "Drafting..." : "Create draft"}
          </Button>
        </div>
      }
    >
      {loading ? (
        <div className="rounded-2xl border border-ui-accent/10 bg-ui-surface px-4 py-6">
          <LoadingAnimation
            size={132}
            label="Drafting your first recipe..."
          />
        </div>
      ) : (
        <textarea
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder="e.g. I want to cook chicken curry for 2, not too spicy, beginner friendly"
          className="min-h-32 w-full rounded-2xl border border-ui-border-strong bg-ui-surface px-4 py-3 text-sm leading-6 text-ui-text outline-none transition placeholder:text-ui-muted focus:border-ui-accent/45 focus:ring-4 focus:ring-ui-focus-soft"
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
            className="rounded-full border border-ui-border bg-ui-surface px-3 py-1.5 text-xs text-ui-muted transition hover:border-ui-accent/25 hover:text-ui-text disabled:cursor-not-allowed disabled:opacity-50"
          >
            {example}
          </button>
        ))}
      </div>

      {error && (
        <div className="mt-4">
          <WorkflowError
            title="Drafting didn't work"
            message="Your prompt is still here — tweak it and try again."
            technicalDetails={error}
          />
        </div>
      )}
    </WorkflowDialog>
  );
}
