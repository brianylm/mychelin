"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GitFork } from "lucide-react";

interface ForkButtonProps {
  recipeId: string;
}

export default function ForkButton({ recipeId }: ForkButtonProps) {
  const [isForking, setIsForking] = useState(false);
  const router = useRouter();

  async function handleFork() {
    if (isForking) return;
    setIsForking(true);

    try {
      const res = await fetch(`/api/recipes/${recipeId}/fork`, {
        method: "POST",
      });

      if (res.ok) {
        const { id } = await res.json();
        router.push(`/recipes/${id}`);
      }
    } catch {
      // silently fail
    } finally {
      setIsForking(false);
    }
  }

  return (
    <button
      onClick={handleFork}
      disabled={isForking}
      className="flex items-center gap-2 px-5 py-2.5 bg-stone-100 text-stone-700 rounded-xl text-base font-medium hover:bg-stone-200 transition-colors disabled:opacity-50"
    >
      <GitFork className="w-4 h-4" />
      {isForking ? "Forking…" : "Fork"}
    </button>
  );
}
