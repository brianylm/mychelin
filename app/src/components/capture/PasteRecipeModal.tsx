"use client";

import { useState } from "react";
import { Button } from "@radix-ui/themes";
import { Cross2Icon, MagicWandIcon, Link2Icon } from "@radix-ui/react-icons";
import { RecipeCaptureReview } from "./RecipeCaptureReview";

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
  initialMode?: "paste" | "url";
}

type Step = "paste" | "processing" | "review" | "saving" | "error";

function looksLikeUrl(text: string): boolean {
  const trimmed = text.trim();
  if (/\s/.test(trimmed)) return false;
  return /^https?:\/\/.+\..+/i.test(trimmed);
}

function inferTitle(raw: string): string {
  const firstLine = raw.split("\n").find((l) => l.trim().length > 0)?.trim();
  if (!firstLine) return "Recipe notes";
  if (firstLine.length <= 80 && !/^https?:\/\//i.test(firstLine)) {
    return firstLine;
  }
  return "Recipe notes";
}

function hostnameFrom(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function messageFromError(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

export function PasteRecipeModal({
  recipeId,
  onClose,
  onRecipeUpdated,
  initialMode = "paste",
}: PasteRecipeModalProps) {
  const [text, setText] = useState("");
  const [step, setStep] = useState<Step>("paste");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [processingLabel, setProcessingLabel] = useState("");
  const [captureMode, setCaptureMode] = useState<"paste" | "url">(initialMode);
  const [reviewRecipe, setReviewRecipe] = useState<ExtractedRecipe | null>(null);
  const [reviewSourceUrl, setReviewSourceUrl] = useState<string | undefined>();

  const urlMode = captureMode === "url";
  const hasValidUrl = looksLikeUrl(text);
  const isUrl = urlMode || hasValidUrl;

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
    if (urlMode && !looksLikeUrl(trimmed)) {
      setErrorMessage("Paste a full URL starting with https:// or http://.");
      return;
    }
    setErrorMessage(null);
    setReviewRecipe(null);
    setReviewSourceUrl(undefined);
    setStep("processing");

    if (isUrl) {
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
        const { recipe, sourceUrl } = await urlRes.json();

        const hasContent = recipe &&
          (recipe.title?.trim() || recipe.ingredients?.length || recipe.instructions?.length);

        if (hasContent) {
          setReviewRecipe(recipe);
          setReviewSourceUrl(sourceUrl);
          setStep("review");
          return;
        }

        // Site blocked our fetch or returned no recipe content.
        // Don't save garbage HTML as a draft — prompt user to paste instead.
        throw new Error(
          `Couldn't extract recipe content from ${hostnameFrom(trimmed)}. ` +
          `Try copying the recipe text from the page and pasting it here instead.`
        );
      } catch (err: unknown) {
        console.error("URL import failed:", err);
        setErrorMessage(messageFromError(err, "Failed to import from URL"));
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
          throw new Error("AI extraction returned an empty recipe object");
        }

        setReviewRecipe(recipe);
        setReviewSourceUrl(undefined);
        setStep("review");
      } catch (err: unknown) {
        console.error("Paste extract failed:", err);
        setErrorMessage(messageFromError(err, "Unknown error"));
        setStep("error");
      }
    }
  };

  const handleSaveReviewedRecipe = async () => {
    if (!reviewRecipe) return;
    setProcessingLabel("Saving recipe...");
    setStep("saving");
    try {
      await patchRecipe(reviewRecipe, reviewSourceUrl);
      onRecipeUpdated?.();
      onClose();
    } catch (err: unknown) {
      console.error("Failed to save reviewed recipe:", err);
      setErrorMessage(messageFromError(err, "Failed to save reviewed recipe"));
      setStep("review");
    }
  };

  const handleSaveDraft = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    saveDraft(trimmed);
  };

  const switchCaptureMode = (mode: "paste" | "url") => {
    setCaptureMode(mode);
    setErrorMessage(null);
    if (step === "error") setStep("paste");
  };

  const isSetupError =
    errorMessage != null &&
    /not configured|google_api_key|gemini_api_key|deepseek_api_key/i.test(errorMessage);

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch justify-center bg-stone-950/55 backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-[#fffdfb] sm:h-[90vh] sm:max-h-[760px] sm:max-w-2xl sm:rounded-[2rem] sm:border sm:border-white/70 sm:shadow-[0_24px_80px_rgba(60,43,25,0.18)]"
      >
        {/* Header */}
        <div className="shrink-0 border-b border-[#800020]/10 bg-white/[0.58] px-4 py-3 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#800020]/10 text-[#800020] ring-1 ring-[#800020]/10">
                {isUrl ? <Link2Icon className="h-4 w-4" /> : <MagicWandIcon className="h-4 w-4" />}
              </div>
              <div className="min-w-0">
                <h2 className="app-editorial-title text-xl leading-none text-[#1A1A1A]">
                  {isUrl ? "Import from link" : "Paste recipe text"}
                </h2>
                <p className="truncate text-[11px] text-neutral-500">
                  {step === "paste" && !isUrl &&
                    "Paste copied recipe text or OCR notes; use Write or paste recipe for free-form typing"}
                  {step === "paste" && isUrl &&
                    (hasValidUrl
                      ? `Import recipe from ${hostnameFrom(text.trim())}`
                      : text.trim()
                        ? "Paste a full URL starting with https:// or http://"
                        : "Paste a recipe page, blog post, or video link")}
                  {step === "processing" && processingLabel}
                  {step === "review" && "Review before saving"}
                  {step === "saving" && "Saving your recipe..."}
                  {step === "error" && "Extraction didn't work"}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="shrink-0 rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
            >
              <Cross2Icon className="h-4 w-4" />
            </button>
          </div>
        </div>

        {step === "paste" && (
          <>
            <div className="border-b border-[#d8d8d2] bg-white/70 px-4 py-3">
              <div className="grid grid-cols-2 gap-2 rounded-full bg-[#f6f2eb] p-1 ring-1 ring-[#ece8df]">
                <button
                  type="button"
                  onClick={() => switchCaptureMode("paste")}
                  className={`rounded-full px-3 py-2 text-sm font-medium transition ${!urlMode ? "bg-white text-[#241017] shadow-sm" : "text-stone-500 hover:text-stone-900"}`}
                >
                  Text
                </button>
                <button
                  type="button"
                  onClick={() => switchCaptureMode("url")}
                  className={`rounded-full px-3 py-2 text-sm font-medium transition ${urlMode ? "bg-white text-[#241017] shadow-sm" : "text-stone-500 hover:text-stone-900"}`}
                >
                  Link
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
              <textarea
                id="paste-recipe-text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={
                  isUrl
                    ? "https://example.com/family-recipe"
                    : `Paste ingredients, steps, a WhatsApp message, photo OCR, or notes from a call.\n\nIf extraction misses, you can still save the text as a draft.`
                }
                rows={isUrl ? 5 : 14}
                className={`w-full resize-y rounded-xl border border-neutral-300 bg-neutral-50 px-3 py-3 text-sm leading-relaxed text-neutral-800 outline-none transition focus:border-[#800020]/45 focus:bg-white focus:ring-2 focus:ring-[#800020]/10 placeholder:text-neutral-400 ${isUrl ? "font-mono" : ""}`}
                autoFocus
              />
              {!isUrl && (
                <p className="mt-2 text-[11px] text-neutral-400">
                  {text.length.toLocaleString()} characters
                </p>
              )}
              {hasValidUrl && (
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
              <div className="border-t border-[#800020]/15 bg-[#800020]/5 px-4 py-3 text-xs text-[#241017]">
                <div className="mb-1 flex items-center gap-1.5 font-semibold">
                  <span>Recipe extraction needs a DeepSeek API key</span>
                </div>
                <p className="leading-relaxed text-[#521224]">
                  Add a{" "}
                  <code className="rounded bg-[#800020]/10 px-1">DEEPSEEK_API_KEY</code>{" "}
                  environment variable in Vercel, then redeploy. Use <code className="rounded bg-[#800020]/10 px-1">DEEPSEEK_MODEL</code>{" "}
                  set to <code className="rounded bg-[#800020]/10 px-1">deepseek-v4-flash</code>.
                </p>
              </div>
            )}

            <div className="shrink-0 border-t border-neutral-200 bg-white px-4 py-3">
              <div className="flex items-center gap-2">
              <Button variant="soft" color="gray" onClick={onClose}>
                Cancel
              </Button>
              {!isUrl && (
                <Button
                  variant="soft"
                  onClick={handleSaveDraft}
                  disabled={!text.trim()}
                >
                  Save text draft
                </Button>
              )}
              <Button
                onClick={handleExtract}
                disabled={!text.trim()}
                className="flex-1 bg-[#17131f] hover:bg-[#800020] text-white"
              >
                {isUrl ? <Link2Icon /> : <MagicWandIcon />}
                {isUrl ? "Import from link" : "Extract from text"}
              </Button>
              </div>
            </div>
          </>
        )}

        {step === "review" && reviewRecipe && (
          <RecipeCaptureReview
            recipe={reviewRecipe}
            sourceLabel={reviewSourceUrl ? hostnameFrom(reviewSourceUrl) : "Pasted text"}
            saveLabel="Save reviewed recipe"
            onBack={() => setStep("paste")}
            onSave={handleSaveReviewedRecipe}
          />
        )}

        {(step === "processing" || step === "saving") && (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-10">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#800020]/15 border-t-[#800020]" />
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
                <>
                  <Button
                    variant="soft"
                    onClick={() => {
                      switchCaptureMode("paste");
                      setText("");
                      setErrorMessage(null);
                      setStep("paste");
                    }}
                  >
                    Switch to Text
                  </Button>
                  <Button
                    variant="soft"
                    onClick={() => saveDraft(text.trim(), text.trim())}
                  >
                    Save source link only
                  </Button>
                </>
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
