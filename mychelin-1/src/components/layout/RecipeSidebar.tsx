"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { useRecipeStore } from "@/store/RecipeStore";
import { RecipeSearchHeader } from "./sidebar/RecipeSearchHeader";
import { RecipeListItem } from "./sidebar/RecipeListItem";
import { SidebarToolbar } from "./sidebar/SidebarToolbar";
import { CreateRecipeForm } from "./sidebar/CreateRecipeForm";

interface RecipeSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onOpen: () => void;
}

export function RecipeSidebar({ isOpen, onClose, onOpen }: RecipeSidebarProps) {
  const {
    recipes,
    loading,
    error,
    selectedRecipeId,
    selectRecipe,
    createRecipe,
    deleteRecipe,
  } = useRecipeStore();

  const [query, setQuery] = useState("");
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [creationError, setCreationError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const filteredRecipes = recipes.filter((r) =>
    r.title.toLowerCase().includes(query.toLowerCase())
  );

  const handleCreate = async () => {
    if (!draftName.trim()) return;
    setIsSaving(true);
    setCreationError(null);
    try {
      await createRecipe(draftName.trim());
      setIsCreating(false);
      setDraftName("");
      onClose();
    } catch (err) {
      setCreationError(
        err instanceof Error ? err.message : "Failed to create recipe"
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          role="presentation"
          className="fixed inset-0 z-30 bg-neutral-950/40 backdrop-blur-sm md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-[85vw] max-w-sm flex-col border-r border-neutral-200 bg-white shadow-xl transition-transform md:static md:z-auto md:h-full md:w-80 md:translate-x-0 md:shadow-none",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Header + search + toolbar */}
        <div className="space-y-3 border-b border-neutral-200 px-5 py-3">
          <RecipeSearchHeader
            query={query}
            onQueryChange={setQuery}
            isExpanded={isSearchExpanded}
            onExpandToggle={setIsSearchExpanded}
            onClose={onClose}
          />

          {(loading || error) && (
            <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-600">
              {loading ? "Loading recipes…" : error}
            </div>
          )}

          <SidebarToolbar
            onCreateOpen={() => {
              setIsCreating(true);
              onOpen();
            }}
          />

          {isCreating && (
            <CreateRecipeForm
              name={draftName}
              onNameChange={setDraftName}
              error={creationError}
              isSaving={isSaving}
              onSave={handleCreate}
              onCancel={() => {
                setIsCreating(false);
                setDraftName("");
                setCreationError(null);
              }}
            />
          )}
        </div>

        {/* Recipe list */}
        <div className="flex-1 overflow-y-auto px-2 py-3">
          {filteredRecipes.length === 0 && !loading ? (
            <p className="px-3 py-6 text-center text-sm text-neutral-500">
              {query ? "No recipes match your search." : "No recipes yet. Create one!"}
            </p>
          ) : (
            <ul className="space-y-0.5">
              {filteredRecipes.map((recipe) => (
                <RecipeListItem
                  key={recipe.id}
                  recipe={recipe}
                  isSelected={selectedRecipeId === recipe.id}
                  onSelect={(id) => {
                    selectRecipe(id);
                    onClose();
                  }}
                  onDelete={deleteRecipe}
                />
              ))}
            </ul>
          )}
        </div>
      </aside>
    </>
  );
}
