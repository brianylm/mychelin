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
import { SpeedDialFAB } from "./SpeedDialFAB";
import { PhotoUploadSection, type RecipePhoto } from "./PhotoUploadSection";
import { CulturalContextCard } from "@/components/heritage/CulturalContextCard";
import { VoiceRecording, type VoiceClip } from "@/components/heritage/VoiceRecording";
import { LanguageToggle } from "@/components/heritage/LanguageToggle";
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
  } = useRecipeStore();
  const { addToast } = useToast();
  const qc = useQueryClient();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [cuisine, setCuisine] = useState("");
  const [savingTitle, setSavingTitle] = useState(false);
  const [savingDescription, setSavingDescription] = useState(false);
  const [savingCuisine, setSavingCuisine] = useState(false);

  const [currentLang, setCurrentLang] = useState("English");

  // Sync local state with selected recipe
  useEffect(() => {
    if (selectedRecipe) {
      setTitle(selectedRecipe.title);
      setDescription(selectedRecipe.description ?? "");
      setCuisine(selectedRecipe.cuisine ?? "");
    }
  }, [selectedRecipe]);

  const handleBlur = useCallback(
    async (field: "title" | "description" | "cuisine") => {
      if (!selectedRecipe) return;

      const setters = {
        title: setSavingTitle,
        description: setSavingDescription,
        cuisine: setSavingCuisine,
      };
      const values = { title, description, cuisine };
      const originals = {
        title: selectedRecipe.title,
        description: selectedRecipe.description ?? "",
        cuisine: selectedRecipe.cuisine ?? "",
      };

      if (values[field] === originals[field]) return;

      setters[field](true);
      try {
        await updateRecipe(selectedRecipe.id, {
          [field]: values[field] || null,
        });
      } catch {
        addToast(`Failed to save ${field}`, "error");
      } finally {
        setters[field](false);
      }
    },
    [selectedRecipe, title, description, cuisine, updateRecipe, addToast]
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

  // No recipe selected — empty state
  if (!selectedRecipe) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-surface px-6 py-8 text-neutral-500">
        <div className="mx-auto max-w-md text-center">
          <div className="mb-4 text-5xl">🍜</div>
          <h2 className="text-lg font-semibold text-neutral-800">
            Welcome to Mychelin
          </h2>
          <p className="mt-2 text-sm">
            Preserve your family&apos;s food heritage. Create a recipe to
            capture the dishes, stories, and traditions that matter.
          </p>
          <Button
            onClick={onOpenSidebar}
            variant="solid"
            size="3"
            className="mt-6"
          >
            Browse recipes
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex-1 overflow-y-auto bg-surface">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-5 py-6">
        {/* Language toggle */}
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-medium uppercase tracking-wide text-neutral-500">
            Recipe View
          </h2>
          <LanguageToggle
            currentLang={currentLang}
            onToggle={setCurrentLang}
            availableLanguages={["English", "中文"]}
          />
        </div>

        {/* Core recipe info */}
        <RecipeHeader
          recipe={selectedRecipe}
          title={title}
          onTitleChange={setTitle}
          description={description}
          onDescriptionChange={setDescription}
          cuisine={cuisine}
          onCuisineChange={setCuisine}
          onBlur={handleBlur}
          savingTitle={savingTitle}
          savingDescription={savingDescription}
          savingCuisine={savingCuisine}
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
      </div>

      {/* Speed Dial FAB */}
      <SpeedDialFAB onDelete={handleDelete} />
    </div>
  );
}
