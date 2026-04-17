"use client";

import { useState } from "react";
import { Button } from "@radix-ui/themes";
import { Cross2Icon, MagicWandIcon, Link2Icon } from "@radix-ui/react-icons";

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

type Step = "paste" | "processing" | "saving" | "error";

function looksLikeUrl(text: string): boolean {
  const trimmed = text.trim();
  if (/\s/.test(trimmed)) return false;
  return /^https?:\/\/.+\..+/i.test(trimmed);
}

function inferTitle(raw: string): string {
  const firstLine = raw.split("\n").find((l) => l.trim().length > 0)?.trim();
  if (!firstLine) return "Quick capture";
  if (firstLine.length <= 80 && !/^https?:\/\//i.test(firstLine)) {
    return firstLine;
  }
  return "Quick capture";
}

function hostnameFrom(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function PasteRecipeModal({
  recipeId,
  onClose,
  onRecipeUpdated,
}: PasteRecipeModalProps) {
  const [text, setText] = useState("");
  const [step, setStep] = useState<Step>("paste");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [processingLabel, setProcessingLabel] = useState("");

  const isUrl = looksLikeUrl(text);

  const saveDraft = async (rawText: string, sourceUrl?: string) => {
    const trimmed = rawText.trim();
    if (!trimmed) return;
    setStep("saving");
    try {
      await fetch(`/api/recipes/${recipeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: inferTitle(trimmed),
          description: trimmed,
          ...(sourceUrl ? { sourceUrl } : {}),
        }),
      });
      onRecipeUpdated?.();
      onClose();
    } catch (err) {
      console.error("Failed to save draft:", err);
      onClose();
    }
  };

  const patchRecipe = async (recipe: ExtractedRecipe, sourceUrl?: string) => {
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
        ...(sourceUrl ? { sourceUrl } : {}),
      }),
    });
    if (!patchRes.ok) {
      throw new Error("Failed to update recipe with extracted data");
    }
  };

  const handleExtract = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setErrorMessage(null);
    setStep("processing");

    if (looksLikeUrl(trimmed)) {
      setProcessingLabel(`Fetching ${hostnameFrom(trimmed)}…`);
      try {
        const urlRes = await fetch("/api/capture/url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: trimmed }),
        });
        if (!urlRes.ok) {
          const body = await urlRes.json().catch(() => ({}));
          throw new Error(body.error || "Could not fetch the URL");
        }
        const { recipe, sourceUrl, text: rawText } = await urlRes.json();

        const hasContent = recipe &&
          (recipe.title?.trim() || recipe.ingredients?.length || recipe.instructions?.length);

        if (hasContent) {
          setProcessingLabel("Saving recipe…");
          await patchRecipe(recipe, sourceUrl);
          onRecipeUpdated?.();
          onClose();
          return;
        }

        // Site blocked our fetch or returned no recipe content.
        // Don't save garbage HTML as a draft — prompt user to paste instead.
        throw new Error(
          `Couldn't extract recipe content from ${hostnameFrom(trimmed)}. ` +
          `Try copying the recipe text from the page and pasting it here instead.`
        );
      } catch (err: any) {
        console.error("URL import failed:", err);
        setErrorMessage(err?.message || "Failed to import from URL");
        setStep("error");
      }
    } else {
      setProcessingLabel("Extracting recipe…");
      try {
        const pasteRes = await fetch("/api/capture/paste", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: trimmed }),
        });
        if (!pasteRes.ok) {
          const body = await pasteRes.json().catch(() => ({}));
          throw new Error(body.error || `Extraction failed (${pasteRes.status})`);
        }
        const { recipe } = (await pasteRes.json()) as { recipe: ExtractedRecipe };

        if (!recipe) {
          throw new Error("Gemini returned an empty recipe object");
        }

        await patchRecipe(recipe);
        onRecipeUpdated?.();
        onClose();
      } catch (err: any) {
        console.error("Paste extract failed:", err);
        setErrorMessage(err?.message || "Unknown error");
        setStep("error");
      }
    }
  };

  const handleSaveDraft = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    saveDraft(trimmed);
  };

  const isSetupError =
    errorMessage != null &&
    /not configured|google_api_key|gemini_api_key/i.test(errorMessage);

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch justify-center bg-black/50 sm:items-center sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="flex h-full w-full flex-col bg-white sm:h-auto sm:max-h-[90vh] sm:max-w-lg sm:rounded-2xl sm:shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">{isUrl ? "🌐" : "📋"}</span>
            <div>
              <h2 className="text-sm font-semibold text-neutral-900">
                {isUrl ? "Import from URL" : "Quick capture"}
              </h2>
              <p className="text-[11px] text-neutral-500">
                {step === "paste" && !isUrl &&
                  "Paste anything — a URL, a message, a photo OCR, whatever"}
                {step === "paste" && isUrl &&
                  `Import recipe from ${hostnameFrom(text.trim())}`}
                {step === "processing" && processingLabel}
                {step === "saving" && "Saving your text…"}
                {step === "error" && "Extraction didn\u2019t work"}
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
              {!isUrl && (
                <p className="mt-2 text-[11px] text-neutral-400">
                  {text.length.toLocaleString()} characters
                </p>
              )}
              {isUrl && (
                <div className="mt-2 flex items-center gap-1.5 text-[11px] text-emerald-600">
                  <Link2Icon className="h-3 w-3" />
                  <span>URL detected — will fetch and extract the recipe</span>
                </div>
              )}
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
                  <span>Recipe extraction needs a Gemini API key</span>
                </div>
                <p className="leading-relaxed text-amber-800">
                  Add a{" "}
                  <code className="rounded bg-amber-100 px-1">GOOGLE_API_KEY</code>{" "}
                  environment variable in Vercel, then redeploy. Free key at{" "}
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
              {!isUrl && (
                <Button
                  variant="soft"
                  onClick={handleSaveDraft}
                  disabled={!text.trim()}
                >
                  Save draft
                </Button>
              )}
              <Button
                onClick={handleExtract}
                disabled={!text.trim()}
                className="flex-1 bg-amber-600 hover:bg-amber-700 text-white"
              >
                {isUrl ? <Link2Icon /> : <MagicWandIcon />}
                {isUrl ? "Import recipe" : "Extract recipe"}
              </Button>
            </div>
          </>
        )}

        {(step === "processing" || step === "saving") && (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-10">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-amber-200 border-t-amber-600" />
            <p className="text-center text-sm text-neutral-700">
              {processingLabel || "Processing…"}
            </p>
            {step === "processing" && (
              <p className="text-center text-xs text-neutral-400">
                {isUrl
                  ? "Fetching the page and extracting the recipe…"
                  : "This usually takes 5–15 seconds."}
              </p>
            )}
          </div>
        )}

        {step === "error" && (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-10">
            <span className="text-3xl">⚠️</span>
            <p className="text-center text-sm font-medium text-neutral-800">
              Extraction failed
            </p>
            <p className="rounded-lg bg-red-50 px-3 py-2 text-center text-xs text-red-700">
              {errorMessage}
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {isUrl ? (
                <Button
                  variant="soft"
                  onClick={() => {
                    setText("");
                    setErrorMessage(null);
                    setStep("paste");
                  }}
                >
                  Paste text instead
                </Button>
              ) : (
                <>
                  <Button
                    variant="soft"
                    onClick={() => {
                      setErrorMessage(null);
                      setStep("paste");
                    }}
                  >
                    Back to edit
                  </Button>
                  <Button
                    variant="soft"
                    color="amber"
                    onClick={handleSaveDraft}
                  >
                    Save as draft
                  </Button>
                </>
              )}
              <Button onClick={handleExtract}>
                <MagicWandIcon />
                Retry
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
