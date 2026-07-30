"use client";

import { useState } from "react";
import { MagicWandIcon, Link2Icon } from "@radix-ui/react-icons";
import { Button } from "@/components/ui";
import { WorkflowDialog, WorkflowProcessing, WorkflowError } from "@/components/ui/WorkflowDialog";
import { RecipeCaptureReview } from "./RecipeCaptureReview";
import {
  saveCaptureDraft,
  loadCaptureDraft,
  clearCaptureDraft,
} from "@/lib/capture-draft-storage";

const DRAFT_KEY = "mychelin:capture:paste";

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

interface ErrorView {
  title: string;
  message: string;
  details?: string;
}

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

function rawError(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

function isSetupErrorText(text: string): boolean {
  return /not configured|google_api_key|gemini_api_key|deepseek_api_key/i.test(text);
}

// Turns raw failure text into a user-first error view. The raw text is
// kept for the collapsed technical details.
function toErrorView(err: unknown, context: "paste" | "url", host?: string): ErrorView {
  const raw = rawError(err, context === "url" ? "Failed to import from URL" : "Unknown error");
  if (isSetupErrorText(raw)) {
    return {
      title: "Recipe extraction isn't set up yet",
      message:
        "This needs an AI API key on the server. If you run this app, the setup notes are in the technical details — otherwise let whoever hosts it know.",
      details: raw,
    };
  }
  if (/empty recipe/i.test(raw)) {
    return {
      title: "Couldn't find a recipe in that text",
      message:
        "Check what you pasted, edit it and try again — or save it as a draft and structure it yourself.",
      details: raw,
    };
  }
  if (context === "url") {
    return {
      title: "Couldn't import from that link",
      message: `We couldn't get a usable recipe${host ? ` from ${host}` : ""}. Copy the recipe text from the page and paste it in Text mode instead.`,
      details: raw,
    };
  }
  return {
    title: "Extraction didn't work",
    message:
      "The recipe service had a hiccup — your text is safe. Try again, or save it as a draft.",
    details: raw,
  };
}

export function PasteRecipeModal({
  recipeId,
  onClose,
  onRecipeUpdated,
  initialMode = "paste",
}: PasteRecipeModalProps) {
  const [text, setTextState] = useState(() => loadCaptureDraft(DRAFT_KEY)?.text ?? "");
  const [step, setStep] = useState<Step>("paste");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorView, setErrorView] = useState<ErrorView | null>(null);
  const [processingLabel, setProcessingLabel] = useState("");
  const [captureMode, setCaptureMode] = useState<"paste" | "url">(initialMode);
  const [reviewRecipe, setReviewRecipe] = useState<ExtractedRecipe | null>(null);
  const [reviewSourceUrl, setReviewSourceUrl] = useState<string | undefined>();

  const urlMode = captureMode === "url";
  const hasValidUrl = looksLikeUrl(text);
  const isUrl = urlMode || hasValidUrl;

  // Every keystroke is backed up to localStorage — an accidental close
  // never loses pasted text. Cleared on successful save.
  const setText = (next: string) => {
    setTextState(next);
    if (next.trim()) saveCaptureDraft(DRAFT_KEY, { text: next });
    else clearCaptureDraft(DRAFT_KEY);
  };

  const saveDraft = async (rawText: string, sourceUrl?: string) => {
    const trimmed = rawText.trim();
    if (!trimmed) return;
    setProcessingLabel("Saving draft...");
    setStep("saving");
    try {
      const res = await fetch(`/api/recipes/${recipeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: inferTitle(trimmed),
          description: trimmed,
          ...(sourceUrl ? { sourceUrl } : {}),
        }),
      });
      if (!res.ok) throw new Error(`Save failed (${res.status})`);
      clearCaptureDraft(DRAFT_KEY);
      onRecipeUpdated?.();
      onClose();
    } catch (err: unknown) {
      // Never close-and-delete with the user's text — stay and explain.
      console.error("Failed to save draft:", err);
      setErrorView({
        title: "Couldn't save the draft",
        message: "Your text is still here — try saving again.",
        details: rawError(err, "Save failed"),
      });
      setStep("error");
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
    setErrorView(null);
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
        const { recipe, sourceUrl, text: scrapedText } = await urlRes.json();

        const hasContent = recipe &&
          (recipe.title?.trim() || recipe.ingredients?.length || recipe.instructions?.length);

        if (hasContent) {
          setReviewRecipe(recipe);
          setReviewSourceUrl(sourceUrl);
          setStep("review");
          return;
        }

        // Extraction found no recipe, but the page text was scraped —
        // hand it to the user in Text mode instead of discarding it.
        if (typeof scrapedText === "string" && scrapedText.trim()) {
          setCaptureMode("paste");
          setText(scrapedText);
          setErrorMessage(
            `No recipe found on ${hostnameFrom(trimmed)} — we pulled the page text so you can edit it and extract again, or save it as a draft.`
          );
          setStep("paste");
          return;
        }

        throw new Error(`no-content:${hostnameFrom(trimmed)}`);
      } catch (err: unknown) {
        console.error("URL import failed:", err);
        setErrorView(toErrorView(err, "url", hostnameFrom(trimmed)));
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
        setErrorView(toErrorView(err, "paste"));
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
      clearCaptureDraft(DRAFT_KEY);
      onRecipeUpdated?.();
      onClose();
    } catch (err: unknown) {
      console.error("Failed to save reviewed recipe:", err);
      setErrorMessage(rawError(err, "Failed to save reviewed recipe"));
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

  const subtitle = (() => {
    if (step === "paste") {
      if (!isUrl) return "Paste copied recipe text or OCR notes — nothing is lost if extraction fails";
      return hasValidUrl
        ? `Import recipe from ${hostnameFrom(text.trim())}`
        : text.trim()
          ? "Paste a full URL starting with https:// or http://"
          : "Paste a recipe page, blog post, or video link";
    }
    if (step === "processing") return processingLabel;
    if (step === "review") return "Review before saving";
    if (step === "saving") return "Saving your recipe...";
    return "Something went wrong";
  })();

  return (
    <WorkflowDialog
      open
      onClose={onClose}
      title={isUrl ? "Import from link" : "Paste recipe text"}
      subtitle={subtitle}
      className="sm:max-w-2xl"
      footer={
        step === "paste" ? (
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            {!isUrl && (
              <Button variant="secondary" onClick={handleSaveDraft} disabled={!text.trim()}>
                Save text draft
              </Button>
            )}
            <Button className="flex-1" onClick={handleExtract} disabled={!text.trim()}>
              {isUrl ? "Import from link" : "Extract from text"}
            </Button>
          </div>
        ) : undefined
      }
    >
      {step === "paste" && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2 rounded-full bg-ui-surface-subtle p-1 ring-1 ring-ui-border">
            <button
              type="button"
              onClick={() => switchCaptureMode("paste")}
              className={`rounded-full px-3 py-2 text-sm font-medium transition ${!urlMode ? "bg-ui-surface-raised text-ui-text shadow-sm" : "text-ui-muted hover:text-ui-text"}`}
            >
              Text
            </button>
            <button
              type="button"
              onClick={() => switchCaptureMode("url")}
              className={`rounded-full px-3 py-2 text-sm font-medium transition ${urlMode ? "bg-ui-surface-raised text-ui-text shadow-sm" : "text-ui-muted hover:text-ui-text"}`}
            >
              Link
            </button>
          </div>

          <textarea
            id="paste-recipe-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={
              isUrl
                ? "https://example.com/family-recipe"
                : `Paste ingredients, steps, a WhatsApp message, photo OCR, or notes from a call.\n\nIf extraction misses, you can still save the text as a draft.`
            }
            rows={isUrl ? 5 : 12}
            className={`w-full resize-y rounded-xl border border-ui-border-strong bg-ui-surface-subtle px-3 py-3 text-sm leading-relaxed text-ui-text outline-none transition focus:border-ui-accent/45 focus:bg-ui-surface-raised focus:ring-2 focus:ring-ui-focus-soft placeholder:text-ui-muted ${isUrl ? "font-mono" : ""}`}
            autoFocus
          />
          <div className="flex items-center justify-between gap-2 text-[11px] text-ui-muted">
            {!isUrl && <span>{text.length.toLocaleString()} characters</span>}
            {hasValidUrl && (
              <span className="inline-flex items-center gap-1.5 text-ui-success">
                <Link2Icon className="h-3 w-3" />
                URL detected — will fetch and extract the recipe
              </span>
            )}
          </div>

          {errorMessage && (
            <div className="rounded-lg border border-ui-accent/15 bg-ui-accent/5 px-3 py-2 text-xs leading-5 text-ui-text">
              {errorMessage}
            </div>
          )}
        </div>
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
        <WorkflowProcessing label={processingLabel || "Processing…"} />
      )}

      {step === "error" && errorView && (
        <WorkflowError
          title={errorView.title}
          message={errorView.message}
          technicalDetails={errorView.details}
        >
          {isUrl ? (
            <>
              <Button
                variant="secondary"
                onClick={() => {
                  switchCaptureMode("paste");
                  setText("");
                  setErrorView(null);
                  setStep("paste");
                }}
              >
                Switch to Text
              </Button>
              <Button variant="secondary" onClick={() => saveDraft(text.trim(), text.trim())}>
                Save source link only
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="secondary"
                onClick={() => {
                  setErrorView(null);
                  setStep("paste");
                }}
              >
                Back to edit
              </Button>
              <Button variant="secondary" onClick={handleSaveDraft}>
                Save as draft
              </Button>
            </>
          )}
          <Button onClick={handleExtract} iconStart={<MagicWandIcon />}>
            Retry
          </Button>
        </WorkflowError>
      )}
    </WorkflowDialog>
  );
}
