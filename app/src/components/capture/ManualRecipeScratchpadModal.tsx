"use client";

import { useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Flame, PencilLine, Timer, X } from "lucide-react";
import {
  formatManualIngredientPreview,
  parseManualRecipeScratchpad,
  type ManualParsedIngredient,
  type ManualParsedInstruction,
} from "@/lib/manual-recipe-parser";
import { HEAT_CONFIG } from "@/lib/instruction-heat";

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
  const [title, setTitle] = useState(initialTitle);
  const [scratchpad, setScratchpad] = useState("");
  const [phase, setPhase] = useState<"capture" | "review">("capture");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const parsed = useMemo(() => parseManualRecipeScratchpad(scratchpad), [scratchpad]);

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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create recipe");
      setPhase("review");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] bg-stone-950/45 px-3 py-3 sm:px-6 sm:py-5">
      <div className="mx-auto flex h-full max-w-3xl flex-col overflow-hidden rounded-lg border border-ui-border-strong bg-ui-surface shadow-xl">
        <header className="flex items-start justify-between gap-4 border-b border-[#eadfce] bg-white px-5 py-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#800020]">
              Write or paste recipe
            </p>
            <h2 className="mt-1 text-xl font-semibold text-[#1f1714]">
              {phase === "capture" ? "Start with what you know" : "Review the structure"}
            </h2>
            <p className="mt-1 max-w-xl text-sm leading-6 text-stone-500">
              {phase === "capture"
                ? "Type naturally or paste OCR text, WhatsApp notes, cookbook text, or a rough memory dump. Mychelin will split obvious ingredients, steps, heat, and timings before saving."
                : "Check the structure before this becomes a recipe. Ingredients can be filled in later if they are still rough."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-ui-border-strong bg-ui-surface-raised text-ui-muted transition-[background-color,border-color,color] duration-200 hover:border-ui-accent/35 hover:bg-ui-accent-muted hover:text-ui-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-focus"
            aria-label="Close write or paste recipe"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <main className="flex-1 overflow-y-auto px-5 py-5">
          {phase === "capture" ? (
            <div className="grid gap-4">
              <label className="grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                  Recipe name
                </span>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="e.g. Ah Ma's tau yu bak"
                  className="h-12 rounded-lg border border-ui-border-strong bg-ui-surface-raised px-4 text-base font-semibold text-ui-text outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-ui-muted focus:border-ui-accent focus:ring-2 focus:ring-ui-focus-soft"
                  autoFocus
                />
              </label>

              <label className="grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                  Recipe notes
                </span>
                <textarea
                  value={scratchpad}
                  onChange={(event) => setScratchpad(event.target.value)}
                  placeholder="Type or paste ingredients, steps, timings, heat, rough notes..."
                  rows={12}
                  className="min-h-[300px] resize-y rounded-lg border border-ui-border-strong bg-ui-surface-raised px-4 py-3 text-base leading-7 text-ui-text outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-ui-muted focus:border-ui-accent focus:ring-2 focus:ring-ui-focus-soft"
                />
              </label>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setScratchpad(EXAMPLE_TEXT)}
                  className="h-11 rounded-lg border border-ui-border-strong bg-ui-surface-raised px-3 text-xs font-semibold text-ui-muted transition-[background-color,border-color,color] duration-200 hover:border-ui-accent/35 hover:bg-ui-accent-muted hover:text-ui-accent"
                >
                  Use example
                </button>
                <span className="text-xs text-stone-400">
                  Tip: headings like Ingredients and Steps make parsing more reliable, but plain paragraphs work too.
                </span>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
              <section className="rounded-2xl border border-[#eadfce] bg-white p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-stone-900">Ingredients</h3>
                  <span className="rounded-full bg-[#800020]/10 px-2 py-0.5 text-xs font-semibold text-[#800020]">
                    {parsed.ingredients.length}
                  </span>
                </div>
                {parsed.ingredients.length === 0 ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm leading-6 text-amber-800">
                    No ingredients detected yet. You can still create the recipe, but shopping lists and scaling work better once ingredients are added.
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {parsed.ingredients.map((ingredient, index) => (
                      <li key={index} className="flex items-start gap-2 rounded-xl border border-stone-100 bg-stone-50 px-3 py-2 text-sm text-stone-700">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                        <span>{formatManualIngredientPreview(ingredient)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="rounded-2xl border border-[#eadfce] bg-white p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-stone-900">Steps</h3>
                  <span className="rounded-full bg-[#800020]/10 px-2 py-0.5 text-xs font-semibold text-[#800020]">
                    {parsed.instructions.length}
                  </span>
                </div>
                <ol className="space-y-2">
                  {parsed.instructions.map((instruction, index) => (
                    <li key={index} className="rounded-xl border border-stone-100 bg-stone-50 px-3 py-2">
                      <div className="flex gap-2 text-sm leading-6 text-stone-800">
                        <span className="font-semibold text-[#800020]">{index + 1}.</span>
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
                            <span className="inline-flex items-center gap-1 rounded-full border border-[#d7c7ad] bg-[#fff8ea] px-2 py-0.5 text-[11px] font-semibold text-[#6f4a12]">
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
                <section className="rounded-2xl border border-stone-200 bg-stone-50 p-4 lg:col-span-2">
                  <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-stone-700">
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                    Not structured yet
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {parsed.unclassified.map((item, index) => (
                      <span key={index} className="rounded-full bg-white px-2.5 py-1 text-xs text-stone-500 ring-1 ring-stone-200">
                        {item}
                      </span>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}

          {error && (
            <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
        </main>

        <footer className="flex flex-col gap-2 border-t border-[#eadfce] bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={phase === "capture" ? onClose : () => setPhase("capture")}
            className="min-h-11 rounded-lg px-4 text-sm font-semibold text-ui-muted transition-colors duration-200 hover:bg-ui-surface-subtle hover:text-ui-text"
          >
            {phase === "capture" ? "Cancel" : "Edit scratchpad"}
          </button>
          <button
            type="button"
            onClick={phase === "capture" ? reviewRecipe : createRecipe}
            disabled={saving}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-ui-action px-5 text-sm font-semibold text-ui-action-text transition-colors duration-200 hover:bg-ui-action-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            <PencilLine className="h-4 w-4" />
            {saving ? "Saving..." : phase === "capture" ? "Structure recipe" : saveLabel}
          </button>
        </footer>
      </div>
    </div>
  );
}
