"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, DropdownMenu } from "@radix-ui/themes";
import { ArrowLeft, ChefHat, Check, ChevronRight, Flag, Link2, Mic2, PencilLine, Plus, Shuffle, Target } from "lucide-react";
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
import { EmptyState, FilterBar, PageHeader, SectionHeader } from "@/components/ui";

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
import { ManualRecipeScratchpadModal, type ManualRecipeDraft } from "@/components/capture/ManualRecipeScratchpadModal";
import { CookingPrinciples } from "@/components/books/CookingPrinciples";
import { PilotFeedbackPrompt } from "@/components/pilot/PilotFeedbackPrompt";
import type { Recipe } from "@/db/schema";
import { RECIPE_FLAG_OPTIONS, recipeFlagShortLabel, type RecipeFlag } from "@/lib/recipe-flags";

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

type RecipeCard = Pick<
  Recipe,
  | "id"
  | "title"
  | "description"
  | "imageUrl"
  | "cuisine"
  | "prepTime"
  | "cookTime"
  | "bookId"
  | "status"
  | "createdAt"
  | "updatedAt"
> & {
  recipeFlags?: RecipeFlag[];
  ingredientNames?: string[];
  lastCookedAt?: string | null;
};

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

const recipeFlagClass: Record<RecipeFlag, string> = {
  newly_added: "border-[#d7c7ad] bg-[#fff8ea] text-[#6f4a12]",
  try_soon: "border-[#800020]/20 bg-[#800020]/10 text-[#800020]",
};

function RecipeFlagBadges({ flags }: { flags?: RecipeFlag[] }) {
  if (!flags || flags.length === 0) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {flags.map((flag) => (
        <span
          key={flag}
          className={"inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold " + recipeFlagClass[flag]}
        >
          <Flag className="h-3 w-3" />
          {recipeFlagShortLabel(flag)}
        </span>
      ))}
    </div>
  );
}

function formatLastCookedLabel(value?: string | null): string {
  if (!value) return "Not cooked yet";
  const cookedAt = new Date(value);
  if (Number.isNaN(cookedAt.getTime())) return "Cooked before";
  return `Last cooked ${cookedAt.toLocaleDateString("en-SG", {
    day: "numeric",
    month: "short",
    year: cookedAt.getFullYear() === new Date().getFullYear() ? undefined : "numeric",
  })}`;
}

