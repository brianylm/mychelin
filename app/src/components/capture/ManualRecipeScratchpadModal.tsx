"use client";

import { useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Flame, PencilLine, Timer } from "lucide-react";
import { Button } from "@/components/ui";
import { WorkflowDialog } from "@/components/ui/WorkflowDialog";
import {
  formatManualIngredientPreview,
  parseManualRecipeScratchpad,
  type ManualParsedIngredient,
  type ManualParsedInstruction,
} from "@/lib/manual-recipe-parser";
import { HEAT_CONFIG } from "@/lib/instruction-heat";
import {
  saveCaptureDraft,
  loadCaptureDraft,
  clearCaptureDraft,
} from "@/lib/capture-draft-storage";

const DRAFT_KEY = "mychelin:capture:scratchpad";

export interface ManualRecipeDraft {
  title: string;
  ingredients: Array<Omit<ManualParsedIngredient, "source">>;
  instructions: Array<Pick<ManualParsedInstruction, "content" | "tip">>;
}

interface ManualRecipeScratchpadModalProps {
  onClose: () => void;
  onCreateRecipe: (draft: ManualRecipeDraft) => Promise<void>;
  initialTitle?: string;
  saveLabel?: string;
}

const EXAMPLE_TEXT = "Ingredients\n3 garlic cloves\n1kg potato\n1 tbsp light soy sauce\n\nSteps\nFry garlic until fragrant on medium heat\nAdd potato and toss for 2 min\nAdd water and simmer 20 min until soft";

