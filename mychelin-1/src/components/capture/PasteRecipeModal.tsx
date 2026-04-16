"use client";

import { useState } from "react";
import { Button } from "@radix-ui/themes";
import { Cross2Icon, MagicWandIcon } from "@radix-ui/react-icons";

interface ExtractedRecipe {
  title?: string;
  description?: string;
  ingredients?: Array<{
    name: string;
    quantity?: number | null;
    unit?: string | null;
    notes?: string;
  }>;
  instructions?: Array<{
    stepNumber: number;
    content: string;
    tip?: string;
  }>;
  yield?: string;
  prepTime?: string;
  cookTime?: string;
  cuisine?: string;
  origin?: string;
  dialect?: string;
  occasion?: string;
  familyMember?: string;
  story?: string;
}

interface PasteRecipeModalProps {
  recipeId: number;
  onClose: () => void;
  onRecipeUpdated?: () => void;
}

type Step = "paste" | "processing" | "saving";

// Try to pull a short title from the first non-blank line of pasted
// text. Falls back to "Quick capture" if the text is too long or
// looks like a URL / code block.
function inferTitle(raw: string): string {
  const firstLine = raw.split("\n").find((l) => l.trim().length > 0)?.trim();
  if (!firstLine) return "Quick capture";
  // If the first line is short and doesn't look like a URL, use it
  if (firstLine.length <= 80 && !/^https?:\/\//i.test(firstLine)) {
    return firstLine;
  }
  return "Quick capture";
}

// Paste a blob of recipe text from anywhere (webpage, WhatsApp, photo
// OCR, etc.), have Gemini extract it, and PATCH the result into the
// current recipe. If extraction fails or the user opts out, the raw
// text is saved as a pre-recipe draft (description) so it's never lost.
export function PasteRecipeModal({
  recipeId,
  onClose,
  onRecipeUpdated,
}: PasteRecipeModalProps) {
  const [text, setText] = useState("");
  const [step, setStep] = useState<Step>("paste");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Save raw text to the recipe as a pre-recipe draft. Used both as a
  // fallback when extraction fails and as a direct "save draft" action.
  const saveDraft = async (rawText: string) => {
    const trimmed = rawText.trim();
    if (!trimmed) return;
    try {
      await fetch(`/api/recipes/${recipeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: inferTitle(trimmed),
          description: trimmed,
        }),
      });
      onRecipeUpdated?.();
      onClose();
    } catch (err) {
      console.error("Failed to save draft:", err);
      // Last resort — at least close so the user isn't stuck
      onClose();
    }
  };

  const handleExtract = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setErrorMessage(null);
    setStep("processing");
    try {
      // 1. Ask Gemini to parse the blob into a structured recipe.
      const pasteRes = await fetch("/api/capture/paste", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed }),
      });
      if (!pasteRes.ok) {
        const body = await pasteRes.json().catch(() => ({}));
        throw new Error(body.error || "Could not extract recipe from text");
      }
      const { recipe } = (await pasteRes.json()) as { recipe: ExtractedRecipe };

      // 2. PATCH the current recipe with the extracted fields.
      const patchRes = await fetch(`/api/recipes/${recipeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: recipe.title || undefined,
          description: recipe.description || undefined,
          cuisine: recipe.cuisine || undefined,
          yield: recipe.yield || undefined,
          prepTime: recipe.prepTime ? Number(recipe.prepTime) || undefined : undefined,
          cookTime: recipe.cookTime ? Number(recipe.cookTime) || undefined : undefined,
          story: recipe.story || undefined,
          origin: recipe.origin || undefined,
          dialect: recipe.dialect || undefined,
          occasion: recipe.occasion || undefined,
          familyMember: recipe.familyMember || undefined,
          ingredients: recipe.ingredients ?? [],
          instructions: recipe.instructions ?? [],
        }),
      });
      if (!patchRes.ok) {
        throw new Error("Failed to update recipe with extracted data");
      }

      onRecipeUpdated?.();
      onClose();
    } catch (err: any) {
      console.error("Paste extract failed:", err);
      // Extraction failed — save the raw text so it's not lost.
      setStep("saving");
      await saveDraft(trimmed);
    }
  };

  const handleSaveDraft = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setStep("saving");
    saveDraft(trimmed);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch justify-center bg-black/50 sm:items-center sm:p-4"
      onMouseDown={(e) => {
        // Only close if the mousedown started on the backdrop itself —
        // not when the user drags a text selection out of the textarea
        // and releases on the backdrop.
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="flex h-full w-full flex-col bg-white sm:h-auto sm:max-h-[90vh] sm:max-w-lg sm:rounded-2xl sm:shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">📋</span>
            <div>
              <h2 className="text-sm font-semibold text-neutral-900">
                Quick capture
              </h2>
              <p className="text-[11px] text-neutral-500">
                {step === "paste" &&
                  "Paste anything — a URL, a message, a photo OCR, whatever"}
                {step === "processing" && "Extracting recipe…"}
                {step === "saving" && "Saving your text…"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
          >
            <Cross2Icon className="h-4 w-4" />
          </button>
        </div>

        {step === "paste" && (
          <>
            <div className="flex-1 overflow-y-auto px-4 py-4">
              <textarea
                id="paste-recipe-text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={`Paste anything — ingredients, steps, a blog post URL, a WhatsApp message…\n\nThe AI will try to structure it into a recipe. If it can't, your text is saved as a draft so nothing is lost.`}
                rows={14}
                className="w-full resize-y rounded-xl border border-neutral-300 bg-neutral-50 px-3 py-3 text-sm leading-relaxed text-neutral-800 outline-none transition focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-100 placeholder:text-neutral-400"
                autoFocus
              />
              <p className="mt-2 text-[11px] text-neutral-400">
                {text.length.toLocaleString()} characters
              </p>
            </div>

            <div className="flex items-center gap-2 border-t border-neutral-200 bg-white px-4 py-3">
              <Button variant="soft" color="gray" onClick={onClose}>
                Cancel
              </Button>
              <Button
                variant="soft"
                onClick={handleSaveDraft}
                disabled={!text.trim()}
              >
                Save draft
              </Button>
              <Button
                onClick={handleExtract}
                disabled={!text.trim()}
                className="flex-1 bg-amber-600 hover:bg-amber-700 text-white"
              >
                <MagicWandIcon />
                Extract recipe
              </Button>
            </div>
          </>
        )}

        {(step === "processing" || step === "saving") && (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-10">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-amber-200 border-t-amber-600" />
            <p className="text-center text-sm text-neutral-700">
              {step === "processing"
                ? "Reading the text and structuring the recipe…"
                : "Saving your text as a draft…"}
            </p>
            {step === "processing" && (
              <p className="text-center text-xs text-neutral-400">
                This usually takes 5–15 seconds.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
