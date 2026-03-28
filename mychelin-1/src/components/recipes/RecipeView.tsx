"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@radix-ui/themes";
import { useQueryClient } from "@tanstack/react-query";
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
      <SpeedDialFAB onDelete={handleDelete} />
    </div>
  );
}
