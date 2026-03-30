"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@radix-ui/themes";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { useRecipeStore } from "@/store/RecipeStore";
import { useToast } from "@/context/ToastContext";
import { RecipeHeader } from "./RecipeHeader";
import { BookSelector } from "./BookSelector";
import { IngredientList } from "./IngredientList";
import { RecipeSteps } from "./RecipeSteps";
import { StorySection } from "./StorySection";
import { RatingSection } from "./RatingSection";

import { PhotoUploadSection, type RecipePhoto } from "./PhotoUploadSection";
import { CulturalContextCard } from "@/components/heritage/CulturalContextCard";
import { VoiceRecording, type VoiceClip } from "@/components/heritage/VoiceRecording";

import { LoadingAnimation } from "@/components/ui/LoadingAnimation";
import { ServingScaler } from "./ServingScaler";
import { AddToBookModal } from "@/components/books/AddToBookModal";
import { CreateBookModal } from "@/components/books/CreateBookModal";
import { ShareModal } from "@/components/sharing/ShareModal";

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
  const [ingredientScale, setIngredientScale] = useState(1);
  const [showAddToBookModal, setShowAddToBookModal] = useState(false);
  const [books, setBooks] = useState<BookSummary[]>([]);
  const [activeBookId, setActiveBookId] = useState<number | null>(null);
  const [activeBookRecipes, setActiveBookRecipes] = useState<any[]>([]);
  const [loadingBookRecipes, setLoadingBookRecipes] = useState(false);
  const [showCreateBookModal, setShowCreateBookModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState<{ type: "recipe" | "book"; id: number; name: string } | null>(null);

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

  const handleOpenBook = useCallback(async (bookId: number) => {
    setActiveBookId(bookId);
    setLoadingBookRecipes(true);
    setActiveBookRecipes([]);
    try {
      const res = await fetch(`/api/books/${bookId}/recipes`);
      if (res.ok) {
        const data = await res.json();
        setActiveBookRecipes(data);
      }
    } catch {} finally {
      setLoadingBookRecipes(false);
    }
  }, []);

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

  const handleBookChange = useCallback(
    async (bookId: number | null) => {
      if (!selectedRecipe) return;
      await updateRecipe(selectedRecipe.id, { bookId } as any);
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

  const createBookModalEl = showCreateBookModal ? (
    <CreateBookModal
      onClose={() => setShowCreateBookModal(false)}
      onCreateBook={handleCreateBook}
    />
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
                    <h2 className="text-xl font-semibold text-neutral-800 truncate">
                      {activeBook?.title ?? "Book"}
                    </h2>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-neutral-500">
                      {activeBookRecipes.length} recipe{activeBookRecipes.length !== 1 ? "s" : ""}
                    </p>
                    <div className="flex items-center gap-2">
                      {activeBookRecipes.length > 0 && (
                        <Button
                          variant="soft"
                          color="amber"
                          size="2"
                          onClick={() => {
                            const random = activeBookRecipes[Math.floor(Math.random() * activeBookRecipes.length)];
                            selectRecipe(random.id);
                          }}
                        >
                          🎲 Surprise me
                        </Button>
                      )}
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
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-amber-600"
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
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-600 border-t-transparent" />
                  </div>
                ) : activeBookRecipes.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-neutral-400">
                    <span className="mb-3 text-4xl">📖</span>
                    <p className="text-sm">No recipes in this book yet</p>
                    <p className="mt-1 text-xs">Assign recipes to this book from the recipe view</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {activeBookRecipes.map((recipe: any) => (
                      <button
                        key={recipe.id}
                        onClick={() => selectRecipe(recipe.id)}
                        className="group flex flex-col rounded-2xl border border-neutral-200 bg-white p-0 text-left transition-all hover:border-amber-300 hover:shadow-md"
                      >
                        <div className="flex h-36 items-center justify-center rounded-t-2xl bg-gradient-to-br from-amber-50 to-orange-50">
                          {recipe.imageUrl ? (
                            <img src={recipe.imageUrl} alt={recipe.title} className="h-full w-full rounded-t-2xl object-cover" />
                          ) : (
                            <span className="text-4xl opacity-60">🍳</span>
                          )}
                        </div>
                        <div className="flex flex-1 flex-col p-4">
                          <h3 className="font-semibold text-neutral-800 group-hover:text-amber-800">{recipe.title}</h3>
                          {recipe.cuisine && (
                            <span className="mt-1 text-xs font-medium text-amber-700 bg-amber-50 rounded-full px-2 py-0.5 w-fit">{recipe.cuisine}</span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </>
            );
          })() : (
            <>
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

              {/* Book folders */}
              {books.length > 0 && (
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
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    {books.map((book) => {
                      const bgMap: Record<string, string> = {
                        amber: "from-amber-50 to-amber-100/50",
                        rose: "from-rose-50 to-rose-100/50",
                        emerald: "from-emerald-50 to-emerald-100/50",
                        sky: "from-sky-50 to-sky-100/50",
                        violet: "from-violet-50 to-violet-100/50",
                        slate: "from-slate-50 to-slate-100/50",
                      };
                      const bgClass = bgMap[book.coverColor] || "from-amber-50 to-amber-100/50";
                      return (
                        <div
                          key={book.id}
                          className="group relative flex flex-col items-center gap-2 rounded-2xl border border-neutral-200 bg-gradient-to-br p-4 text-center transition-all hover:border-amber-300 hover:shadow-md cursor-pointer"
                          style={{ backgroundImage: `linear-gradient(to bottom right, var(--tw-gradient-stops))` }}
                          onClick={() => handleOpenBook(book.id)}
                        >

                          <div className={`flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br ${bgClass} text-2xl`}>
                            {book.coverEmoji}
                          </div>
                          <span className="text-sm font-semibold text-neutral-800 group-hover:text-amber-800 truncate w-full">
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
                      className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-neutral-200 p-4 text-center transition-all hover:border-amber-300 hover:bg-amber-50/30"
                    >
                      <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-neutral-100 text-2xl text-neutral-400">
                        +
                      </div>
                      <span className="text-sm font-medium text-neutral-400">New Book</span>
                    </button>
                  </div>
                </div>
              )}

              {/* All recipes card grid */}
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-400">
                🍳 All Recipes
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {recipes.map((recipe) => (
                  <button
                    key={recipe.id}
                    onClick={() => selectRecipe(recipe.id)}
                    className="group flex flex-col rounded-2xl border border-neutral-200 bg-white p-0 text-left transition-all hover:border-amber-300 hover:shadow-md"
                  >
                    <div className="flex h-36 items-center justify-center rounded-t-2xl bg-gradient-to-br from-amber-50 to-orange-50">
                      {recipe.imageUrl ? (
                        <img src={recipe.imageUrl} alt={recipe.title} className="h-full w-full rounded-t-2xl object-cover" />
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
                    <div className="flex flex-1 flex-col p-4">
                      <h3 className="font-semibold text-neutral-800 group-hover:text-amber-800">{recipe.title}</h3>
                      {recipe.cuisine && (
                        <span className="mt-1 text-xs font-medium text-amber-700 bg-amber-50 rounded-full px-2 py-0.5 w-fit">{recipe.cuisine}</span>
                      )}
                      {recipe.description && (
                        <p className="mt-2 line-clamp-2 text-xs text-neutral-500 leading-relaxed">{recipe.description}</p>
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
            </>
          )}
        </div>
        {createBookModalEl}
      {shareModalEl}
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

        {/* Book */}
        <BookSelector
          currentBookId={selectedRecipe.bookId ?? null}
          onSave={handleBookChange}
        />

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
          onSetCover={async (photoUrl) => {
            if (!selectedRecipe) return;
            await fetch(`/api/recipes/${selectedRecipe.id}/photos`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ photoUrl }),
            });
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

        {/* Share + Delete */}
        <div className="border-t border-neutral-200 pt-6 pb-20 md:pb-6 space-y-3">
          <button
            onClick={() => setShowShareModal({ type: "recipe", id: selectedRecipe.id, name: selectedRecipe.title })}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm font-medium text-neutral-700 transition-colors hover:border-amber-300 hover:bg-amber-50"
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
    </div>
  );
}
