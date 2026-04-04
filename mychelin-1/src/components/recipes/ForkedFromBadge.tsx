"use client";

import { useState, useEffect } from "react";

interface ForkedFromBadgeProps {
  forkedFrom: string;
  onNavigate?: (recipeId: number) => void;
}

export function ForkedFromBadge({ forkedFrom, onNavigate }: ForkedFromBadgeProps) {
  const [originalTitle, setOriginalTitle] = useState<string | null>(null);
  const originalId = parseInt(forkedFrom);

  useEffect(() => {
    if (!originalId) return;
    fetch(`/api/recipes/${originalId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.title) setOriginalTitle(data.title);
      })
      .catch(() => {});
  }, [originalId]);

  if (!originalId) return null;

  return (
    <div className="flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="18" r="3"/>
        <circle cx="6" cy="6" r="3"/>
        <circle cx="18" cy="6" r="3"/>
        <path d="M18 9v2a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V9"/>
        <line x1="12" y1="12" x2="12" y2="15"/>
      </svg>
      <span>Forked from{" "}</span>
      {onNavigate ? (
        <button
          onClick={() => onNavigate(originalId)}
          className="font-medium underline underline-offset-2 hover:text-amber-900"
        >
          {originalTitle ?? `Recipe #${originalId}`}
        </button>
      ) : (
        <span className="font-medium">{originalTitle ?? `Recipe #${originalId}`}</span>
      )}
    </div>
  );
}