export function ManualRecipeScratchpadModal({
  onClose,
  onCreateRecipe,
  initialTitle = "",
  saveLabel = "Create recipe",
}: ManualRecipeScratchpadModalProps) {
  const [title, setTitleState] = useState(() => {
    const draft = loadCaptureDraft(DRAFT_KEY);
    return initialTitle || draft?.title || "";
  });
  const [scratchpad, setScratchpadState] = useState(
    () => loadCaptureDraft(DRAFT_KEY)?.text ?? ""
  );
  const [phase, setPhase] = useState<"capture" | "review">("capture");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const parsed = useMemo(() => parseManualRecipeScratchpad(scratchpad), [scratchpad]);

  // Back up title + notes on every change so an accidental close never
  // loses them. Cleared on successful save.
  const persist = (nextTitle: string, nextText: string) => {
    if (nextTitle.trim() || nextText.trim()) {
      saveCaptureDraft(DRAFT_KEY, { title: nextTitle, text: nextText });
    } else {
      clearCaptureDraft(DRAFT_KEY);
    }
  };
  const setTitle = (next: string) => {
    setTitleState(next);
    persist(next, scratchpad);
  };
  const setScratchpad = (next: string) => {
    setScratchpadState(next);
    persist(title, next);
  };

  const validate = () => {
    if (!title.trim()) return "Add a recipe name first.";
    if (parsed.instructions.length === 0) return "Add at least one cooking step.";
    return null;
  };

  const reviewRecipe = () => {
    const message = validate();
    if (message) {
      setError(message);
      return;
    }
    setError(null);
    setPhase("review");
  };

  const createRecipe = async () => {
    const message = validate();
    if (message) {
      setError(message);
      setPhase("capture");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onCreateRecipe({
        title: title.trim(),
        ingredients: parsed.ingredients.map((ingredient) => ({
          name: ingredient.name,
          quantity: ingredient.quantity,
          unit: ingredient.unit,
          approximate: ingredient.approximate,
          quantityText: ingredient.quantityText,
          notes: ingredient.notes,
        })),
        instructions: parsed.instructions.map(({ content, tip }) => ({ content, tip })),
      });
      clearCaptureDraft(DRAFT_KEY);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create recipe");
      setPhase("review");
    } finally {
      setSaving(false);
    }
  };

  return (
    <WorkflowDialog
      open
      onClose={onClose}
      title={phase === "capture" ? "Start with what you know" : "Review the structure"}
      subtitle={
        phase === "capture"
          ? "Type naturally or paste OCR text, WhatsApp notes, cookbook text, or a rough memory dump. Mychelin will split obvious ingredients, steps, heat, and timings before saving."
          : "Check the structure before this becomes a recipe. Ingredients can be filled in later if they are still rough."
      }
      className="sm:max-w-3xl"
      footer={
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={phase === "capture" ? onClose : () => setPhase("capture")}
          >
            {phase === "capture" ? "Cancel" : "Edit scratchpad"}
          </Button>
          <Button
            className="flex-1"
            onClick={phase === "capture" ? reviewRecipe : createRecipe}
            loading={saving}
            iconStart={<PencilLine className="h-4 w-4" />}
          >
            {saving ? "Saving..." : phase === "capture" ? "Structure recipe" : saveLabel}
          </Button>
        </div>
      }
    >
      {phase === "capture" ? (
        <div className="grid gap-4">
          <label className="grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-ui-muted">
              Recipe name
            </span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="e.g. Ah Ma's tau yu bak"
              className="h-12 rounded-xl border border-ui-border-strong bg-ui-surface px-4 text-base font-semibold text-ui-text outline-none transition placeholder:text-ui-muted focus:border-ui-accent/45 focus:ring-2 focus:ring-ui-focus-soft"
              autoFocus
            />
          </label>

          <label className="grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-ui-muted">
              Recipe notes
            </span>
            <textarea
              value={scratchpad}
              onChange={(event) => setScratchpad(event.target.value)}
              placeholder="Type or paste ingredients, steps, timings, heat, rough notes..."
              rows={12}
              className="min-h-[300px] resize-y rounded-2xl border border-ui-border-strong bg-ui-surface px-4 py-3 text-base leading-7 text-ui-text outline-none transition placeholder:text-ui-muted focus:border-ui-accent/45 focus:ring-2 focus:ring-ui-focus-soft"
            />
          </label>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setScratchpad(EXAMPLE_TEXT)}
              className="rounded-full border border-ui-border bg-ui-surface px-3 py-2 text-xs font-semibold text-ui-muted transition hover:border-ui-accent/25 hover:text-ui-accent"
            >
              Use example
            </button>
            <span className="text-xs text-ui-muted">
              Tip: headings like Ingredients and Steps make parsing more reliable, but plain paragraphs work too.
            </span>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
          <section className="rounded-2xl border border-ui-border bg-ui-surface p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-ui-text">Ingredients</h3>
              <span className="rounded-full bg-ui-accent/10 px-2 py-0.5 text-xs font-semibold text-ui-accent">
                {parsed.ingredients.length}
              </span>
            </div>
            {parsed.ingredients.length === 0 ? (
              <div className="rounded-xl border border-ui-warning/25 bg-ui-warning-soft px-3 py-3 text-sm leading-6 text-ui-warning-text">
                No ingredients detected yet. You can still create the recipe, but shopping lists and scaling work better once ingredients are added.
              </div>
            ) : (
              <ul className="space-y-2">
                {parsed.ingredients.map((ingredient, index) => (
                  <li key={index} className="flex items-start gap-2 rounded-xl border border-ui-border bg-ui-surface-subtle px-3 py-2 text-sm text-ui-text">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-ui-success" />
                    <span>{formatManualIngredientPreview(ingredient)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-2xl border border-ui-border bg-ui-surface p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-ui-text">Steps</h3>
              <span className="rounded-full bg-ui-accent/10 px-2 py-0.5 text-xs font-semibold text-ui-accent">
                {parsed.instructions.length}
              </span>
            </div>
            <ol className="space-y-2">
              {parsed.instructions.map((instruction, index) => (
                <li key={index} className="rounded-xl border border-ui-border bg-ui-surface-subtle px-3 py-2">
                  <div className="flex gap-2 text-sm leading-6 text-ui-text">
                    <span className="font-semibold text-ui-accent">{index + 1}.</span>
                    <span>{instruction.content}</span>
                  </div>
                  {(instruction.heat || instruction.timerText) && (
                    <div className="mt-2 flex flex-wrap gap-1.5 pl-5">
                      {instruction.heat && HEAT_CONFIG[instruction.heat] && (
                        <span className={"inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold " + HEAT_CONFIG[instruction.heat].className}>
                          <Flame className="h-3 w-3" />
                          {HEAT_CONFIG[instruction.heat].label}
                        </span>
                      )}
                      {instruction.timerText && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-ui-warning/25 bg-ui-warning-soft px-2 py-0.5 text-[11px] font-semibold text-ui-warning-text">
                          <Timer className="h-3 w-3" />
                          {instruction.timerText}
                        </span>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ol>
          </section>

          {parsed.unclassified.length > 0 && (
            <section className="rounded-2xl border border-ui-border bg-ui-surface-subtle p-4 lg:col-span-2">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-ui-text">
                <AlertCircle className="h-4 w-4 text-ui-warning" />
                Not structured yet
              </div>
              <div className="flex flex-wrap gap-2">
                {parsed.unclassified.map((item, index) => (
                  <span key={index} className="rounded-full bg-ui-surface px-2.5 py-1 text-xs text-ui-muted ring-1 ring-ui-border">
                    {item}
                  </span>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {error && (
        <p className="mt-4 rounded-xl border border-ui-danger/20 bg-ui-danger-soft px-3 py-2 text-sm text-ui-danger">
          {error}
        </p>
      )}
    </WorkflowDialog>
  );
}
