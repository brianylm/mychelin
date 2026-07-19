"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  Recipe,
  Ingredient,
  Instruction,
  VoiceRecording,
  RecipePhoto,
} from "@/db/schema";
import type { RecipeFlag } from "@/lib/recipe-flags";

export interface RecipeWithFlags extends Recipe {
  recipeFlags?: RecipeFlag[];
}

// Extended recipe type with relations
export interface RecipeWithRelations extends RecipeWithFlags {
  ingredients: Ingredient[];
  instructions: Instruction[];
  voiceRecordings?: VoiceRecording[];
  photos?: RecipePhoto[];
}

interface RecipeStoreValue {
  recipes: RecipeWithFlags[];
  loading: boolean;
  error: string | null;
  selectedRecipeId: number | null;
  selectedRecipe: RecipeWithRelations | null;
  // Id of the recipe that was just created via createRecipe(). RecipeView
  // reads this to auto-focus the title input so the user can immediately
  // rename a freshly created recipe inline. Caller clears it once consumed.
  justCreatedRecipeId: number | null;
  clearJustCreated: () => void;
  selectRecipe: (id: number | null) => void;
  createRecipe: (title?: string) => Promise<void>;
  updateRecipe: (
    id: number,
    data: Partial<Recipe> & { recipeFlags?: RecipeFlag[] }
  ) => Promise<void>;
  deleteRecipe: (id: number) => Promise<void>;
  addIngredient: (
    recipeId: number,
    data: {
      name: string;
      quantity?: number;
      unit?: string;
      approximate?: boolean;
      quantityText?: string;
      notes?: string;
    }
  ) => Promise<void>;
  updateIngredient: (
    recipeId: number,
    ingredientId: number,
    data: Partial<Ingredient>
  ) => Promise<void>;
  deleteIngredient: (recipeId: number, ingredientId: number) => Promise<void>;
  addInstruction: (
    recipeId: number,
    data: { content: string; tip?: string }
  ) => Promise<void>;
  updateInstruction: (
    recipeId: number,
    instructionId: number,
    data: Partial<Instruction>
  ) => Promise<void>;
  deleteInstruction: (
    recipeId: number,
    instructionId: number
  ) => Promise<void>;
}

const RecipeStoreContext = createContext<RecipeStoreValue>(null!);

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

