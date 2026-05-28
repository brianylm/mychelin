"use client";

import { useState } from "react";
import { useToast } from "@/context/ToastContext";

interface RecipeForkButtonProps {
  recipeId: number;
  recipeTitle: string;
  onForked?: (forkedRecipeId: number) => void;
  variant?: "default" | "compact";
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
        const err = await res.json();
        throw new Error(err.error || "Failed to fork recipe");
      }
      const forked = await res.json();
      addToast(`"${forked.title}" forked successfully!`, "success");
      onForked?.(forked.id);
    } catch (error: any) {
      addToast(error.message || "Failed to fork recipe", "error");
    } finally {
      setForking(false);
    }
  };

  if (variant === "compact") {
    return (
      <button
        onClick={handleFork}
        disabled={forking}
        className="opacity-0 group-hover:opacity-100 flex items-center justify-center rounded-md p-1 text-neutral-400 transition-all hover:bg-[#800020]/5 hover:text-[#800020] disabled:opacity-50"
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
      className="flex w-full items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm font-medium text-neutral-700 transition-colors hover:border-[#800020]/30 hover:bg-[#800020]/5 disabled:opacity-50"
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
