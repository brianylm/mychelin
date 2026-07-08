"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button, DropdownMenu } from "@radix-ui/themes";
import { BookOpen, ChefHat, Check, ClipboardPaste, Clock3, Link2, Mic2, PencilLine, Shuffle, Target, Utensils } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useRecipeStore } from "@/store/RecipeStore";
import { useToast } from "@/context/ToastContext";
import { useAuth } from "@/context/AuthContext";
import { RecipeTitleCard } from "./RecipeTitleCard";
import { RecipeDetailsCard } from "./RecipeDetailsCard";
import { BookSelector } from "./BookSelector";
import { IngredientList } from "./IngredientList";
import { RecipeSteps } from "./RecipeSteps";
import { StorySection } from "./StorySection";
import { RatingSection } from "./RatingSection";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";

import { PhotoUploadSection } from "./PhotoUploadSection";
import { CulturalContextCard } from "@/components/heritage/CulturalContextCard";
import { VoiceRecording } from "@/components/heritage/VoiceRecording";

import { LoadingAnimation } from "@/components/ui/LoadingAnimation";
import { ServingScaler } from "./ServingScaler";
import { CookWithMeSession } from "./CookWithMeSession";
import { AttemptHistory } from "./AttemptHistory";
import { AddToBookModal } from "@/components/books/AddToBookModal";
import { CreateBookModal } from "@/components/books/CreateBookModal";
import { ShareModal } from "@/components/sharing/ShareModal";
import { VersionTimeline } from "@/components/versions/VersionTimeline";
import { VersionCompare } from "@/components/versions/VersionCompare";
import { CookAlongCapture } from "@/components/versions/CookAlongCapture";
import { RefinementPanel } from "@/components/versions/RefinementPanel";
import { VersionDetailsModal } from "@/components/versions/VersionDetailsModal";
import { RecipeForkButton } from "./RecipeForkButton";
import { ForkedFromBadge } from "./ForkedFromBadge";
import { RecipeSaveStatus } from "./RecipeSaveStatus";
import { ConversationCapture } from "@/components/capture/ConversationCapture";
import { PasteRecipeModal } from "@/components/capture/PasteRecipeModal";
import { CookingPrinciples } from "@/components/books/CookingPrinciples";
import { PilotFeedbackPrompt } from "@/components/pilot/PilotFeedbackPrompt";
import type { Recipe } from "@/db/schema";

interface BookSummary {
  id: number;
  title: string;
  coverEmoji: string;
  coverColor: string;
  recipeCount: number;
  description: string | null;
}

interface RecipeViewProps {
  onOpenSidebar: () => void;
  onCookRecipe?: (recipeId: number) => void;
}

type RecipeCard = Pick<Recipe, "id" | "title" | "description" | "imageUrl" | "cuisine" | "prepTime" | "cookTime">;

type VersionIngredient = {
  name: string;
  quantity?: number;
  unit?: string;
  notes?: string;
  approximate?: boolean;
  quantityText?: string;
};

type NextTryIngredient = {
  name: string;
  quantity?: number | null;
  unit?: string | null;
  notes?: string | null;
  approximate?: boolean | null;
  quantityText?: string | null;
};

type VersionInstruction = {
  content?: string;
  text?: string;
  step?: number;
  stepNumber?: number;
  tip?: string;
  imageUrl?: string;
};

type RecipeVersion = {
  id: number;
  recipeId?: number;
  versionNumber: number;
  versionLabel: string | null;
  captureMethod: string;
  closenessRating: number | null;
  closenessNotes: string | null;
  changeNote: string | null;
  notes: string | null;
  createdAt: string;
  ingredients: VersionIngredient[];
  instructions: VersionInstruction[];
  sourceVersionId: number | null;
};

type RecipeNextTry = {
  id: number;
  sourceAttemptId: number | null;
  sourceVersionId: number | null;
  notes: string | null;
  ingredients: NextTryIngredient[];
  instructions: VersionInstruction[];
  createdAt: string;
  updatedAt: string;
};

function formatNextTryAmount(ingredient: NextTryIngredient): string {
  if (ingredient.quantityText) return ingredient.quantityText;
  const quantity = ingredient.quantity == null ? "" : String(ingredient.quantity);
  const unit = ingredient.unit ?? "";
  return [ingredient.approximate && quantity ? "about " + quantity : quantity, unit]
    .filter(Boolean)
    .join(" ") || "agak-agak";
}

function instructionText(step: VersionInstruction): string {
  return step.content ?? step.text ?? "";
}

function NextTryPanel({
  nextTry,
  busy,
  onPromote,
  onSetDefinitive,
  onDismiss,
}: {
  nextTry: RecipeNextTry;
  busy: string | null;
  onPromote: () => void;
  onSetDefinitive: () => void;
  onDismiss: () => void;
}) {
  return (
    <section className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-700">
            Private next try
          </p>
          <h2 className="mt-1 text-lg font-semibold text-[#241017]">
            Try this before changing the definitive recipe
          </h2>
          <p className="mt-1 text-sm leading-6 text-neutral-600">
            This is not shared. Promote it to a version only after you want to preserve it.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onPromote}
            disabled={busy !== null}
            className="rounded-full bg-[#17131f] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#800020] disabled:opacity-60"
          >
            {busy === "promote" ? "Promoting..." : "Promote to version"}
          </button>
          <button
            type="button"
            onClick={onSetDefinitive}
            disabled={busy !== null}
            className="rounded-full border border-[#800020]/20 bg-white px-3 py-2 text-xs font-semibold text-[#800020] transition hover:bg-[#800020]/5 disabled:opacity-60"
          >
            {busy === "definitive" ? "Setting..." : "Promote + set definitive"}
          </button>
          <button
            type="button"
            onClick={onDismiss}
            disabled={busy !== null}
            className="rounded-full bg-white/70 px-3 py-2 text-xs font-semibold text-neutral-600 transition hover:bg-white disabled:opacity-60"
          >
            {busy === "dismiss" ? "Discarding..." : "Discard"}
          </button>
        </div>
      </div>

      {nextTry.notes && (
        <p className="mt-3 rounded-xl bg-white/70 px-3 py-2 text-sm leading-6 text-neutral-700">
          {nextTry.notes}
        </p>
      )}

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {nextTry.ingredients.length > 0 && (
          <div className="rounded-xl bg-white/75 p-3">
            <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">Ingredients to try</h3>
            <ul className="mt-2 space-y-1.5 text-sm text-neutral-700">
              {nextTry.ingredients.slice(0, 5).map((ingredient, index) => (
                <li key={ingredient.name + index} className="flex gap-2">
                  <span className="font-semibold text-[#521224]">{formatNextTryAmount(ingredient)}</span>
                  <span>{ingredient.name}</span>
                </li>
              ))}
              {nextTry.ingredients.length > 5 && <li className="text-xs text-neutral-400">+ {nextTry.ingredients.length - 5} more</li>}
            </ul>
          </div>
        )}
        {nextTry.instructions.length > 0 && (
          <div className="rounded-xl bg-white/75 p-3">
            <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">Steps to try</h3>
            <ol className="mt-2 space-y-1.5 text-sm text-neutral-700">
              {nextTry.instructions.slice(0, 3).map((step, index) => (
                <li key={index} className="line-clamp-2">
                  <span className="font-semibold text-[#521224]">{step.step ?? step.stepNumber ?? index + 1}.</span> {instructionText(step)}
                </li>
              ))}
              {nextTry.instructions.length > 3 && <li className="text-xs text-neutral-400">+ {nextTry.instructions.length - 3} more steps</li>}
            </ol>
          </div>
        )}
      </div>
    </section>
  );
}