export function RecipeStoreProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const [selectedRecipeId, setSelectedRecipeId] = useState<number | null>(() => {
    if (typeof window === "undefined") return null;
    const rawRecipeId = new URLSearchParams(window.location.search).get("recipe");
    const recipeId = rawRecipeId ? Number(rawRecipeId) : NaN;
    return Number.isInteger(recipeId) && recipeId > 0 ? recipeId : null;
  });
  const [justCreatedRecipeId, setJustCreatedRecipeId] = useState<number | null>(null);
  const hasMountedRef = useRef(false);

  // Fetch all recipes (list)
  const {
    data: recipes = [],
    isLoading,
    error: recipesError,
  } = useQuery<RecipeWithFlags[]>({
    queryKey: ["recipes"],
    queryFn: () => fetchJson("/api/recipes"),
  });

  // Fetch selected recipe with relations
  const { data: fetchedRecipe = null } = useQuery<RecipeWithRelations | null>(
    {
      queryKey: ["recipe", selectedRecipeId],
      queryFn: () =>
        selectedRecipeId
          ? fetchJson<RecipeWithRelations>(`/api/recipes/${selectedRecipeId}`)
          : null,
      enabled: selectedRecipeId !== null,
      staleTime: 30_000,
      // Don't keep previous recipe's data when switching to a different recipe
      placeholderData: undefined,
    }
  );

  // Optimistic: use list data as placeholder while full recipe loads
  // Only use fetchedRecipe if it matches the currently selected ID
  const validFetchedRecipe =
    fetchedRecipe && fetchedRecipe.id === selectedRecipeId
      ? fetchedRecipe
      : null;

  const selectedRecipe: RecipeWithRelations | null = validFetchedRecipe
    ? validFetchedRecipe
    : selectedRecipeId
      ? (() => {
          const listItem = recipes.find((r) => r.id === selectedRecipeId);
          return listItem
            ? { ...listItem, ingredients: [], instructions: [], voiceRecordings: [], photos: [] }
            : null;
        })()
      : null;

  // Mutations
  const createMutation = useMutation({
    mutationFn: (title: string) =>
      fetchJson<RecipeWithFlags>("/api/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // New recipes start as drafts (F1). They get auto-promoted to
        // "active" in RecipeView as soon as they have a real title and
        // at least one ingredient or instruction — until then, they sit
        // in the Drafts section of the sidebar instead of polluting the
        // main recipe list.
        body: JSON.stringify({ title, status: "draft" }),
      }),
    onSuccess: (data: RecipeWithFlags) => {
      qc.invalidateQueries({ queryKey: ["recipes"] });
      // Auto-select the newly created recipe and flag it as just-created
      // so the recipe view can auto-focus the title input.
      setSelectedRecipeId(data.id);
      setJustCreatedRecipeId(data.id);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Recipe> & { recipeFlags?: RecipeFlag[] } }) =>
      fetchJson(`/api/recipes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: (data, vars) => {
      // Immediately update the detail cache with the PATCH response so
      // updatedAt (and any other changed fields) are visible in the
      // same render cycle as isSaving→false. Without this, the UI
      // briefly shows the old timestamp because the background refetch
      // triggered by invalidateQueries hasn't completed yet.
      qc.setQueryData(["recipe", vars.id], data);
      qc.invalidateQueries({ queryKey: ["recipes"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      fetchJson(`/api/recipes/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["recipes"] });
      setSelectedRecipeId(null);
    },
  });

  // Ingredient mutations
  const addIngredientMutation = useMutation({
    mutationFn: ({
      recipeId,
      data,
    }: {
      recipeId: number;
      data: {
        name: string;
        quantity?: number;
        unit?: string;
        approximate?: boolean;
        quantityText?: string;
        notes?: string;
      };
    }) =>
      fetchJson(`/api/recipes/${recipeId}/ingredients`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["recipe", vars.recipeId] });
      // Also refresh the sidebar list — the server may have auto-promoted
      // this recipe from draft to active on insert.
      qc.invalidateQueries({ queryKey: ["recipes"] });
    },
  });

  const updateIngredientMutation = useMutation({
    mutationFn: ({
      recipeId,
      ingredientId,
      data,
    }: {
      recipeId: number;
      ingredientId: number;
      data: Partial<Ingredient>;
    }) =>
      fetchJson(`/api/recipes/${recipeId}/ingredients/${ingredientId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["recipe", vars.recipeId] });
    },
  });

  const deleteIngredientMutation = useMutation({
    mutationFn: ({
      recipeId,
      ingredientId,
    }: {
      recipeId: number;
      ingredientId: number;
    }) =>
      fetchJson(`/api/recipes/${recipeId}/ingredients/${ingredientId}`, {
        method: "DELETE",
      }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["recipe", vars.recipeId] });
    },
  });

  // Instruction mutations
  const addInstructionMutation = useMutation({
    mutationFn: ({
      recipeId,
      data,
    }: {
      recipeId: number;
      data: { content: string; tip?: string };
    }) =>
      fetchJson(`/api/recipes/${recipeId}/instructions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["recipe", vars.recipeId] });
      // Also refresh the sidebar list — the server may have auto-promoted
      // this recipe from draft to active on insert, and the list needs to
      // reflect that so the recipe moves out of the Drafts section.
      qc.invalidateQueries({ queryKey: ["recipes"] });
    },
  });

  const updateInstructionMutation = useMutation({
    mutationFn: ({
      recipeId,
      instructionId,
      data,
    }: {
      recipeId: number;
      instructionId: number;
      data: Partial<Instruction>;
    }) =>
      fetchJson(`/api/recipes/${recipeId}/instructions/${instructionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["recipe", vars.recipeId] });
    },
  });

  const deleteInstructionMutation = useMutation({
    mutationFn: ({
      recipeId,
      instructionId,
    }: {
      recipeId: number;
      instructionId: number;
    }) =>
      fetchJson(`/api/recipes/${recipeId}/instructions/${instructionId}`, {
        method: "DELETE",
      }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["recipe", vars.recipeId] });
    },
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }
    const url = new URL(window.location.href);
    const current = url.searchParams.get("recipe");
    const next = selectedRecipeId ? String(selectedRecipeId) : null;

    if (next && current !== next) {
      url.searchParams.set("recipe", next);
      window.history.replaceState(window.history.state, "", url.toString());
    } else if (!next && current !== null) {
      url.searchParams.delete("recipe");
      window.history.replaceState(window.history.state, "", url.toString());
    }
  }, [selectedRecipeId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handlePopState = () => {
      const rawRecipeId = new URLSearchParams(window.location.search).get("recipe");
      const recipeId = rawRecipeId ? Number(rawRecipeId) : NaN;
      setSelectedRecipeId(Number.isInteger(recipeId) && recipeId > 0 ? recipeId : null);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Stable callbacks
  const selectRecipe = useCallback((id: number | null) => {
    setSelectedRecipeId(id);
  }, []);

  const createRecipe = useCallback(
    async (title?: string) => {
      await createMutation.mutateAsync(title?.trim() || "Untitled recipe");
    },
    [createMutation]
  );

  const clearJustCreated = useCallback(() => {
    setJustCreatedRecipeId(null);
  }, []);

  const updateRecipe = useCallback(
    async (id: number, data: Partial<Recipe> & { recipeFlags?: RecipeFlag[] }) => {
      await updateMutation.mutateAsync({ id, data });
    },
    [updateMutation]
  );

  const deleteRecipe = useCallback(
    async (id: number) => {
      await deleteMutation.mutateAsync(id);
    },
    [deleteMutation]
  );

  const addIngredient = useCallback(
    async (
      recipeId: number,
      data: {
        name: string;
        quantity?: number;
        unit?: string;
        approximate?: boolean;
        quantityText?: string;
        notes?: string;
      }
    ) => {
      await addIngredientMutation.mutateAsync({ recipeId, data });
    },
    [addIngredientMutation]
  );

  const updateIngredient = useCallback(
    async (
      recipeId: number,
      ingredientId: number,
      data: Partial<Ingredient>
    ) => {
      await updateIngredientMutation.mutateAsync({
        recipeId,
        ingredientId,
        data,
      });
    },
    [updateIngredientMutation]
  );

  const deleteIngredient = useCallback(
    async (recipeId: number, ingredientId: number) => {
      await deleteIngredientMutation.mutateAsync({ recipeId, ingredientId });
    },
    [deleteIngredientMutation]
  );

  const addInstruction = useCallback(
    async (recipeId: number, data: { content: string; tip?: string }) => {
      await addInstructionMutation.mutateAsync({ recipeId, data });
    },
    [addInstructionMutation]
  );

  const updateInstruction = useCallback(
    async (
      recipeId: number,
      instructionId: number,
      data: Partial<Instruction>
    ) => {
      await updateInstructionMutation.mutateAsync({
        recipeId,
        instructionId,
        data,
      });
    },
    [updateInstructionMutation]
  );

  const deleteInstruction = useCallback(
    async (recipeId: number, instructionId: number) => {
      await deleteInstructionMutation.mutateAsync({
        recipeId,
        instructionId,
      });
    },
    [deleteInstructionMutation]
  );

  return (
    <RecipeStoreContext.Provider
      value={{
        recipes,
        loading: isLoading,
        error: recipesError ? String(recipesError) : null,
        selectedRecipeId,
        selectedRecipe,
        justCreatedRecipeId,
        clearJustCreated,
        selectRecipe,
        createRecipe,
        updateRecipe,
        deleteRecipe,
        addIngredient,
        updateIngredient,
        deleteIngredient,
        addInstruction,
        updateInstruction,
        deleteInstruction,
      }}
    >
      {children}
    </RecipeStoreContext.Provider>
  );
}

export function useRecipeStore() {
  const ctx = useContext(RecipeStoreContext);
  if (!ctx) throw new Error("useRecipeStore must be inside RecipeStoreProvider");
  return ctx;
}
