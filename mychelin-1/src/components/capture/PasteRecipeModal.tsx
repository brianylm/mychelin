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

type Step = "paste" | "processing";

// Paste a blob of recipe text from anywhere (webpage, WhatsApp, photo
// OCR, etc.), have Gemini extract it, and PATCH the result into the
// current recipe. Lives alongside ConversationCapture as a second way
// to seed a new empty recipe.
export function PasteRecipeModal({
  recipeId,
  onClose,
  onRecipeUpdated,
}: PasteRecipeModalProps) {
  const [text, setText] = useState("");
  const [step, setStep] = useState<Step>("paste");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
      setErrorMessage(err?.message || "Failed to extract recipe");
      setStep("paste");
    }
  };

  const isSetupError =
    errorMessage != null &&
    /not configured|google_api_key|gemini_api_key/i.test(errorMessage);

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch justify-center bg-black/50 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="flex h-full w-full flex-col bg-white sm:h-auto sm:max-h-[90vh] sm:max-w-lg sm:rounded-2xl sm:shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">📋</span>
            <div>
              <h2 className="text-sm font-semibold text-neutral-900">
                Paste a recipe
              </h2>
              <p className="text-[11px] text-neutral-500">
                {step === "paste" &&
                  "Copy from anywhere — a webpage, a message, a photo — and the AI will structure it"}
                {step === "processing" && "Extracting recipe…"}
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
              <label
                htmlFor="paste-recipe-text"
                className="mb-2 block text-xs font-semibold uppercase tracking-wide text-neutral-500"
              >
                Recipe text
              </label>
              <textarea
                id="paste-recipe-text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={`Paste anything — ingredients, steps, a whole blog post.\n\nExample:\n\nGrandma's Laksa\nServes 4\n\n500g prawns\n200g rice noodles\n2 tbsp laksa paste...\n\n1. Boil the stock\n2. Add the paste...`}
                rows={14}
                className="w-full resize-y rounded-xl border border-neutral-300 bg-neutral-50 px-3 py-3 text-sm leading-relaxed text-neutral-800 outline-none transition focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-100 placeholder:text-neutral-400"
                autoFocus
              />
              <p className="mt-2 text-[11px] text-neutral-400">
                {text.length.toLocaleString()} characters. Max ~20,000.
              </p>
            </div>

            {errorMessage && !isSetupError && (
              <div className="border-t border-red-200 bg-red-50 px-4 py-2 text-xs text-red-700">
                {errorMessage}
              </div>
            )}
            {isSetupError && (
              <div className="border-t border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
                <div className="mb-1 flex items-center gap-1.5 font-semibold">
                  <span>⚙️</span>
                  <span>Paste extraction needs a Gemini API key</span>
                </div>
                <p className="leading-relaxed text-amber-800">
                  Add a{" "}
                  <code className="rounded bg-amber-100 px-1">GOOGLE_API_KEY</code>{" "}
                  environment variable in Vercel → Project Settings →
                  Environment Variables, then redeploy. Free key at{" "}
                  <a
                    href="https://aistudio.google.com/apikey"
                    target="_blank"
                    rel="noreferrer"
                    className="underline"
                  >
                    aistudio.google.com/apikey
                  </a>
                  .
                </p>
              </div>
            )}

            <div className="flex items-center gap-2 border-t border-neutral-200 bg-white px-4 py-3">
              <Button variant="soft" color="gray" onClick={onClose}>
                Cancel
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

        {step === "processing" && (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-10">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-amber-200 border-t-amber-600" />
            <p className="text-center text-sm text-neutral-700">
              Reading the text and structuring the recipe…
            </p>
            <p className="text-center text-xs text-neutral-400">
              This usually takes 5–15 seconds.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