export function RecipeView({ onOpenSidebar, onCookRecipe }: RecipeViewProps) {
  const {
    recipes,
    loading,
    selectedRecipe,
    updateRecipe,
    deleteRecipe,
    addIngredient,
    updateIngredient,
    deleteIngredient,
    addInstruction,
    updateInstruction,
    deleteInstruction,
    selectRecipe,
    justCreatedRecipeId,
    clearJustCreated,
  } = useRecipeStore();
  const { addToast } = useToast();
  const { user } = useAuth();
  const qc = useQueryClient();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [cuisine, setCuisine] = useState("");
  const [prepTime, setPrepTime] = useState("");
  const [cookTime, setCookTime] = useState("");
  const [recipeYield, setRecipeYield] = useState("");
  const [savingTitle, setSavingTitle] = useState(false);
  const [savingDescription, setSavingDescription] = useState(false);
  const [savingCuisine, setSavingCuisine] = useState(false);
  const [savingPrepTime, setSavingPrepTime] = useState(false);
  const [savingCookTime, setSavingCookTime] = useState(false);
  const [savingYield, setSavingYield] = useState(false);
  const [ingredientScale, setIngredientScale] = useState(1);
  const [showAddToBookModal, setShowAddToBookModal] = useState(false);
  const [books, setBooks] = useState<BookSummary[]>([]);
  const [activeBookId, setActiveBookId] = useState<number | null>(null);
  const [activeBookRecipes, setActiveBookRecipes] = useState<RecipeCard[]>([]);
  const [loadingBookRecipes, setLoadingBookRecipes] = useState(false);
  const [showCreateBookModal, setShowCreateBookModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState<{ type: "recipe" | "book"; id: number; name: string } | null>(null);
  const [showCookWithMe, setShowCookWithMe] = useState(false);
  const [showCookAlong, setShowCookAlong] = useState(false);
  const [compareVersions, setCompareVersions] = useState<{ base: number; compare: number } | null>(null);
  const [refinementVersion, setRefinementVersion] = useState<RecipeVersion | null>(null);
  const [viewingVersion, setViewingVersion] = useState<RecipeVersion | null>(null);
  const [versionTimelineKey, setVersionTimelineKey] = useState(0);
  const [showVersionFeedback, setShowVersionFeedback] = useState(false);
  const [showCaptureModal, setShowCaptureModal] = useState(false);
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pasteMode, setPasteMode] = useState<"paste" | "url">("paste");
  // "Surprise me by..." state for the inline book view. When the user
  // opens the filter popover we show an input; typing narrows the
  // random pool to recipes whose title or an ingredient matches.
  const [surpriseByOpen, setSurpriseByOpen] = useState(false);
  const [surpriseByQuery, setSurpriseByQuery] = useState("");
  const [nextTry, setNextTry] = useState<RecipeNextTry | null>(null);
  const [nextTryBusy, setNextTryBusy] = useState<string | null>(null);
  const [recipeEditMode, setRecipeEditMode] = useState(false);
  const selectedRecipeRef = useRef(selectedRecipe);

  const promptVersionFeedback = useCallback(() => {
    if (typeof window === "undefined") return;
    const key = "mychelin_pilot_feedback_prompted_first_version";
    if (window.localStorage.getItem(key) === "1") return;
    window.localStorage.setItem(key, "1");
    window.setTimeout(() => setShowVersionFeedback(true), 500);
  }, []);

  // Cache for prefetched book recipes
  const [bookRecipesCache, setBookRecipesCache] = useState<Record<number, RecipeCard[]>>({});

  // Fetch books for card grid, then prefetch their recipes
  const fetchBooks = useCallback(() => {
    fetch("/api/books")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: BookSummary[]) => {
        setBooks(data);
        // Prefetch recipes for all books in parallel
        data.forEach((book) => {
          fetch(`/api/books/${book.id}/recipes`)
            .then((res) => (res.ok ? res.json() : []))
            .then((recipes) => {
              setBookRecipesCache((prev) => ({ ...prev, [book.id]: recipes }));
            })
            .catch(() => {});
        });
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  // Listen for create-book events from sidebar/card grid
  useEffect(() => {
    const handler = () => setShowCreateBookModal(true);
    window.addEventListener("mychelin:create-book", handler);
    return () => window.removeEventListener("mychelin:create-book", handler);
  }, []);

  const handleCreateBook = useCallback(async (bookData: {
    title: string;
    description?: string;
    coverEmoji?: string;
    coverColor?: string;
  }) => {
    try {
      const res = await fetch("/api/books", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bookData),
      });
      if (!res.ok) throw new Error("Failed to create book");
      setShowCreateBookModal(false);
      fetchBooks();
    } catch {}
  }, [fetchBooks]);

  const handleOpenBook = useCallback(async (bookId: number) => {
    setActiveBookId(bookId);
    // Use cached data instantly if available
    if (bookRecipesCache[bookId]) {
      setActiveBookRecipes(bookRecipesCache[bookId]);
      setLoadingBookRecipes(false);
    } else {
      setLoadingBookRecipes(true);
      setActiveBookRecipes([]);
    }
    // Always refresh in background
    try {
      const res = await fetch(`/api/books/${bookId}/recipes`);
      if (res.ok) {
        const data = await res.json();
        setActiveBookRecipes(data);
        setBookRecipesCache((prev) => ({ ...prev, [bookId]: data }));
      }
    } catch {} finally {
      setLoadingBookRecipes(false);
    }
  }, [bookRecipesCache]);

  const handleCloseBook = useCallback(() => {
    setActiveBookId(null);
    setActiveBookRecipes([]);
  }, []);

  // Sync local state with selected recipe
  useEffect(() => {
    if (selectedRecipe) {
      setTitle(selectedRecipe.title);
      setDescription(selectedRecipe.description ?? "");
      setCuisine(selectedRecipe.cuisine ?? "");
      setPrepTime(selectedRecipe.prepTime?.toString() ?? "");
      setCookTime(selectedRecipe.cookTime?.toString() ?? "");
      setRecipeYield(selectedRecipe.yield ?? "");
      setIngredientScale(1);
    }
  }, [selectedRecipe]);

  useEffect(() => {
    selectedRecipeRef.current = selectedRecipe;
  }, [selectedRecipe]);

  // Seed edit mode only when the selected recipe changes. Updates while editing
  // should not relock the page mid-edit.
  useEffect(() => {
    const recipe = selectedRecipeRef.current;
    if (!recipe) {
      setRecipeEditMode(false);
      return;
    }
    const isFreshRecipe =
      recipe.status === "draft" ||
      recipe.id === justCreatedRecipeId ||
      ((recipe.ingredients?.length ?? 0) === 0 &&
        (recipe.instructions?.length ?? 0) === 0);
    setRecipeEditMode(isFreshRecipe);
  }, [selectedRecipe?.id, justCreatedRecipeId]);

  const loadNextTry = useCallback(async () => {
    if (!selectedRecipe) {
      setNextTry(null);
      return;
    }
    try {
      const response = await fetch("/api/recipes/" + selectedRecipe.id + "/next-try");
      if (!response.ok) {
        setNextTry(null);
        return;
      }
      const data = await response.json();
      setNextTry(data.nextTry ?? null);
    } catch {
      setNextTry(null);
    }
  }, [selectedRecipe]);

  useEffect(() => {
    void loadNextTry();
  }, [loadNextTry, versionTimelineKey]);

  // Clear the just-created flag once we navigate away from the freshly
  // created recipe, so selecting it again later doesn't re-trigger the
  // auto-focus + select-all on the title.
  useEffect(() => {
    if (
      justCreatedRecipeId != null &&
      selectedRecipe &&
      selectedRecipe.id !== justCreatedRecipeId
    ) {
      clearJustCreated();
    }
  }, [justCreatedRecipeId, selectedRecipe, clearJustCreated]);

  // Draft model (F1): empty recipes are no longer silently deleted when the
  // user navigates away. They persist as drafts (status='draft' on the row,
  // tucked into the Drafts sidebar section). The user can manually delete
  // them from the recipe page, or let them sit until they come back to
  // finish the capture. This removes the biggest friction point in the
  // "capture first, structure later" input flow.

  // Auto-promote a draft to active once it has ANY signal of real intent.
  // Rule: a draft becomes "active" (and moves from the Drafts section into
  // the main recipe list) as soon as EITHER a non-placeholder title is set
  // OR at least one ingredient or instruction is added. Either signal is
  // enough — if the user typed a title, they meant to save a recipe; if
  // they pasted ingredients, same thing. Drafts are reserved for the
  // fully-empty "clicked New Recipe by mistake" state. This client-side
  // effect is a fallback; the server also runs the same check on every
  // ingredient/instruction insert and PATCH to /api/recipes/:id.
  const selectedId = selectedRecipe?.id;
  const selectedStatus = selectedRecipe?.status;
  const selectedTitle = selectedRecipe?.title;
  const selectedIngredientCount = selectedRecipe?.ingredients?.length ?? 0;
  const selectedInstructionCount = selectedRecipe?.instructions?.length ?? 0;
  useEffect(() => {
    if (!selectedId || selectedStatus !== "draft") return;
    const hasRealTitle =
      !!selectedTitle &&
      selectedTitle.trim() !== "" &&
      selectedTitle !== "Untitled recipe";
    const hasContent = selectedIngredientCount > 0 || selectedInstructionCount > 0;
    if (!hasRealTitle && !hasContent) return;

    // Fire-and-forget PATCH. If it fails, the draft just stays a draft —
    // the effect re-fires when the user edits again.
    fetch(`/api/recipes/${selectedId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "active" }),
    })
      .then((res) => {
        if (!res.ok) return;
        qc.invalidateQueries({ queryKey: ["recipes"] });
        qc.invalidateQueries({ queryKey: ["recipe", selectedId] });
        addToast("Draft saved as recipe", "success");
      })
      .catch(() => {
        /* silent */
      });
  }, [
    selectedId,
    selectedStatus,
    selectedTitle,
    selectedIngredientCount,
    selectedInstructionCount,
    qc,
    addToast,
  ]);

  const handleBlur = useCallback(
    async (field: "title" | "description" | "cuisine" | "prepTime" | "cookTime" | "yield", nextValue?: string) => {
      if (!selectedRecipe) return;

      const setters = {
        title: setSavingTitle,
        description: setSavingDescription,
        cuisine: setSavingCuisine,
        prepTime: setSavingPrepTime,
        cookTime: setSavingCookTime,
        yield: setSavingYield,
      };
      const values = { title, description, cuisine, prepTime, cookTime, yield: recipeYield };
      if (nextValue !== undefined) values[field] = nextValue;
      const originals = {
        title: selectedRecipe.title,
        description: selectedRecipe.description ?? "",
        cuisine: selectedRecipe.cuisine ?? "",
        prepTime: selectedRecipe.prepTime?.toString() ?? "",
        cookTime: selectedRecipe.cookTime?.toString() ?? "",
        yield: selectedRecipe.yield ?? "",
      };

      if (values[field] === originals[field]) return;

      setters[field](true);
      try {
        let updateValue: string | number | null = values[field] || null;
        if (field === "title" && !values[field].trim()) {
          updateValue = "Untitled recipe";
          setTitle("Untitled recipe");
        }
        
        // Convert time fields to numbers
        if (field === "prepTime" || field === "cookTime") {
          updateValue = values[field] ? parseInt(values[field], 10) : null;
        }

        await updateRecipe(selectedRecipe.id, {
          [field]: updateValue,
        } as Partial<Recipe>);
      } catch {
        addToast(`Failed to save ${field}`, "error");
      } finally {
        setters[field](false);
      }
    },
    [selectedRecipe, title, description, cuisine, prepTime, cookTime, recipeYield, updateRecipe, addToast]
  );

  const handleStorySave = useCallback(
    async (story: string) => {
      if (!selectedRecipe) return;
      await updateRecipe(selectedRecipe.id, { story: story || null });
    },
    [selectedRecipe, updateRecipe]
  );

  const handleCulturalSave = useCallback(
    async (field: string, value: string) => {
      if (!selectedRecipe) return;
      await updateRecipe(selectedRecipe.id, { [field]: value || null });
    },
    [selectedRecipe, updateRecipe]
  );

  const handleRatingSave = useCallback(
    async (field: "authenticityRating" | "tasteRating" | "nostalgiaRating", value: number | null) => {
      if (!selectedRecipe) return;
      await updateRecipe(selectedRecipe.id, { [field]: value });
    },
    [selectedRecipe, updateRecipe]
  );

  const handleVoiceSave = useCallback(
    async (blob: Blob, duration: number) => {
      if (!selectedRecipe) return;
      const formData = new FormData();
      formData.append("file", blob, `recording-${Date.now()}.webm`);
      formData.append("duration", String(duration));
      try {
        await fetch(`/api/recipes/${selectedRecipe.id}/voice`, {
          method: "POST",
          body: formData,
        });
        addToast("Voice recording saved", "success");
        // Refresh recipe data
        qc.invalidateQueries({ queryKey: ["recipe", selectedRecipe.id] });
      } catch {
        addToast("Failed to save recording", "error");
      }
    },
    [selectedRecipe, addToast, qc]
  );

  const handleVoiceDelete = useCallback(
    async (id: string) => {
      if (!selectedRecipe) return;
      await fetch(`/api/recipes/${selectedRecipe.id}/voice/${id}`, {
        method: "DELETE",
      });
      qc.invalidateQueries({ queryKey: ["recipe", selectedRecipe.id] });
    },
    [selectedRecipe, qc]
  );

  const handlePhotoUpload = useCallback(
    async (file: File) => {
      if (!selectedRecipe) return;
      const recipeId = selectedRecipe.id;
      const formData = new FormData();
      formData.append("file", file);
      try {
        const response = await fetch(`/api/recipes/${recipeId}/photos`, {
          method: "POST",
          body: formData,
        });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(body.error || "Failed to upload photo");
        }
        qc.setQueryData<import("@/store/RecipeStore").RecipeWithRelations | null>(
          ["recipe", recipeId],
          (current) => {
            if (!current) return current;
            const nextPhotos = [...(current.photos ?? []), body];
            return {
              ...current,
              imageUrl: current.imageUrl || body.blobUrl,
              photos: nextPhotos,
            };
          }
        );
        await Promise.all([
          qc.invalidateQueries({ queryKey: ["recipe", recipeId] }),
          qc.invalidateQueries({ queryKey: ["recipes"] }),
        ]);
        addToast("Photo uploaded", "success");
      } catch (err) {
        addToast(err instanceof Error ? err.message : "Failed to upload photo", "error");
      }
    },
    [selectedRecipe, addToast, qc]
  );

  const handlePhotoRemove = useCallback(
    async (photoId: string) => {
      if (!selectedRecipe) return;
      await fetch(`/api/recipes/${selectedRecipe.id}/photos/${photoId}`, {
        method: "DELETE",
      });
      qc.invalidateQueries({ queryKey: ["recipe", selectedRecipe.id] });
    },
    [selectedRecipe, qc]
  );

  const handleDelete = useCallback(async () => {
    if (!selectedRecipe) return;
    if (!confirm("Delete this recipe? This cannot be undone.")) return;
    await deleteRecipe(selectedRecipe.id);
    addToast("Recipe deleted", "success");
  }, [selectedRecipe, deleteRecipe, addToast]);

  const handleBookChange = useCallback(
    async (bookId: number | null) => {
      if (!selectedRecipe) return;
      await updateRecipe(selectedRecipe.id, { bookId });
    },
    [selectedRecipe, updateRecipe]
  );

  // Modals — rendered outside early returns so they're always available
  const shareModalEl = showShareModal ? (
    <ShareModal
      resourceType={showShareModal.type}
      resourceId={showShareModal.id}
      resourceName={showShareModal.name}
      onClose={() => setShowShareModal(null)}
    />
  ) : null;

  const promoteNextTry = useCallback(async (setDefinitive: boolean) => {
    if (!selectedRecipe || !nextTry) return;
    setNextTryBusy(setDefinitive ? "definitive" : "promote");
    try {
      const response = await fetch("/api/recipes/" + selectedRecipe.id + "/next-try/promote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ setActive: setDefinitive }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Failed to promote next try");
      }
      setNextTry(null);
      setVersionTimelineKey((key) => key + 1);
      qc.invalidateQueries({ queryKey: ["recipe", selectedRecipe.id] });
      qc.invalidateQueries({ queryKey: ["recipes"] });
      addToast(setDefinitive ? "Next try promoted and set as definitive" : "Next try promoted to version", "success");
      promptVersionFeedback();
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Failed to promote next try", "error");
    } finally {
      setNextTryBusy(null);
    }
  }, [addToast, nextTry, promptVersionFeedback, qc, selectedRecipe]);

  const dismissNextTry = useCallback(async () => {
    if (!selectedRecipe || !nextTry) return;
    setNextTryBusy("dismiss");
    try {
      const response = await fetch("/api/recipes/" + selectedRecipe.id + "/next-try", { method: "DELETE" });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Failed to discard next try");
      }
      setNextTry(null);
      addToast("Next try discarded", "success");
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Failed to discard next try", "error");
    } finally {
      setNextTryBusy(null);
    }
  }, [addToast, nextTry, selectedRecipe]);

  const createBookModalEl = showCreateBookModal ? (
    <CreateBookModal
      onClose={() => setShowCreateBookModal(false)}
      onCreateBook={handleCreateBook}
    />
  ) : null;

  // Surprise-me-by modal — extracted as a variable so it renders in
  // BOTH the card-grid return and the recipe-detail return.
  const surpriseByModal = surpriseByOpen ? (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={() => setSurpriseByOpen(false)}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 flex items-center gap-2">
          <Target className="h-5 w-5 text-[#800020]" />
          <h3 className="text-base font-semibold text-neutral-900">
            Surprise me by…
          </h3>
        </div>
        <p className="mb-4 text-xs text-neutral-500">
          Narrow the random pick by an ingredient, cuisine, or keyword.
        </p>
        <input
          type="text"
          autoFocus
          value={surpriseByQuery}
          onChange={(e) => setSurpriseByQuery(e.target.value)}
          placeholder="Search by ingredient, cuisine, or keyword…"
          className="mb-4 w-full rounded-xl border border-neutral-300 bg-neutral-50 px-3 py-2.5 text-sm outline-none transition focus:border-[#800020]/45 focus:bg-white focus:ring-2 focus:ring-[#800020]/10 placeholder:text-neutral-400"
        />
        <div className="flex gap-2">
          <Button
            variant="soft"
            color="gray"
            onClick={() => setSurpriseByOpen(false)}
          >
            Cancel
          </Button>
          <Button
            className="flex-1 bg-[#17131f] hover:bg-[#800020] text-white"
            onClick={async () => {
              const q = surpriseByQuery.trim();
              if (!q) {
                if (recipes.length > 0) {
                  const r = recipes[Math.floor(Math.random() * recipes.length)];
                  selectRecipe(r.id);
                  setSurpriseByOpen(false);
                }
                return;
              }
              try {
                const res = await fetch(`/api/recipes/search?q=${encodeURIComponent(q)}`);
                if (!res.ok) throw new Error("Search failed");
                const data = (await res.json()) as { results: Array<{ recipe: { id: number } }> };
                const matches = data.results.map((r) => r.recipe);
                if (matches.length === 0) {
                  addToast(`No recipes match "${q}"`, "error");
                  return;
                }
                const pick = matches[Math.floor(Math.random() * matches.length)];
                selectRecipe(pick.id);
                setSurpriseByOpen(false);
              } catch {
                addToast("Search failed, try again", "error");
              }
            }}
          >
            <Shuffle className="h-4 w-4" />
            Pick one
          </Button>
        </div>
      </div>
    </div>
  ) : null;

  // Loading state
  if (loading && recipes.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center bg-surface">
        <LoadingAnimation />
        {createBookModalEl}
      {shareModalEl}
      </div>
    );
  }

  // No recipe selected — show card grid on desktop, welcome on mobile
  if (!selectedRecipe) {
    // Mobile: simple welcome
    if (recipes.length === 0) {
      return (
        <div className="flex flex-1 flex-col items-center justify-center bg-surface px-6 py-8 text-neutral-500">
          <div className="mx-auto max-w-md text-center">
            <img src="/icons/icon-welcome.png" alt="Mychelin" className="mb-6 h-24 w-24 mx-auto" />
            <h2 className="app-editorial-title text-4xl leading-none text-[#1A1A1A]">
              Welcome to Mychelin
            </h2>
            <p className="mt-3 text-sm leading-relaxed">
              Build a family cookbook you can actually cook from. Create a recipe to
              capture the dishes, stories, and traditions that matter.
            </p>
            <div className="pt-6">
              <Button onClick={onOpenSidebar} variant="solid" size="3">
                Get started
              </Button>
            </div>
          </div>
          {createBookModalEl}
      {shareModalEl}
        </div>
      );
    }

    return (
      <div className="flex-1 overflow-y-auto bg-surface pb-20 md:pb-6">
        <div className="mx-auto max-w-5xl px-5 py-6">
          {activeBookId ? (() => {
            const activeBook = books.find(b => b.id === activeBookId);
            return (
              <>
                {/* Book header */}
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <button
                      onClick={handleCloseBook}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-100"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="15 18 9 12 15 6" />
                      </svg>
                    </button>
                    <span className="text-2xl shrink-0">{activeBook?.coverEmoji ?? "📚"}</span>
                    <h2 className="app-editorial-title truncate text-4xl leading-none text-[#1A1A1A]">
                      {activeBook?.title ?? "Book"}
                    </h2>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-neutral-500">
                      {activeBookRecipes.length} recipe{activeBookRecipes.length !== 1 ? "s" : ""}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="solid"
                        size="2"
                        onClick={async () => {
                          try {
                            const res = await fetch("/api/recipes", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ title: "Untitled Recipe", bookId: activeBookId }),
                            });
                            if (res.ok) {
                              const newRecipe = await res.json();
                              qc.invalidateQueries({ queryKey: ["recipes"] });
                              selectRecipe(newRecipe.id);
                            }
                          } catch {}
                        }}
                      >
                        + New
                      </Button>
                      {activeBook && (
                        <button
                          onClick={() => setShowShareModal({ type: "book", id: activeBook.id, name: activeBook.title })}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-[#800020]"
                          title="Share book"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="18" cy="5" r="3" />
                            <circle cx="6" cy="12" r="3" />
                            <circle cx="18" cy="19" r="3" />
                            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Book's recipes as cards */}
                {loadingBookRecipes ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#800020] border-t-transparent" />
                  </div>
                ) : activeBookRecipes.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-neutral-400">
                    <span className="mb-3 text-4xl">📖</span>
                    <p className="text-sm">No recipes in this book yet</p>
                    <p className="mt-1 text-xs">Assign recipes to this book from the recipe view</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {activeBookRecipes.map((recipe) => (
                      <article
                        key={recipe.id}
                        className="group flex flex-col rounded-2xl border border-[#800020]/10 bg-white/80 p-0 text-left shadow-[0_14px_42px_rgba(60,43,25,0.08)] ring-1 ring-white/70 backdrop-blur transition-all hover:-translate-y-0.5 hover:border-[#800020]/25 hover:shadow-[0_22px_55px_rgba(60,43,25,0.14)]"
                      >
                        <button
                          type="button"
                          onClick={() => selectRecipe(recipe.id)}
                          className="flex flex-1 flex-col text-left"
                        >
                          <div className="flex h-36 items-center justify-center rounded-t-2xl bg-gradient-to-br from-[#800020]/10 via-[#f6f2eb] to-white">
                            {recipe.imageUrl ? (
                              <img src={recipe.imageUrl} alt={recipe.title} className="h-full w-full rounded-t-2xl object-cover" />
                            ) : (
                              <ChefHat className="h-10 w-10 text-[#800020]/45" />
                            )}
                          </div>
                          <div className="flex flex-1 flex-col p-4 pb-3">
                            <h3 className="font-semibold text-neutral-800 group-hover:text-[#521224]">{recipe.title}</h3>
                            {recipe.cuisine && (
                              <span className="mt-1 w-fit rounded-full bg-[#800020]/5 px-2 py-0.5 text-xs font-medium text-[#800020]">{recipe.cuisine}</span>
                            )}
                          </div>
                        </button>
                        {onCookRecipe && (
                          <div className="px-4 pb-4">
                            <button
                              type="button"
                              onClick={() => onCookRecipe(recipe.id)}
                              className="flex min-h-10 w-full items-center justify-center gap-2 rounded-full bg-[#17131f] px-4 text-sm font-semibold text-white transition hover:bg-[#800020]"
                            >
                              <ChefHat className="h-4 w-4" />
                              Cook with me
                            </button>
                          </div>
                        )}
                      </article>
                    ))}
                  </div>
                )}

                {/* Cooking principles — tips and guiding rules for this
                    book. The server scopes to book membership, so any
                    user who can see this book can read the tips; only
                    members with edit rights can add them. */}
                {activeBookId != null && (
                  <div className="mt-10 rounded-2xl border border-[#800020]/10 bg-white/80 p-5 shadow-[0_14px_42px_rgba(60,43,25,0.08)] ring-1 ring-white/70">
                    <CookingPrinciples
                      bookId={activeBookId}
                      canEdit={true}
                      isOwner={true}
                    />
                  </div>
                )}
              </>
            );
          })() : (
            <>
              {/* Header */}
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="app-editorial-title text-4xl leading-none text-[#1A1A1A]">
                    Your Recipes
                  </h2>
                  <p className="mt-1 text-sm text-neutral-500">
                    {recipes.length} recipe{recipes.length !== 1 ? "s" : ""} in your collection
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {recipes.length > 0 && (
                    <DropdownMenu.Root>
                      <DropdownMenu.Trigger>
                        <Button variant="soft"  size="2">
                          <Shuffle className="h-4 w-4" />
                          Surprise me
                        </Button>
                      </DropdownMenu.Trigger>
                      <DropdownMenu.Content>
                        <DropdownMenu.Item
                          onClick={() => {
                            const random = recipes[Math.floor(Math.random() * recipes.length)];
                            selectRecipe(random.id);
                          }}
                        >
                          <Shuffle className="h-4 w-4" />
                          Just surprise me
                        </DropdownMenu.Item>
                        <DropdownMenu.Item
                          onClick={() => {
                            setSurpriseByQuery("");
                            setSurpriseByOpen(true);
                          }}
                        >
                          <Target className="h-4 w-4" />
                          Surprise me by…
                        </DropdownMenu.Item>
                      </DropdownMenu.Content>
                    </DropdownMenu.Root>
                  )}
                  <Button
                    variant="solid"
                    size="2"
                    onClick={() => {
                      onOpenSidebar();
                      window.dispatchEvent(new CustomEvent("mychelin:create-recipe"));
                    }}
                    className="md:hidden"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    New
                  </Button>
                </div>
              </div>

              {/* Book folders */}
              {books.length > 0 && (
                <div className="mb-6">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="flex items-center gap-1.5 text-sm font-semibold uppercase tracking-[0.18em] text-[#6b6b6b]">
                      <BookOpen className="h-4 w-4 text-[#800020]" />
                      Books
                    </h3>
                    <button
                      onClick={() => window.dispatchEvent(new CustomEvent("mychelin:create-book"))}
                      className="text-xs font-medium text-[#800020] hover:text-[#800020]"
                    >
                      + Create Book
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    {books.map((book) => {
                      const bgMap: Record<string, string> = {
                        amber: "from-[#800020]/5 to-[#800020]/10",
                        rose: "from-[#800020]/10 to-[#f6f2eb]",
                        emerald: "from-[#800020]/10 to-[#f6f2eb]",
                        sky: "from-[#800020]/10 to-[#f6f2eb]",
                        violet: "from-[#800020]/10 to-[#f6f2eb]",
                        slate: "from-[#800020]/10 to-[#f6f2eb]",
                      };
                      const bgClass = bgMap[book.coverColor] || "from-[#800020]/5 to-[#800020]/10";
                      return (
                        <div
                          key={book.id}
                          className="group relative flex flex-col items-center gap-2 rounded-2xl border border-[#800020]/10 bg-gradient-to-br p-4 shadow-[0_12px_32px_rgba(60,43,25,0.07)] ring-1 ring-white/70 text-center transition-all hover:border-[#800020]/30 hover:shadow-md cursor-pointer"
                          style={{ backgroundImage: `linear-gradient(to bottom right, var(--tw-gradient-stops))` }}
                          onClick={() => handleOpenBook(book.id)}
                        >

                          <div className={`flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br ${bgClass} text-2xl`}>
                            {book.coverEmoji}
                          </div>
                          <span className="text-sm font-semibold text-neutral-800 group-hover:text-[#521224] truncate w-full">
                            {book.title}
                          </span>
                          <span className="text-[10px] text-neutral-400">
                            {book.recipeCount} recipe{book.recipeCount !== 1 ? "s" : ""}
                          </span>
                        </div>
                      );
                    })}
                    {/* Create book card */}
                    <button
                      onClick={() => window.dispatchEvent(new CustomEvent("mychelin:create-book"))}
                      className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#800020]/15 bg-white/50 p-4 text-center transition-all hover:border-[#800020]/30 hover:bg-[#800020]/5"
                    >
                      <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#800020]/5 text-2xl text-[#800020]/45">
                        +
                      </div>
                      <span className="text-sm font-medium text-neutral-400">New Book</span>
                    </button>
                  </div>
                </div>
              )}

              {/* All recipes card grid */}
              <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold uppercase tracking-[0.18em] text-[#6b6b6b]">
                <ChefHat className="h-4 w-4 text-[#800020]" />
                All Recipes
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {recipes.map((recipe) => (
                  <article
                    key={recipe.id}
                    className="group flex flex-col rounded-2xl border border-[#800020]/10 bg-white/80 p-0 text-left shadow-[0_14px_42px_rgba(60,43,25,0.08)] ring-1 ring-white/70 backdrop-blur transition-all hover:-translate-y-0.5 hover:border-[#800020]/25 hover:shadow-[0_22px_55px_rgba(60,43,25,0.14)]"
                  >
                    <button
                      type="button"
                      onClick={() => selectRecipe(recipe.id)}
                      className="flex flex-1 flex-col text-left"
                    >
                      <div className="flex h-36 items-center justify-center rounded-t-2xl bg-gradient-to-br from-[#800020]/10 via-[#f6f2eb] to-white">
                        {recipe.imageUrl ? (
                          <img src={recipe.imageUrl} alt={recipe.title} className="h-full w-full rounded-t-2xl object-cover" />
                        ) : (
                          <ChefHat className="h-10 w-10 text-[#800020]/45" />
                        )}
                      </div>
                      <div className="flex flex-1 flex-col p-4 pb-3">
                        <h3 className="font-semibold text-neutral-800 group-hover:text-[#521224]">{recipe.title}</h3>
                        {recipe.cuisine && (
                          <span className="mt-1 w-fit rounded-full bg-[#800020]/5 px-2 py-0.5 text-xs font-medium text-[#800020]">{recipe.cuisine}</span>
                        )}
                        {recipe.description && (
                          <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-neutral-500">{recipe.description}</p>
                        )}
                        {(recipe.prepTime || recipe.cookTime) && (
                          <div className="mt-auto flex gap-3 pt-3 text-[11px] text-neutral-400">
                            {recipe.prepTime && <span className="inline-flex items-center gap-1"><Clock3 className="h-3 w-3" />{recipe.prepTime}m prep</span>}
                            {recipe.cookTime && <span className="inline-flex items-center gap-1"><Utensils className="h-3 w-3" />{recipe.cookTime}m cook</span>}
                          </div>
                        )}
                      </div>
                    </button>
                    {onCookRecipe && recipe.status !== "draft" && (
                      <div className="px-4 pb-4">
                        <button
                          type="button"
                          onClick={() => onCookRecipe(recipe.id)}
                          className="flex min-h-10 w-full items-center justify-center gap-2 rounded-full bg-[#17131f] px-4 text-sm font-semibold text-white transition hover:bg-[#800020]"
                        >
                          <ChefHat className="h-4 w-4" />
                          Cook with me
                        </button>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            </>
          )}
        </div>
        {createBookModalEl}
      {shareModalEl}
      {surpriseByModal}
      </div>
    );
  }

  const anyFieldSaving =
    savingTitle ||
    savingDescription ||
    savingCuisine ||
    savingPrepTime ||
    savingCookTime ||
    savingYield;

  // Progressive disclosure — badges show how many fields in each collapsed
  // tier have content. Helps users see at a glance that there's data tucked
  // away without having to open the section.
  //
  // Library info (6 fields): summary, cuisine/style, prep time, cook time, yield, book
  const detailsFilled = [
    selectedRecipe.description,
    selectedRecipe.cuisine,
    selectedRecipe.prepTime,
    selectedRecipe.cookTime,
    selectedRecipe.yield,
    selectedRecipe.bookId,
  ].filter((v) => v !== null && v !== undefined && v !== "").length;

  // Heritage (9 fields): story, origin, spoken language, occasion, family source,
  // generation, authenticityRating, tasteRating, nostalgiaRating
  const heritageFilled = [
    selectedRecipe.story,
    selectedRecipe.origin,
    selectedRecipe.dialect,
    selectedRecipe.occasion,
    selectedRecipe.familyMember,
    selectedRecipe.generation,
    selectedRecipe.authenticityRating,
    selectedRecipe.tasteRating,
    selectedRecipe.nostalgiaRating,
  ].filter((v) => v !== null && v !== undefined && v !== "").length;

  const handleSaveNow = async () => {
    // Blur whatever is currently focused, then explicitly flush every
    // editable detail field. This catches controls such as comboboxes where
    // selection does not behave like a plain input blur.
    const active = document.activeElement as HTMLElement | null;
    if (active && typeof active.blur === "function") active.blur();

    await Promise.all([
      handleBlur("title"),
      handleBlur("description"),
      handleBlur("cuisine"),
      handleBlur("prepTime"),
      handleBlur("cookTime"),
      handleBlur("yield"),
    ]);
    addToast("Changes saved", "success");
  };

  const handleSaveAndLock = async () => {
    await handleSaveNow();
    setRecipeEditMode(false);
  };


  return (
    <div className="relative flex-1 overflow-y-auto bg-surface">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-5 py-4 md:gap-8 md:py-6">
        <RecipeSaveStatus
          isSaving={anyFieldSaving}
          updatedAt={selectedRecipe.updatedAt}
          onSaveNow={handleSaveNow}
        />

        <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#800020]/10 bg-white px-4 py-3 shadow-sm">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-500">
              {recipeEditMode ? "Editing recipe" : "Reading mode"}
            </p>
            <p className="mt-0.5 text-sm font-medium text-neutral-800">
              {recipeEditMode ? "Recipe fields are unlocked" : "Recipe fields are locked"}
            </p>
          </div>
          {recipeEditMode ? (
            <button
              type="button"
              onClick={handleSaveAndLock}
              className="inline-flex min-h-10 items-center gap-2 rounded-full bg-[#17131f] px-4 text-sm font-semibold text-white transition hover:bg-[#800020]"
            >
              <Check className="h-4 w-4" />
              Save and lock
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setRecipeEditMode(true)}
              className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[#800020]/20 bg-white px-4 text-sm font-semibold text-[#800020] transition hover:bg-[#800020]/5"
            >
              <PencilLine className="h-4 w-4" />
              Edit recipe
            </button>
          )}
        </section>

        {/* ─── Core tier — always visible ──────────────── */}

        {/* Title — first so it's always reachable on mobile
            even with the keyboard raised */}
        <RecipeTitleCard
          recipe={selectedRecipe}
          title={title}
          onTitleChange={setTitle}
          onBlur={() => handleBlur("title")}
          isSaving={savingTitle}
          autoFocusTitle={
            !!selectedRecipe && selectedRecipe.id === justCreatedRecipeId
          }
          readOnly={!recipeEditMode}
        />

        {nextTry && (
          <NextTryPanel
            nextTry={nextTry}
            busy={nextTryBusy}
            onPromote={() => promoteNextTry(false)}
            onSetDefinitive={() => promoteNextTry(true)}
            onDismiss={dismissNextTry}
          />
        )}

        {/* Empty-state CTAs — fast ways to populate a fresh recipe.
            Compact pill-buttons on mobile so they don't eat half
            the viewport when the keyboard is up. Hidden once the
            recipe has ingredients or instructions. */}
        {(selectedRecipe.ingredients?.length ?? 0) === 0 &&
          (selectedRecipe.instructions?.length ?? 0) === 0 && (
            <div className="flex flex-col gap-2 sm:grid sm:grid-cols-3 sm:gap-3">
              {/* Capture from conversation */}
              <button
                onClick={() => setShowCaptureModal(true)}
                className="group flex w-full items-center gap-3 rounded-xl border border-[#800020]/15 bg-gradient-to-br from-[#800020]/5 to-white px-3 py-2.5 text-left shadow-sm transition-all hover:border-[#800020]/30 hover:shadow-md sm:flex-col sm:items-start sm:gap-3 sm:rounded-2xl sm:p-4"
              >
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[#800020]/10 text-[#800020] transition-transform group-hover:scale-110 sm:h-10 sm:w-10 sm:rounded-xl">
                  <Mic2 className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                <div className="flex flex-1 items-center gap-2 min-w-0 sm:flex-col sm:items-start sm:gap-0">
                  <h3 className="text-sm font-semibold text-[#241017]">
                    Live conversation capture
                  </h3>
                  <span className="rounded-full bg-[#800020]/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[#521224]">
                    AI
                  </span>
                  <p className="mt-0.5 hidden text-xs text-neutral-600 leading-relaxed sm:block">
                    Talk with a parent or grandparent while Mychelin translates the gist and suggests follow-up questions.
                  </p>
                </div>
              </button>

              {/* Import from URL */}
              <button
                onClick={() => {
                  setPasteMode("url");
                  setShowPasteModal(true);
                }}
                className="group flex w-full items-center gap-3 rounded-xl border border-[#800020]/15 bg-gradient-to-br from-[#800020]/5 to-white px-3 py-2.5 text-left shadow-sm transition-all hover:border-[#800020]/30 hover:shadow-md sm:flex-col sm:items-start sm:gap-3 sm:rounded-2xl sm:p-4"
              >
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[#800020]/10 text-[#800020] transition-transform group-hover:scale-110 sm:h-10 sm:w-10 sm:rounded-xl">
                  <Link2 className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                <div className="flex flex-1 items-center gap-2 min-w-0 sm:flex-col sm:items-start sm:gap-0">
                  <h3 className="text-sm font-semibold text-[#241017]">
                    Import from URL
                  </h3>
                  <span className="rounded-full bg-[#800020]/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[#521224]">
                    AI
                  </span>
                  <p className="mt-0.5 hidden text-xs text-neutral-600 leading-relaxed sm:block">
                    Paste a recipe page link and we&apos;ll pull out the ingredients and steps.
                  </p>
                </div>
              </button>

              {/* Paste from anywhere */}
              <button
                onClick={() => {
                  setPasteMode("paste");
                  setShowPasteModal(true);
                }}
                className="group flex w-full items-center gap-3 rounded-xl border border-[#800020]/15 bg-gradient-to-br from-[#800020]/5 to-white px-3 py-2.5 text-left shadow-sm transition-all hover:border-[#800020]/30 hover:shadow-md sm:flex-col sm:items-start sm:gap-3 sm:rounded-2xl sm:p-4"
              >
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[#800020]/10 text-[#800020] transition-transform group-hover:scale-110 sm:h-10 sm:w-10 sm:rounded-xl">
                  <ClipboardPaste className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                <div className="flex flex-1 items-center gap-2 min-w-0 sm:flex-col sm:items-start sm:gap-0">
                  <h3 className="text-sm font-semibold text-[#241017]">
                    Paste text
                  </h3>
                  <span className="rounded-full bg-[#800020]/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[#521224]">
                    AI
                  </span>
                  <p className="mt-0.5 hidden text-xs text-neutral-600 leading-relaxed sm:block">
                    Use notes from a message, cookbook OCR, or a family call.
                  </p>
                </div>
              </button>
            </div>
          )}

        {/* Forked from badge */}
        {selectedRecipe.forkedFrom && (
          <ForkedFromBadge
            forkedFrom={selectedRecipe.forkedFrom}
            onNavigate={(id) => selectRecipe(id)}
          />
        )}

        {/* Source URL attribution */}
        {selectedRecipe.sourceUrl && (
          <div className="flex items-center gap-1.5 rounded-lg border border-[#800020]/15 bg-[#800020]/5 px-3 py-2 text-sm text-[#521224]">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
            <span>Imported from{" "}</span>
            <a
              href={selectedRecipe.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium underline underline-offset-2 hover:text-[#241017]"
            >
              {(() => { try { return new URL(selectedRecipe.sourceUrl).hostname.replace(/^www\./, ""); } catch { return selectedRecipe.sourceUrl; } })()}
            </a>
          </div>
        )}

        {/* Photos */}
        <PhotoUploadSection
          photos={(selectedRecipe.photos ?? []).map((p) => ({
            id: String(p.id),
            url: p.blobUrl,
            sortOrder: p.sortOrder ?? 0,
          }))}
          coverUrl={selectedRecipe.imageUrl}
          onUpload={handlePhotoUpload}
          onRemove={handlePhotoRemove}
          readOnly={!recipeEditMode}
          onSetCover={async (photoUrl) => {
            if (!selectedRecipe) return;
            const response = await fetch(`/api/recipes/${selectedRecipe.id}/photos`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ photoUrl }),
            });
            const body = await response.json().catch(() => ({}));
            if (!response.ok) {
              addToast(body.error || "Failed to update cover photo", "error");
              return;
            }
            qc.setQueryData<import("@/store/RecipeStore").RecipeWithRelations | null>(
              ["recipe", selectedRecipe.id],
              (current) => current ? { ...current, imageUrl: photoUrl } : current
            );
            qc.invalidateQueries({ queryKey: ["recipe", selectedRecipe.id] });
            qc.invalidateQueries({ queryKey: ["recipes"] });
            addToast("Cover photo updated", "success");
          }}
        />

        {/* Serving Scaler */}
        <ServingScaler
          baseYield={selectedRecipe.yield ?? ""}
          onScaleChange={setIngredientScale}
        />

        {/* Ingredients */}
        <IngredientList
          ingredients={selectedRecipe.ingredients ?? []}
          recipeId={selectedRecipe.id}
          onAdd={addIngredient}
          onUpdate={updateIngredient}
          onDelete={deleteIngredient}
          scale={ingredientScale}
          readOnly={!recipeEditMode}
        />

        {/* Steps */}
        <RecipeSteps
          instructions={selectedRecipe.instructions ?? []}
          recipeId={selectedRecipe.id}
          onAdd={addInstruction}
          onUpdate={updateInstruction}
          onDelete={deleteInstruction}
          ingredients={selectedRecipe.ingredients ?? []}
          readOnly={!recipeEditMode}
        />

        {/* ─── Library info tier — collapsed by default ───── */}
        <CollapsibleSection
          title="Library info"
          subtitle="Short summary, dish style, timing, yield, book"
          badge={`${detailsFilled}/6`}
        >
          <div className="grid gap-4">
            <RecipeDetailsCard
              description={description}
              onDescriptionChange={setDescription}
              cuisine={cuisine}
              onCuisineChange={setCuisine}
              prepTime={prepTime}
              onPrepTimeChange={setPrepTime}
              cookTime={cookTime}
              onCookTimeChange={setCookTime}
              recipeYield={recipeYield}
              onYieldChange={setRecipeYield}
              onBlur={handleBlur}
              savingDescription={savingDescription}
              savingCuisine={savingCuisine}
              savingPrepTime={savingPrepTime}
              savingCookTime={savingCookTime}
              savingYield={savingYield}
            />
            <BookSelector
              currentBookId={selectedRecipe.bookId ?? null}
              onSave={handleBookChange}
            />
          </div>
        </CollapsibleSection>

        {/* ─── Heritage & Family tier — collapsed by default ── */}
        <CollapsibleSection
          title="Heritage & Family"
          subtitle="Family story, source, language, voice, ratings"
          badge={`${heritageFilled}/9`}
        >
          <div className="grid gap-4">
            <StorySection
              story={selectedRecipe.story ?? ""}
              onSave={handleStorySave}
            />

            <CulturalContextCard
              origin={selectedRecipe.origin ?? ""}
              dialect={selectedRecipe.dialect ?? ""}
              occasion={selectedRecipe.occasion ?? ""}
              familyMember={selectedRecipe.familyMember ?? ""}
              generation={selectedRecipe.generation ?? ""}
              onSave={handleCulturalSave}
            />

            <VoiceRecording
              recordings={(selectedRecipe.voiceRecordings ?? []).map((v) => ({
                id: String(v.id),
                url: v.blobUrl,
                duration: v.duration,
                label: v.label ?? undefined,
                createdAt: v.createdAt,
              }))}
              onSaveRecording={handleVoiceSave}
              onDeleteRecording={handleVoiceDelete}
            />

            <RatingSection
              authenticityRating={selectedRecipe.authenticityRating ?? null}
              tasteRating={selectedRecipe.tasteRating ?? null}
              nostalgiaRating={selectedRecipe.nostalgiaRating ?? null}
              onSave={handleRatingSave}
            />
          </div>
        </CollapsibleSection>

        {/* Version History */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              Versions & Refinement
            </h2>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                onClick={() => setShowCookWithMe(true)}
                className="flex items-center gap-1 rounded-xl bg-[#17131f] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#800020]"
              >
                <ChefHat className="h-3.5 w-3.5" />
                Cook with me
              </button>
              <button
                onClick={() => setShowCookAlong(true)}
                className="flex items-center gap-1 rounded-xl bg-[#800020]/10 px-3 py-1.5 text-xs font-medium text-[#800020] transition-colors hover:bg-[#800020]/15"
              >
                <PencilLine className="h-3.5 w-3.5" />
                Log cook
              </button>
            </div>
          </div>

          <AttemptHistory
            recipeId={selectedRecipe.id}
            refreshKey={versionTimelineKey}
            onNextTrySaved={() => {
              void loadNextTry();
              addToast("Next try saved", "success");
            }}
            onPromoted={() => {
              setVersionTimelineKey((k) => k + 1);
              qc.invalidateQueries({ queryKey: ["recipe", selectedRecipe.id] });
              qc.invalidateQueries({ queryKey: ["recipes"] });
              addToast("Attempt promoted to version", "success");
              promptVersionFeedback();
            }}
          />

          <VersionTimeline
            key={versionTimelineKey}
            recipeId={selectedRecipe.id}
            onCompare={(baseId, compareId) =>
              setCompareVersions({ base: baseId, compare: compareId })
            }
            onVersionSelect={(version) => setViewingVersion(version)}
          />
        </div>

        {/* Share + Delete */}
        <div className="border-t border-neutral-200 pt-6 pb-20 md:pb-6 space-y-3">
          {/* Fork button — shown when current user is not the owner */}
          {user && selectedRecipe.userId !== user.id && (
            <RecipeForkButton
              recipeId={selectedRecipe.id}
              recipeTitle={selectedRecipe.title}
              onForked={(id) => {
                qc.invalidateQueries({ queryKey: ["recipes"] });
                selectRecipe(id);
              }}
            />
          )}
          <button
            onClick={() => setShowShareModal({ type: "recipe", id: selectedRecipe.id, name: selectedRecipe.title })}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm font-medium text-neutral-700 transition-colors hover:border-[#800020]/30 hover:bg-[#800020]/5"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="18" cy="5" r="3" />
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="19" r="3" />
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
            </svg>
            Share Recipe
          </button>
          <button
            onClick={handleDelete}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600 transition-colors hover:bg-red-100"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
            Delete Recipe
          </button>
        </div>
      </div>

      {/* Add to Book Modal */}
      {showAddToBookModal && selectedRecipe && (
        <AddToBookModal
          recipeId={selectedRecipe.id}
          recipeName={selectedRecipe.title}
          onClose={() => setShowAddToBookModal(false)}
        />
      )}

      {createBookModalEl}
      {shareModalEl}

      {/* Version modals */}
      {showCookWithMe && selectedRecipe && (
        <CookWithMeSession
          recipe={selectedRecipe}
          onClose={() => setShowCookWithMe(false)}
          onComplete={() => {
            setVersionTimelineKey((k) => k + 1);
            qc.invalidateQueries({ queryKey: ["recipe", selectedRecipe.id] });
            addToast("Cooking attempt saved", "success");
          }}
        />
      )}

      {showCookAlong && selectedRecipe && (
        <CookAlongCapture
          recipeId={selectedRecipe.id}
          onClose={() => setShowCookAlong(false)}
          onComplete={(mode) => {
            setVersionTimelineKey((k) => k + 1);
            qc.invalidateQueries({ queryKey: ["recipe", selectedRecipe.id] });
            qc.invalidateQueries({ queryKey: ["recipes"] });
            addToast(mode === "attempt_only" ? "Attempt saved" : "Attempt and version saved", "success");
            if (mode === "attempt_and_version") promptVersionFeedback();
          }}
        />
      )}

      {compareVersions && selectedRecipe && (
        <VersionCompare
          recipeId={selectedRecipe.id}
          baseVersionId={compareVersions.base}
          compareVersionId={compareVersions.compare}
          onClose={() => setCompareVersions(null)}
        />
      )}

      {refinementVersion && selectedRecipe && (
        <RefinementPanel
          recipeId={selectedRecipe.id}
          recipeTitle={selectedRecipe.title}
          version={refinementVersion}
          onClose={() => setRefinementVersion(null)}
          onComplete={() => setVersionTimelineKey((k) => k + 1)}
        />
      )}

      {viewingVersion && (
        <VersionDetailsModal
          version={viewingVersion}
          onClose={() => setViewingVersion(null)}
          onRefine={() => {
            setRefinementVersion(viewingVersion);
            setViewingVersion(null);
          }}
        />
      )}

      {/* Live conversation modal — opened from the empty-state CTA above.
          Uses OpenAI/browser live captions with chunked fallback, surfaces
          live assistance, then PATCHes this recipe after speaker review. */}
      {showCaptureModal && selectedRecipe && (
        <ConversationCapture
          recipeId={selectedRecipe.id}
          onClose={() => setShowCaptureModal(false)}
          onRecipeUpdated={() => {
            qc.invalidateQueries({ queryKey: ["recipe", selectedRecipe.id] });
            qc.invalidateQueries({ queryKey: ["recipes"] });
            addToast("Recipe updated from conversation!", "success");
          }}
        />
      )}

      {/* Paste-recipe modal — paste text from anywhere, AI extracts
          and PATCHes the current recipe. */}
      {showPasteModal && selectedRecipe && (
        <PasteRecipeModal
          recipeId={selectedRecipe.id}
          onClose={() => setShowPasteModal(false)}
          initialMode={pasteMode}
          onRecipeUpdated={() => {
            qc.invalidateQueries({ queryKey: ["recipe", selectedRecipe.id] });
            qc.invalidateQueries({ queryKey: ["recipes"] });
            addToast(pasteMode === "url" ? "Recipe imported from URL!" : "Recipe extracted from pasted text!", "success");
          }}
        />
      )}

      {showVersionFeedback && (
        <PilotFeedbackPrompt
          stage="first_version"
          source="recipe_attempt_promotion"
          onClose={() => setShowVersionFeedback(false)}
        />
      )}

      {surpriseByModal}
    </div>
  );
}
