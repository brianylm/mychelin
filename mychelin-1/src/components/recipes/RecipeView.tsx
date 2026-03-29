"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@radix-ui/themes";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { useRecipeStore } from "@/store/RecipeStore";
import { useToast } from "@/context/ToastContext";
import { RecipeHeader } from "./RecipeHeader";
import { IngredientList } from "./IngredientList";
import { RecipeSteps } from "./RecipeSteps";
import { StorySection } from "./StorySection";
import { RatingSection } from "./RatingSection";
import { SpeedDialFAB } from "./SpeedDialFAB";
import { PhotoUploadSection, type RecipePhoto } from "./PhotoUploadSection";
import { CulturalContextCard } from "@/components/heritage/CulturalContextCard";
import { VoiceRecording, type VoiceClip } from "@/components/heritage/VoiceRecording";

import { LoadingAnimation } from "@/components/ui/LoadingAnimation";
import { AddToBookModal } from "@/components/books/AddToBookModal";
import { CreateBookModal } from "@/components/books/CreateBookModal";

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
}

export function RecipeView({ onOpenSidebar }: RecipeViewProps) {
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
  } = useRecipeStore();
  const { addToast } = useToast();
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
  const [showAddToBookModal, setShowAddToBookModal] = useState(false);
  const [books, setBooks] = useState<BookSummary[]>([]);
  const [expandedBookId, setExpandedBookId] = useState<number | null>(null);
  const [expandedBookRecipes, setExpandedBookRecipes] = useState<any[]>([]);
  const [showCreateBookModal, setShowCreateBookModal] = useState(false);

  // Fetch books for card grid
  const fetchBooks = useCallback(() => {
    fetch("/api/books")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setBooks(data))
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

  const handleToggleBook = useCallback(async (bookId: number) => {
    if (expandedBookId === bookId) {
      setExpandedBookId(null);
      setExpandedBookRecipes([]);
      return;
    }
    setExpandedBookId(bookId);
    setExpandedBookRecipes([]);
    try {
      const res = await fetch(`/api/books/${bookId}/recipes`);
      if (res.ok) {
        const data = await res.json();
        setExpandedBookRecipes(data);
      }
    } catch {}
  }, [expandedBookId]);

  // Sync local state with selected recipe
  useEffect(() => {
    if (selectedRecipe) {
      setTitle(selectedRecipe.title);
      setDescription(selectedRecipe.description ?? "");
      setCuisine(selectedRecipe.cuisine ?? "");
      setPrepTime(selectedRecipe.prepTime?.toString() ?? "");
      setCookTime(selectedRecipe.cookTime?.toString() ?? "");
      setRecipeYield(selectedRecipe.yield ?? "");
    }
  }, [selectedRecipe]);

  const handleBlur = useCallback(
    async (field: "title" | "description" | "cuisine" | "prepTime" | "cookTime" | "yield") => {
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
        let updateValue: any = values[field] || null;
        
        // Convert time fields to numbers
        if (field === "prepTime" || field === "cookTime") {
          updateValue = values[field] ? parseInt(values[field], 10) : null;
        }

        await updateRecipe(selectedRecipe.id, {
          [field]: updateValue,
        });
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
      const formData = new FormData();
      formData.append("file", file);
      try {
        await fetch(`/api/recipes/${selectedRecipe.id}/photos`, {
          method: "POST",
          body: formData,
        });
        addToast("Photo uploaded", "success");
        qc.invalidateQueries({ queryKey: ["recipe", selectedRecipe.id] });
      } catch {
        addToast("Failed to upload photo", "error");
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

  const handleAddToBook = useCallback(() => {
    if (!selectedRecipe) return;
    setShowAddToBookModal(true);
  }, [selectedRecipe]);

  // Loading state
  if (loading && recipes.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center bg-surface">
        <LoadingAnimation />
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
            <h2 className="text-lg font-semibold text-neutral-800">
              Welcome to Mychelin
            </h2>
            <p className="mt-3 text-sm leading-relaxed">
              Preserve your family&apos;s food heritage. Create a recipe to
              capture the dishes, stories, and traditions that matter.
            </p>
            <div className="pt-6">
              <Button onClick={onOpenSidebar} variant="solid" size="3">
                Get started
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="flex-1 overflow-y-auto bg-surface pb-20 md:pb-6">
        <div className="mx-auto max-w-5xl px-5 py-6">
          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-neutral-800">
                Your Recipes
              </h2>
              <p className="mt-1 text-sm text-neutral-500">
                {recipes.length} recipe{recipes.length !== 1 ? "s" : ""} in your collection
              </p>
            </div>
            <div className="flex items-center gap-2">
              {recipes.length > 0 && (
                <Button
                  variant="soft"
                  color="amber"
                  size="2"
                  onClick={() => {
                    const random = recipes[Math.floor(Math.random() * recipes.length)];
                    selectRecipe(random.id);
                  }}
                >
                  🎲 Surprise me
                </Button>
              )}
              <Button
                variant="solid"
                size="2"
                onClick={onOpenSidebar}
                className="md:hidden"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                New
              </Button>
            </div>
          </div>

          {/* Books section */}
          <div className="mb-6">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">
                📚 Books
              </h3>
              <button
                onClick={() => window.dispatchEvent(new CustomEvent("mychelin:create-book"))}
                className="text-xs font-medium text-amber-600 hover:text-amber-700"
              >
                + Create Book
              </button>
            </div>
            {books.length > 0 ? (
              <div className="space-y-2">
                {books.map((book) => {
                  const colorMap: Record<string, string> = {
                    amber: "border-amber-200 bg-amber-50",
                    rose: "border-rose-200 bg-rose-50",
                    emerald: "border-emerald-200 bg-emerald-50",
                    sky: "border-sky-200 bg-sky-50",
                    violet: "border-violet-200 bg-violet-50",
                    slate: "border-slate-200 bg-slate-50",
                  };
                  const colorClass = colorMap[book.coverColor] || "border-amber-200 bg-amber-50";
                  const isExpanded = expandedBookId === book.id;

                  return (
                    <div key={book.id} className={`rounded-xl border ${isExpanded ? colorClass : "border-neutral-200 bg-white"} transition-all`}>
                      <button
                        onClick={() => handleToggleBook(book.id)}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className={cn(
                            "shrink-0 text-neutral-400 transition-transform",
                            isExpanded && "rotate-90"
                          )}
                        >
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                        <span className="text-xl">{book.coverEmoji}</span>
                        <div className="flex-1 min-w-0">
                          <span className="font-semibold text-neutral-800">{book.title}</span>
                          {book.description && (
                            <p className="text-xs text-neutral-500 truncate">{book.description}</p>
                          )}
                        </div>
                        <span className="shrink-0 text-xs text-neutral-400">
                          {book.recipeCount} recipe{book.recipeCount !== 1 ? "s" : ""}
                        </span>
                      </button>

                      {isExpanded && (
                        <div className="border-t border-neutral-200/60 px-4 pb-3 pt-2">
                          {expandedBookRecipes.length === 0 ? (
                            <p className="py-2 text-sm text-neutral-400">
                              {expandedBookId === book.id ? "No recipes in this book yet" : "Loading…"}
                            </p>
                          ) : (
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                              {expandedBookRecipes.map((r: any) => (
                                <button
                                  key={r.id}
                                  onClick={() => selectRecipe(r.id)}
                                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-white/80"
                                >
                                  <span className="text-base opacity-60">🍳</span>
                                  <span className="truncate font-medium text-neutral-700">
                                    {r.title}
                                  </span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-neutral-200 px-4 py-6 text-center text-sm text-neutral-400">
                No books yet — create one to organize your recipes into collections
              </p>
            )}
          </div>

          {/* Card grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recipes.map((recipe) => (
              <button
                key={recipe.id}
                onClick={() => selectRecipe(recipe.id)}
                className="group flex flex-col rounded-2xl border border-neutral-200 bg-white p-0 text-left transition-all hover:border-amber-300 hover:shadow-md"
              >
                {/* Image area */}
                <div className="flex h-36 items-center justify-center rounded-t-2xl bg-gradient-to-br from-amber-50 to-orange-50">
                  {recipe.imageUrl ? (
                    <img
                      src={recipe.imageUrl}
                      alt={recipe.title}
                      className="h-full w-full rounded-t-2xl object-cover"
                    />
                  ) : (
                    <span className="text-4xl opacity-60">
                      {recipe.cuisine === "Japanese" ? "🍱" :
                       recipe.cuisine === "Korean" ? "🍲" :
                       recipe.cuisine === "Italian" ? "🍝" :
                       recipe.cuisine === "Indian" ? "🍛" :
                       recipe.cuisine === "Thai" ? "🥘" :
                       recipe.cuisine === "Mexican" ? "🌮" :
                       recipe.cuisine === "French" ? "🥐" :
                       "🍳"}
                    </span>
                  )}
                </div>
                {/* Info */}
                <div className="flex flex-1 flex-col p-4">
                  <h3 className="font-semibold text-neutral-800 group-hover:text-amber-800">
                    {recipe.title}
                  </h3>
                  {recipe.cuisine && (
                    <span className="mt-1 text-xs font-medium text-amber-700 bg-amber-50 rounded-full px-2 py-0.5 w-fit">
                      {recipe.cuisine}
                    </span>
                  )}
                  {recipe.description && (
                    <p className="mt-2 line-clamp-2 text-xs text-neutral-500 leading-relaxed">
                      {recipe.description}
                    </p>
                  )}
                  {(recipe.prepTime || recipe.cookTime) && (
                    <div className="mt-auto flex gap-3 pt-3 text-[11px] text-neutral-400">
                      {recipe.prepTime && <span>🔪 {recipe.prepTime}m prep</span>}
                      {recipe.cookTime && <span>🔥 {recipe.cookTime}m cook</span>}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex-1 overflow-y-auto bg-surface">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-5 py-6">
        {/* Core recipe info */}
        <RecipeHeader
          recipe={selectedRecipe}
          title={title}
          onTitleChange={setTitle}
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
          savingTitle={savingTitle}
          savingDescription={savingDescription}
          savingCuisine={savingCuisine}
          savingPrepTime={savingPrepTime}
          savingCookTime={savingCookTime}
          savingYield={savingYield}
        />

        {/* Photos */}
        <PhotoUploadSection
          photos={(selectedRecipe.photos ?? []).map((p) => ({
            id: String(p.id),
            url: p.blobUrl,
            sortOrder: p.sortOrder ?? 0,
          }))}
          onUpload={handlePhotoUpload}
          onRemove={handlePhotoRemove}
        />

        {/* Ingredients */}
        <IngredientList
          ingredients={selectedRecipe.ingredients ?? []}
          recipeId={selectedRecipe.id}
          onAdd={addIngredient}
          onUpdate={updateIngredient}
          onDelete={deleteIngredient}
        />

        {/* Steps */}
        <RecipeSteps
          instructions={selectedRecipe.instructions ?? []}
          recipeId={selectedRecipe.id}
          onAdd={addInstruction}
          onUpdate={updateInstruction}
          onDelete={deleteInstruction}
        />

        {/* Heritage section */}
        <div className="space-y-4">
          <h2 className="text-xs font-medium uppercase tracking-wide text-neutral-500">
            Heritage & Culture
          </h2>

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
        </div>

        {/* Ratings */}
        <RatingSection
          authenticityRating={selectedRecipe.authenticityRating ?? null}
          tasteRating={selectedRecipe.tasteRating ?? null}
          nostalgiaRating={selectedRecipe.nostalgiaRating ?? null}
          onSave={handleRatingSave}
        />
      </div>

      {/* Speed Dial FAB */}
      <SpeedDialFAB onDelete={handleDelete} onAddToBook={handleAddToBook} />

      {/* Add to Book Modal */}
      {showAddToBookModal && selectedRecipe && (
        <AddToBookModal
          recipeId={selectedRecipe.id}
          recipeName={selectedRecipe.title}
          onClose={() => setShowAddToBookModal(false)}
        />
      )}

      {showCreateBookModal && (
        <CreateBookModal
          onClose={() => setShowCreateBookModal(false)}
          onCreateBook={handleCreateBook}
        />
      )}
    </div>
  );
}
