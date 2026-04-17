"use client";

import { useState, useEffect } from "react";

interface ForkedFromBadgeProps {
  forkedFrom: string;
  onNavigate?: (recipeId: number) => void;
}

// forkedFrom can be:
//   "57"            — legacy format (just the ID)
//   "57:Nasi Lemak" — new format (ID + original title, for cross-user saves)
function parseForkedFrom(raw: string): { id: number; title: string | null } {
  const colonIdx = raw.indexOf(":");
  if (colonIdx > 0) {
    const id = parseInt(raw.slice(0, colonIdx));
    const title = raw.slice(colonIdx + 1).trim();
    return { id: id || 0, title: title || null };
  }
  return { id: parseInt(raw) || 0, title: null };
}

export function ForkedFromBadge({ forkedFrom, onNavigate }: ForkedFromBadgeProps) {
  const { id: originalId, title: embeddedTitle } = parseForkedFrom(forkedFrom);
  const [fetchedTitle, setFetchedTitle] = useState<string | null>(null);

  useEffect(() => {
    if (!originalId || embeddedTitle) return;
    fetch(`/api/recipes/${originalId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.title) setFetchedTitle(data.title);
      })
      .catch(() => {});
  }, [originalId, embeddedTitle]);

  if (!originalId) return null;

  const displayTitle = embeddedTitle || fetchedTitle || `Recipe #${originalId}`;

  return (
    <div className="flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="18" r="3"/>
        <circle cx="6" cy="6" r="3"/>
        <circle cx="18" cy="6" r="3"/>
        <path d="M18 9v2a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V9"/>
        <line x1="12" y1="12" x2="12" y2="15"/>
      </svg>
      <span>Saved from{" "}</span>
      {onNavigate ? (
        <button
          onClick={() => onNavigate(originalId)}
          className="font-medium underline underline-offset-2 hover:text-amber-900"
        >
          {displayTitle}
        </button>
      ) : (
        <span className="font-medium">{displayTitle}</span>
      )}
    </div>
  );
}