function RecipeLibraryRow({
  recipe,
  onSelect,
  onCook,
}: {
  recipe: RecipeCard;
  onSelect: () => void;
  onCook?: () => void;
}) {
  const totalTime = (recipe.prepTime ?? 0) + (recipe.cookTime ?? 0);

  return (
    <article className="group border-t border-ui-border py-3">
      <div className="flex min-w-0 items-stretch gap-2">
        <button
          type="button"
          onClick={onSelect}
          className="grid min-w-0 flex-1 grid-cols-[5.5rem_minmax(0,1fr)] gap-3 rounded-lg text-left outline-none transition-[background-color,box-shadow] duration-200 focus-visible:ring-2 focus-visible:ring-ui-focus focus-visible:ring-offset-2 sm:grid-cols-[7rem_minmax(0,1fr)]"
        >
          <span className="flex aspect-[4/3] min-w-0 items-center justify-center overflow-hidden rounded-lg bg-ui-surface-subtle">
            {recipe.imageUrl ? (
              <img
                src={recipe.imageUrl}
                alt=""
                className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
              />
            ) : (
              <ChefHat className="h-6 w-6 text-ui-accent/45" aria-hidden="true" />
            )}
          </span>
          <span className="min-w-0 self-center py-1">
            <span className="flex min-w-0 items-start gap-2">
              <span className="min-w-0 flex-1 truncate text-[15px] font-semibold text-ui-text group-hover:text-ui-accent">
                {recipe.title}
              </span>
              {recipe.status === "draft" && (
                <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.12em] text-ui-warning">
                  Draft
                </span>
              )}
            </span>
            <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-ui-muted">
              {recipe.cuisine && <span>{recipe.cuisine}</span>}
              {totalTime > 0 && <span>{totalTime} min</span>}
              <span>{formatLastCookedLabel(recipe.lastCookedAt)}</span>
            </span>
            {recipe.description && (
              <span className="mt-1 hidden line-clamp-2 text-xs leading-5 text-ui-muted sm:block">
                {recipe.description}
              </span>
            )}
            <RecipeFlagBadges flags={recipe.recipeFlags} />
          </span>
        </button>
        {onCook && recipe.status !== "draft" && (
          <button
            type="button"
            onClick={onCook}
            className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-ui-border-strong text-ui-muted transition-[background-color,border-color,color] duration-200 hover:border-ui-accent/35 hover:bg-ui-accent-muted hover:text-ui-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-focus focus-visible:ring-offset-2"
            aria-label={`Cook ${recipe.title}`}
            title="Cook with me"
          >
            <ChefHat className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>
    </article>
  );
}

function RecipeFlagControls({
  flags,
  savingFlag,
  onToggle,
}: {
  flags: RecipeFlag[];
  savingFlag: RecipeFlag | null;
  onToggle: (flag: RecipeFlag) => void;
}) {
  return (
    <div className="flex flex-wrap justify-end gap-1.5">
      {RECIPE_FLAG_OPTIONS.map((option) => {
        const active = flags.includes(option.value);
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onToggle(option.value)}
            disabled={savingFlag !== null}
            className={
              "inline-flex h-11 items-center gap-1 rounded-lg border px-3 text-[11px] font-semibold transition-[background-color,border-color,color,opacity] duration-200 disabled:opacity-60 " +
              (active
                ? recipeFlagClass[option.value]
                : "border-ui-border-strong bg-ui-surface-raised text-ui-muted hover:border-ui-accent/35 hover:bg-ui-accent-muted hover:text-ui-accent")
            }
            title={option.description}
          >
            <Flag className="h-3 w-3" />
            {savingFlag === option.value ? "Saving" : option.shortLabel}
          </button>
        );
      })}
    </div>
  );
}

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
    <section className="border-y border-ui-border py-5">
      <SectionHeader
        title="Next try"
        description="A private working draft for your next cook. It stays out of shared recipes until you promote it."
        actions={
          <>
            <button
              type="button"
              onClick={onPromote}
              disabled={busy !== null}
              className="inline-flex h-11 items-center rounded-lg bg-ui-action px-3 text-xs font-semibold text-ui-action-text transition-colors duration-200 hover:bg-ui-action-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy === "promote" ? "Promoting…" : "Promote to version"}
            </button>
            <button
              type="button"
              onClick={onSetDefinitive}
              disabled={busy !== null}
              className="inline-flex h-11 items-center rounded-lg border border-ui-accent/25 bg-ui-surface-raised px-3 text-xs font-semibold text-ui-accent transition-colors duration-200 hover:bg-ui-accent-muted disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy === "definitive" ? "Setting…" : "Promote and set definitive"}
            </button>
            <button
              type="button"
              onClick={onDismiss}
              disabled={busy !== null}
              className="inline-flex h-11 items-center rounded-lg px-3 text-xs font-semibold text-ui-muted transition-colors duration-200 hover:bg-ui-surface-subtle hover:text-ui-danger disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy === "dismiss" ? "Discarding…" : "Discard"}
            </button>
          </>
        }
      />

      {nextTry.notes && (
        <p className="mt-4 border-l-2 border-ui-accent pl-3 text-sm leading-6 text-ui-muted">
          {nextTry.notes}
        </p>
      )}

      <div className="mt-5 grid border-t border-ui-border lg:grid-cols-2 lg:divide-x lg:divide-ui-border">
        {nextTry.ingredients.length > 0 && (
          <div className="py-4 lg:pr-5">
            <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-ui-muted">
              Ingredients to try
            </h3>
            <ul className="mt-3 divide-y divide-ui-border text-sm text-ui-text">
              {nextTry.ingredients.slice(0, 5).map((ingredient, index) => (
                <li
                  key={ingredient.name + index}
                  className="grid grid-cols-[auto_minmax(0,1fr)] gap-2 py-2"
                >
                  <span className="font-semibold text-ui-accent">
                    {formatNextTryAmount(ingredient)}
                  </span>
                  <span>{ingredient.name}</span>
                </li>
              ))}
              {nextTry.ingredients.length > 5 && (
                <li className="py-2 text-xs text-ui-muted">
                  {nextTry.ingredients.length - 5} more ingredients
                </li>
              )}
            </ul>
          </div>
        )}
        {nextTry.instructions.length > 0 && (
          <div className="border-t border-ui-border py-4 lg:border-t-0 lg:pl-5">
            <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-ui-muted">
              Steps to try
            </h3>
            <ol className="mt-3 divide-y divide-ui-border text-sm text-ui-text">
              {nextTry.instructions.slice(0, 3).map((step, index) => (
                <li key={index} className="grid grid-cols-[1.5rem_minmax(0,1fr)] gap-2 py-2">
                  <span className="font-semibold text-ui-accent">
                    {step.step ?? step.stepNumber ?? index + 1}.
                  </span>
                  <span className="line-clamp-2">{instructionText(step)}</span>
                </li>
              ))}
              {nextTry.instructions.length > 3 && (
                <li className="py-2 text-xs text-ui-muted">
                  {nextTry.instructions.length - 3} more steps
                </li>
              )}
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
  const [showScratchpadModal, setShowScratchpadModal] = useState(false);
  const [pasteMode, setPasteMode] = useState<"paste" | "url">("paste");
  // "Surprise me by..." state for the inline book view. When the user
  // opens the filter popover we show an input; typing narrows the
  // random pool to recipes whose title or an ingredient matches.
  const [surpriseByOpen, setSurpriseByOpen] = useState(false);
  const [surpriseByQuery, setSurpriseByQuery] = useState("");
  const [nextTry, setNextTry] = useState<RecipeNextTry | null>(null);
  const [nextTryBusy, setNextTryBusy] = useState<string | null>(null);
  const [recipeEditMode, setRecipeEditMode] = useState(false);
  const [savingRecipeFlag, setSavingRecipeFlag] = useState<RecipeFlag | null>(null);
  const [libraryQuery, setLibraryQuery] = useState("");
  const [libraryFlag, setLibraryFlag] = useState<"all" | RecipeFlag>("all");
  const [libraryBook, setLibraryBook] = useState("all");
  const [libraryCuisine, setLibraryCuisine] = useState("all");
  const [librarySort, setLibrarySort] = useState<"updated" | "last-cooked" | "title">("updated");
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

  const availableCuisines = useMemo(
    () =>
      Array.from(
        new Set(
          recipes
            .map((recipe) => recipe.cuisine?.trim())
            .filter((value): value is string => Boolean(value))
        )
      ).sort((a, b) => a.localeCompare(b)),
    [recipes]
  );

  const visibleRecipes = useMemo(() => {
    const query = libraryQuery.trim().toLocaleLowerCase();
    return [...recipes]
      .filter((recipe) => {
        if (
          query &&
          ![
            recipe.title,
            recipe.description,
            recipe.cuisine,
            recipe.ingredientNames?.join(" "),
          ]
            .filter(Boolean)
            .some((value) => value!.toLocaleLowerCase().includes(query))
        ) {
          return false;
        }
        if (libraryFlag !== "all" && !recipe.recipeFlags?.includes(libraryFlag)) {
          return false;
        }
        if (libraryBook !== "all" && recipe.bookId !== Number(libraryBook)) {
          return false;
        }
        if (libraryCuisine !== "all" && recipe.cuisine !== libraryCuisine) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (librarySort === "title") return a.title.localeCompare(b.title);
        if (librarySort === "last-cooked") {
          return (Date.parse(b.lastCookedAt ?? "") || 0) - (Date.parse(a.lastCookedAt ?? "") || 0);
        }
        return (Date.parse(b.updatedAt) || 0) - (Date.parse(a.updatedAt) || 0);
      });
  }, [libraryBook, libraryCuisine, libraryFlag, libraryQuery, librarySort, recipes]);

  // Fetch books for the library, then prefetch their recipes.
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
    const isEmptyRecipe =
      (recipe.ingredients?.length ?? 0) === 0 &&
      (recipe.instructions?.length ?? 0) === 0;
    const isFreshRecipe =
      recipe.id === justCreatedRecipeId ||
      (recipe.status === "draft" && isEmptyRecipe);
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

  const handleToggleRecipeFlag = useCallback(async (flag: RecipeFlag) => {
    if (!selectedRecipe || savingRecipeFlag) return;
    const currentFlags = selectedRecipe.recipeFlags ?? [];
    const nextFlags = currentFlags.includes(flag)
      ? currentFlags.filter((item) => item !== flag)
      : [...currentFlags, flag];

    setSavingRecipeFlag(flag);
    try {
      const response = await fetch(`/api/recipes/${selectedRecipe.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipeFlags: nextFlags }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(body?.error || "Failed to update recipe flag");
      }
      qc.setQueryData(["recipe", selectedRecipe.id], body);
      qc.invalidateQueries({ queryKey: ["recipes"] });
      qc.invalidateQueries({ queryKey: ["recipe", selectedRecipe.id] });
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Failed to update recipe flag", "error");
    } finally {
      setSavingRecipeFlag(null);
    }
  }, [addToast, qc, savingRecipeFlag, selectedRecipe]);

  const handleScratchpadRecipeUpdate = useCallback(async (draft: ManualRecipeDraft) => {
    if (!selectedRecipe) return;

    const response = await fetch(`/api/recipes/${selectedRecipe.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...draft, status: "active" }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.error || "Failed to save recipe notes");
    }

    qc.invalidateQueries({ queryKey: ["recipe", selectedRecipe.id] });
    qc.invalidateQueries({ queryKey: ["recipes"] });
    setRecipeEditMode(false);
    setShowScratchpadModal(false);
    addToast("Recipe structured from notes", "success");
  }, [addToast, qc, selectedRecipe]);


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
    async (file: File, onProgress?: (progress: number | null) => void) => {
      if (!selectedRecipe) return;
      const recipeId = selectedRecipe.id;
      const formData = new FormData();
      formData.append("file", file);
      try {
        onProgress?.(0);
        const body = await new Promise<NonNullable<import("@/store/RecipeStore").RecipeWithRelations["photos"]>[number]>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("POST", `/api/recipes/${recipeId}/photos`);
          xhr.upload.onprogress = (event) => {
            if (!event.lengthComputable || event.total === 0) {
              onProgress?.(null);
              return;
            }
            onProgress?.(Math.min(95, Math.max(1, (event.loaded / event.total) * 95)));
          };
          xhr.onerror = () => reject(new Error("Photo upload failed. Please try again."));
          xhr.onabort = () => reject(new Error("Photo upload was cancelled."));
          xhr.onload = () => {
            const responseBody = (() => {
              try {
                return xhr.responseText ? JSON.parse(xhr.responseText) : {};
              } catch {
                return {};
              }
            })();

            if (xhr.status < 200 || xhr.status >= 300) {
              reject(new Error(responseBody.error || "Failed to upload photo"));
              return;
            }

            onProgress?.(100);
            resolve(responseBody);
          };
          xhr.send(formData);
        });
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
        throw err;
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

  const flushEditableFields = useCallback(async ({
    blurActive = false,
    notify = false,
  }: { blurActive?: boolean; notify?: boolean } = {}) => {
    // Blur whatever is currently focused when the user explicitly locks the
    // recipe. Timed autosave should stay quiet and avoid stealing focus.
    if (blurActive) {
      const active = document.activeElement as HTMLElement | null;
      if (active && typeof active.blur === "function") active.blur();
    }

    await Promise.all([
      handleBlur("title"),
      handleBlur("description"),
      handleBlur("cuisine"),
      handleBlur("prepTime"),
      handleBlur("cookTime"),
      handleBlur("yield"),
    ]);
    if (notify) addToast("Changes saved", "success");
  }, [addToast, handleBlur]);

  useEffect(() => {
    if (!recipeEditMode) return;
    const interval = window.setInterval(() => {
      void flushEditableFields();
    }, 30_000);
    return () => window.clearInterval(interval);
  }, [flushEditableFields, recipeEditMode]);

  const handleSaveAndLock = async () => {
    await flushEditableFields({ blurActive: true, notify: true });
    setRecipeEditMode(false);
  };


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
      <div className="flex-1 overflow-y-auto bg-ui-bg pb-20 md:pb-8">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
          {activeBookId ? (() => {
            const activeBook = books.find((book) => book.id === activeBookId);
            return (
              <>
                <PageHeader
                  eyebrow="Recipe book"
                  title={activeBook?.title ?? "Book"}
                  description={`${activeBookRecipes.length} recipe${activeBookRecipes.length === 1 ? "" : "s"}`}
                  actions={
                    <>
                      <button
                        type="button"
                        onClick={handleCloseBook}
                        className="inline-flex h-11 items-center gap-2 rounded-lg border border-ui-border-strong bg-ui-surface-raised px-3 text-sm font-semibold text-ui-muted transition-[background-color,border-color,color] duration-200 hover:bg-ui-surface-subtle hover:text-ui-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-focus focus-visible:ring-offset-2"
                      >
                        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                        Library
                      </button>
                      {activeBook && (
                        <button
                          type="button"
                          onClick={() =>
                            setShowShareModal({
                              type: "book",
                              id: activeBook.id,
                              name: activeBook.title,
                            })
                          }
                          className="inline-flex h-11 items-center justify-center rounded-lg border border-ui-border-strong bg-ui-surface-raised px-3 text-sm font-semibold text-ui-muted transition-[background-color,border-color,color] duration-200 hover:border-ui-accent/35 hover:bg-ui-accent-muted hover:text-ui-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-focus focus-visible:ring-offset-2"
                        >
                          Share
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const response = await fetch("/api/recipes", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                title: "Untitled Recipe",
                                bookId: activeBookId,
                              }),
                            });
                            if (!response.ok) return;
                            const newRecipe = await response.json();
                            qc.invalidateQueries({ queryKey: ["recipes"] });
                            selectRecipe(newRecipe.id);
                          } catch {}
                        }}
                        className="inline-flex h-11 items-center gap-2 rounded-lg bg-ui-action px-4 text-sm font-semibold text-ui-action-text transition-colors duration-200 hover:bg-ui-action-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-focus focus-visible:ring-offset-2"
                      >
                        <Plus className="h-4 w-4" aria-hidden="true" />
                        Add recipe
                      </button>
                    </>
                  }
                />

                <section className="mt-7">
                  {loadingBookRecipes ? (
                    <div className="grid gap-x-8 lg:grid-cols-2" aria-label="Loading recipes">
                      {[0, 1, 2, 3].map((item) => (
                        <div key={item} className="flex gap-3 border-t border-ui-border py-3">
                          <div className="aspect-[4/3] w-28 animate-pulse rounded-lg bg-ui-surface-subtle" />
                          <div className="flex-1 py-2">
                            <div className="h-4 w-2/3 animate-pulse rounded bg-ui-surface-subtle" />
                            <div className="mt-3 h-3 w-1/2 animate-pulse rounded bg-ui-surface-subtle" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : activeBookRecipes.length === 0 ? (
                    <EmptyState
                      title="No recipes in this book"
                      description="Add a recipe here when you create it, or assign an existing recipe from Library info."
                    />
                  ) : (
                    <div className="grid min-w-0 gap-x-8 lg:grid-cols-2">
                      {activeBookRecipes.map((recipe) => (
                        <RecipeLibraryRow
                          key={recipe.id}
                          recipe={recipe}
                          onSelect={() => selectRecipe(recipe.id)}
                          onCook={
                            onCookRecipe
                              ? () => onCookRecipe(recipe.id)
                              : undefined
                          }
                        />
                      ))}
                    </div>
                  )}
                </section>

                <section className="mt-10 border-t border-ui-border pt-7">
                  <SectionHeader
                    title="Cooking principles"
                    description="Shared rules, cues, and habits that apply across this book."
                  />
                  <div className="mt-4">
                    <CookingPrinciples
                      bookId={activeBookId}
                      canEdit
                      isOwner
                    />
                  </div>
                </section>
              </>
            );
          })() : (
            <>
              <PageHeader
                eyebrow="Your kitchen"
                title="Recipe library"
                description={`${recipes.length} recipe${recipes.length === 1 ? "" : "s"} saved across your books.`}
                actions={
                  <>
                    {recipes.length > 0 && (
                      <DropdownMenu.Root>
                        <DropdownMenu.Trigger>
                          <Button variant="soft" size="2">
                            <Shuffle className="h-4 w-4" />
                            Surprise me
                          </Button>
                        </DropdownMenu.Trigger>
                        <DropdownMenu.Content>
                          <DropdownMenu.Item
                            onClick={() => {
                              const pool = visibleRecipes.length > 0 ? visibleRecipes : recipes;
                              const random = pool[Math.floor(Math.random() * pool.length)];
                              selectRecipe(random.id);
                            }}
                          >
                            <Shuffle className="h-4 w-4" />
                            Pick from this list
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
                    <button
                      type="button"
                      onClick={() => {
                        onOpenSidebar();
                        window.dispatchEvent(new CustomEvent("mychelin:create-recipe"));
                      }}
                      className="inline-flex h-11 items-center gap-2 rounded-lg bg-ui-action px-4 text-sm font-semibold text-ui-action-text transition-colors duration-200 hover:bg-ui-action-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-focus focus-visible:ring-offset-2 md:hidden"
                    >
                      <Plus className="h-4 w-4" aria-hidden="true" />
                      Add recipe
                    </button>
                  </>
                }
              />

              <section className="mt-8">
                <SectionHeader
                  title="Books"
                  description="Keep recipes together by family, occasion, or the way you cook."
                  actions={
                    <button
                      type="button"
                      onClick={() =>
                        window.dispatchEvent(new CustomEvent("mychelin:create-book"))
                      }
                      className="inline-flex h-11 items-center gap-2 rounded-lg border border-ui-border-strong bg-ui-surface-raised px-3 text-sm font-semibold text-ui-muted transition-[background-color,border-color,color] duration-200 hover:border-ui-accent/35 hover:bg-ui-accent-muted hover:text-ui-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-focus focus-visible:ring-offset-2"
                    >
                      <Plus className="h-4 w-4" aria-hidden="true" />
                      Create book
                    </button>
                  }
                />
                {books.length === 0 ? (
                  <EmptyState
                    className="border-t border-ui-border"
                    title="No books yet"
                    description="Books are optional. Create one when a group of recipes belongs together."
                  />
                ) : (
                  <div className="mt-3 grid min-w-0 gap-x-8 lg:grid-cols-2">
                    {books.map((book) => (
                      <button
                        key={book.id}
                        type="button"
                        onClick={() => handleOpenBook(book.id)}
                        className="group grid min-h-[4.75rem] min-w-0 grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-3 border-t border-ui-border px-1 text-left transition-colors duration-200 hover:bg-ui-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ui-focus"
                      >
                        <span className="text-xl" aria-hidden="true">
                          {book.coverEmoji}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-ui-text group-hover:text-ui-accent">
                            {book.title}
                          </span>
                          <span className="mt-0.5 block truncate text-xs text-ui-muted">
                            {book.description ||
                              `${book.recipeCount} recipe${book.recipeCount === 1 ? "" : "s"}`}
                          </span>
                        </span>
                        <span className="flex items-center gap-2 text-xs tabular-nums text-ui-muted">
                          {book.recipeCount}
                          <ChevronRight className="h-4 w-4" aria-hidden="true" />
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </section>

              <section className="mt-10">
                <SectionHeader
                  title="Recipes"
                  description="Search, filter, and choose what to cook next."
                />

                <FilterBar
                  id="recipe-library-search"
                  label="Search recipe library"
                  query={libraryQuery}
                  onQueryChange={setLibraryQuery}
                  placeholder="Search recipe, ingredient, cuisine, or notes"
                  filters={[
                    { label: "All", value: "all", count: recipes.length },
                    {
                      label: "New",
                      value: "newly_added",
                      count: recipes.filter((recipe) =>
                        recipe.recipeFlags?.includes("newly_added")
                      ).length,
                    },
                    {
                      label: "Try soon",
                      value: "try_soon",
                      count: recipes.filter((recipe) =>
                        recipe.recipeFlags?.includes("try_soon")
                      ).length,
                    },
                  ]}
                  activeFilter={libraryFlag}
                  onFilterChange={(value) =>
                    setLibraryFlag(value as "all" | RecipeFlag)
                  }
                  resultCount={visibleRecipes.length}
                  resultLabel={visibleRecipes.length === 1 ? "recipe" : "recipes"}
                  className="mt-4"
                />

                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <label className="grid gap-1 text-xs font-semibold text-ui-muted">
                    Book
                    <select
                      value={libraryBook}
                      onChange={(event) => setLibraryBook(event.target.value)}
                      className="h-11 min-w-0 rounded-lg border border-ui-border-strong bg-ui-surface-raised px-3 text-sm font-medium text-ui-text outline-none focus:border-ui-accent focus:ring-2 focus:ring-ui-focus-soft"
                    >
                      <option value="all">All books</option>
                      {books.map((book) => (
                        <option key={book.id} value={String(book.id)}>
                          {book.title}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-1 text-xs font-semibold text-ui-muted">
                    Cuisine
                    <select
                      value={libraryCuisine}
                      onChange={(event) => setLibraryCuisine(event.target.value)}
                      className="h-11 min-w-0 rounded-lg border border-ui-border-strong bg-ui-surface-raised px-3 text-sm font-medium text-ui-text outline-none focus:border-ui-accent focus:ring-2 focus:ring-ui-focus-soft"
                    >
                      <option value="all">All cuisines</option>
                      {availableCuisines.map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-1 text-xs font-semibold text-ui-muted">
                    Sort
                    <select
                      value={librarySort}
                      onChange={(event) =>
                        setLibrarySort(
                          event.target.value as "updated" | "last-cooked" | "title"
                        )
                      }
                      className="h-11 min-w-0 rounded-lg border border-ui-border-strong bg-ui-surface-raised px-3 text-sm font-medium text-ui-text outline-none focus:border-ui-accent focus:ring-2 focus:ring-ui-focus-soft"
                    >
                      <option value="updated">Recently updated</option>
                      <option value="last-cooked">Last cooked</option>
                      <option value="title">Recipe name</option>
                    </select>
                  </label>
                </div>

                {visibleRecipes.length === 0 ? (
                  <EmptyState
                    className="mt-4 border-t border-ui-border"
                    title="No recipes match these filters"
                    description="Clear the filters or try a broader search."
                    action={
                      <button
                        type="button"
                        onClick={() => {
                          setLibraryQuery("");
                          setLibraryFlag("all");
                          setLibraryBook("all");
                          setLibraryCuisine("all");
                        }}
                        className="inline-flex h-11 items-center rounded-lg border border-ui-border-strong bg-ui-surface-raised px-4 text-sm font-semibold text-ui-text hover:bg-ui-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-focus focus-visible:ring-offset-2"
                      >
                        Clear filters
                      </button>
                    }
                  />
                ) : (
                  <div className="mt-4 grid min-w-0 gap-x-8 lg:grid-cols-2">
                    {visibleRecipes.map((recipe) => (
                      <RecipeLibraryRow
                        key={recipe.id}
                        recipe={recipe}
                        onSelect={() => selectRecipe(recipe.id)}
                        onCook={
                          onCookRecipe
                            ? () => onCookRecipe(recipe.id)
                            : undefined
                        }
                      />
                    ))}
                  </div>
                )}
              </section>
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

  return (
    <div className="relative flex-1 overflow-y-auto bg-surface">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-5 py-4 md:gap-7 md:px-7 md:py-6">
        {/* ─── Core tier — always visible ──────────────── */}

        <PhotoUploadSection
          variant="cover"
          title={
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
              variant="cover"
            />
          }
          subtitle={
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-white/80">
              {selectedRecipe.cuisine && <span>{selectedRecipe.cuisine}</span>}
              {(selectedRecipe.prepTime || selectedRecipe.cookTime) && (
                <span>{[selectedRecipe.prepTime ? selectedRecipe.prepTime + "m prep" : null, selectedRecipe.cookTime ? selectedRecipe.cookTime + "m cook" : null].filter(Boolean).join(" · ")}</span>
              )}
            </div>
          }
          actions={
            <div className="flex flex-wrap items-center justify-end gap-2">
              {recipeEditMode ? (
                <button
                  type="button"
                  onClick={handleSaveAndLock}
                  className="inline-flex h-11 items-center gap-1.5 rounded-lg bg-white px-3 text-xs font-semibold text-[#17131f] shadow-sm transition-colors duration-200 hover:bg-[#fff7e8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                >
                  <Check className="h-3.5 w-3.5" />
                  Save and lock
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setRecipeEditMode(true)}
                  className="inline-flex h-11 items-center gap-1.5 rounded-lg bg-white px-3 text-xs font-semibold text-[#17131f] shadow-sm transition-colors duration-200 hover:bg-[#fff7e8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                >
                  <PencilLine className="h-3.5 w-3.5" />
                  Edit
                </button>
              )}
            </div>
          }
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

        <div className="flex flex-col gap-3 border-b border-ui-border pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => selectRecipe(null)}
              className="inline-flex h-11 items-center gap-2 rounded-lg border border-ui-border-strong bg-ui-surface-raised px-3 text-xs font-semibold text-ui-muted transition-colors duration-200 hover:bg-ui-surface-subtle hover:text-ui-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-focus focus-visible:ring-offset-2 md:hidden"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Library
            </button>
            <RecipeFlagControls
              flags={selectedRecipe.recipeFlags ?? []}
              savingFlag={savingRecipeFlag}
              onToggle={handleToggleRecipeFlag}
            />
          </div>
          {recipeEditMode && (
            <RecipeSaveStatus
              isSaving={anyFieldSaving}
              updatedAt={selectedRecipe.updatedAt}
              compact
            />
          )}
        </div>

        {nextTry && (
          <NextTryPanel
            nextTry={nextTry}
            busy={nextTryBusy}
            onPromote={() => promoteNextTry(false)}
            onSetDefinitive={() => promoteNextTry(true)}
            onDismiss={dismissNextTry}
          />
        )}

        {/* Keep every capture route one tap away, but present them as a single
            task list rather than competing feature cards. */}
        {(selectedRecipe.ingredients?.length ?? 0) === 0 &&
          (selectedRecipe.instructions?.length ?? 0) === 0 && (
            <section className="border-y border-ui-border">
              <div className="py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ui-accent">
                  Start this recipe
                </p>
                <p className="mt-1 text-sm text-ui-muted">
                  Choose the source you already have.
                </p>
              </div>

              <div className="border-t border-ui-border">
                <button
                  type="button"
                  onClick={() => setShowScratchpadModal(true)}
                  className="group flex min-h-[4.5rem] w-full items-center gap-3 border-b border-ui-border px-1 py-3 text-left transition-colors hover:bg-ui-surface-subtle focus-visible:bg-ui-surface-subtle"
                >
                  <PencilLine className="h-5 w-5 shrink-0 text-ui-accent" aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-sm font-semibold text-ui-text">
                        Write or paste recipe
                      </span>
                      <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ui-muted">
                        Local parser
                      </span>
                    </span>
                    <span className="mt-1 hidden text-xs leading-5 text-ui-muted sm:block">
                      Type naturally, paste OCR text, WhatsApp notes, or a rough memory dump.
                    </span>
                  </span>
                  <ChevronRight
                    className="h-4 w-4 shrink-0 text-ui-muted transition-transform duration-200 group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPasteMode("url");
                    setShowPasteModal(true);
                  }}
                  className="group flex min-h-[4.5rem] w-full items-center gap-3 border-b border-ui-border px-1 py-3 text-left transition-colors hover:bg-ui-surface-subtle focus-visible:bg-ui-surface-subtle"
                >
                  <Link2 className="h-5 w-5 shrink-0 text-ui-accent" aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-sm font-semibold text-ui-text">
                        Import from link
                      </span>
                      <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ui-muted">
                        AI
                      </span>
                    </span>
                    <span className="mt-1 hidden text-xs leading-5 text-ui-muted sm:block">
                      Paste a recipe page, blog post, or video URL. Switch to Text inside if extraction is blocked.
                    </span>
                  </span>
                  <ChevronRight
                    className="h-4 w-4 shrink-0 text-ui-muted transition-transform duration-200 group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </button>

                <button
                  type="button"
                  onClick={() => setShowCaptureModal(true)}
                  className="group flex min-h-[4.5rem] w-full items-center gap-3 px-1 py-3 text-left transition-colors hover:bg-ui-surface-subtle focus-visible:bg-ui-surface-subtle"
                >
                  <Mic2 className="h-5 w-5 shrink-0 text-ui-accent" aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-sm font-semibold text-ui-text">
                        Live conversation capture
                      </span>
                      <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ui-muted">
                        AI
                      </span>
                    </span>
                    <span className="mt-1 hidden text-xs leading-5 text-ui-muted sm:block">
                      Talk with a parent or grandparent while Mychelin translates the gist and suggests follow-up questions.
                    </span>
                  </span>
                  <ChevronRight
                    className="h-4 w-4 shrink-0 text-ui-muted transition-transform duration-200 group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </button>
              </div>
            </section>
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

        <div
          className={
            recipeEditMode
              ? "grid gap-7"
              : "grid min-w-0 gap-7 lg:grid-cols-[minmax(15rem,0.78fr)_minmax(0,1.55fr)] lg:items-start"
          }
        >
          <div className={!recipeEditMode ? "lg:col-span-2" : undefined}>
            <ServingScaler
              baseYield={selectedRecipe.yield ?? ""}
              onScaleChange={setIngredientScale}
            />
          </div>

          <IngredientList
            ingredients={selectedRecipe.ingredients ?? []}
            recipeId={selectedRecipe.id}
            onAdd={addIngredient}
            onUpdate={updateIngredient}
            onDelete={deleteIngredient}
            scale={ingredientScale}
            readOnly={!recipeEditMode}
          />

          <RecipeSteps
            instructions={selectedRecipe.instructions ?? []}
            recipeId={selectedRecipe.id}
            onAdd={addInstruction}
            onUpdate={updateInstruction}
            onDelete={deleteInstruction}
            ingredients={selectedRecipe.ingredients ?? []}
            readOnly={!recipeEditMode}
          />
        </div>

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
          <div className="border-y border-ui-border py-5">
            <SectionHeader
              title="Attempts & versions"
              description="Log every cook as an attempt. Promote meaningful changes to a version, then choose which version is definitive."
              actions={
                <>
                  <button
                    type="button"
                    onClick={() => setShowCookWithMe(true)}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-ui-action px-4 text-sm font-semibold text-ui-action-text transition-colors duration-200 hover:bg-ui-action-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-focus focus-visible:ring-offset-2"
                  >
                    <ChefHat className="h-4 w-4" aria-hidden="true" />
                    Cook with me
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCookAlong(true)}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-ui-border-strong bg-ui-surface-raised px-4 text-sm font-semibold text-ui-accent transition-[background-color,border-color] duration-200 hover:border-ui-accent/35 hover:bg-ui-accent-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-focus focus-visible:ring-offset-2"
                  >
                    <PencilLine className="h-4 w-4" aria-hidden="true" />
                    Log cook
                  </button>
                </>
              }
            />
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

      {/* Link/text import modal — fetches a URL or extracts copied text, then PATCHes the current recipe. */}
      {showPasteModal && selectedRecipe && (
        <PasteRecipeModal
          recipeId={selectedRecipe.id}
          onClose={() => setShowPasteModal(false)}
          initialMode={pasteMode}
          onRecipeUpdated={() => {
            qc.invalidateQueries({ queryKey: ["recipe", selectedRecipe.id] });
            qc.invalidateQueries({ queryKey: ["recipes"] });
            addToast(pasteMode === "url" ? "Recipe imported from link!" : "Recipe extracted from pasted text!", "success");
          }}
        />
      )}

      {showScratchpadModal && selectedRecipe && (
        <ManualRecipeScratchpadModal
          initialTitle={selectedRecipe.title === "Untitled recipe" ? "" : selectedRecipe.title}
          saveLabel="Save to recipe"
          onClose={() => setShowScratchpadModal(false)}
          onCreateRecipe={handleScratchpadRecipeUpdate}
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
