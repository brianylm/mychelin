"use client";

import { useState } from "react";
import { useToast } from "@/context/ToastContext";

interface RecipeForkButtonProps {
  recipeId: number;
  recipeTitle: string;
  onForked?: (forkedRecipeId: number) => void;
  variant?: "default" | "compact";
}

interface ForkedRecipe {
  id: number;
  title: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isForkedRecipe(value: unknown): value is ForkedRecipe {
  return (
    isRecord(value) &&
    typeof value.id === "number" &&
    typeof value.title === "string"
  );
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function RecipeForkButton({ recipeId, recipeTitle, onForked, variant = "default" }: RecipeForkButtonProps) {
  const { addToast } = useToast();
  const [forking, setForking] = useState(false);

  const handleFork = async () => {
    if (!confirm(`Fork "${recipeTitle}"? A copy will be added to your recipes.`)) return;
    setForking(true);
    try {
      const res = await fetch(`/api/recipes/${recipeId}/fork`, { method: "POST" });
      if (!res.ok) {
        const err: unknown = await res.json();
        throw new Error(
          isRecord(err) && typeof err.error === "string"
            ? err.error
            : "Failed to fork recipe"
        );
      }
      const forked: unknown = await res.json();
      if (!isForkedRecipe(forked)) throw new Error("Failed to fork recipe");
      addToast(`"${forked.title}" forked successfully!`, "success");
      onForked?.(forked.id);
    } catch (error) {
      addToast(errorMessage(error, "Failed to fork recipe"), "error");
    } finally {
      setForking(false);
    }
  };

  if (variant === "compact") {
    return (
      <button
        onClick={handleFork}
        disabled={forking}
        className="opacity-0 group-hover:opacity-100 flex items-center justify-center rounded-md p-1 text-ui-muted transition-all hover:bg-ui-accent/5 hover:text-ui-accent disabled:opacity-50"
        title="Fork this recipe to your collection"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="18" r="3"/>
          <circle cx="6" cy="6" r="3"/>
          <circle cx="18" cy="6" r="3"/>
          <path d="M18 9v2a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V9"/>
          <line x1="12" y1="12" x2="12" y2="15"/>
        </svg>
      </button>
    );
  }

  return (
    <button
      onClick={handleFork}
      disabled={forking}
      className="flex w-full items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm font-medium text-neutral-700 transition-colors hover:border-ui-accent/30 hover:bg-ui-accent/5 disabled:opacity-50"
      title="Fork this recipe to your own collection"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="18" r="3"/>
        <circle cx="6" cy="6" r="3"/>
        <circle cx="18" cy="6" r="3"/>
        <path d="M18 9v2a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V9"/>
        <line x1="12" y1="12" x2="12" y2="15"/>
      </svg>
      {forking ? "Forking…" : "Fork Recipe"}
    </button>
  );
}
