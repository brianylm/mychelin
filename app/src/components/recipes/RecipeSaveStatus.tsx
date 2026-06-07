"use client";

import { useEffect, useRef, useState } from "react";
import { CheckIcon, ReloadIcon } from "@radix-ui/react-icons";
import { formatDateTime } from "@/lib/utils";

interface RecipeSaveStatusProps {
  isSaving: boolean;
  updatedAt: string;
  onSaveNow: () => void;
}

// Inline status row shown above the editable recipe body. It stays visually
// quiet so it does not read as a second panel below the top navigation.
export function RecipeSaveStatus({ isSaving, updatedAt, onSaveNow }: RecipeSaveStatusProps) {
  // Debounce the "just saved" glow so it's visible even when saves are fast.
  const [justSaved, setJustSaved] = useState(false);
  const prevSavingRef = useRef(isSaving);

  useEffect(() => {
    const completedSave = prevSavingRef.current && !isSaving;
    prevSavingRef.current = isSaving;

    if (!completedSave) return;

    const showTimer = window.setTimeout(() => {
      setJustSaved(true);
    }, 0);
    const hideTimer = window.setTimeout(() => {
      setJustSaved(false);
    }, 1500);

    return () => {
      window.clearTimeout(showTimer);
      window.clearTimeout(hideTimer);
    };
  }, [isSaving]);

  return (
    <div className="-mx-1 mb-2 flex items-center justify-between gap-3 px-1 text-xs">
      <div className="flex items-center gap-2 text-xs">
        {isSaving ? (
          <>
            <ReloadIcon className="h-3 w-3 animate-spin text-[#800020]" />
            <span className="font-medium text-[#800020]">Saving…</span>
          </>
        ) : (
          <>
            <div
              className={`flex h-4 w-4 items-center justify-center rounded-full transition-colors ${
                justSaved ? "bg-emerald-500" : "bg-emerald-100"
              }`}
            >
              <CheckIcon
                className={`h-3 w-3 ${
                  justSaved ? "text-white" : "text-emerald-600"
                }`}
              />
            </div>
            <span className="font-medium text-neutral-700">
              {justSaved ? "Saved" : "All changes saved"}
            </span>
            <span className="text-neutral-400">· {formatDateTime(updatedAt)}</span>
          </>
        )}
      </div>
      <button
        onClick={onSaveNow}
        className="rounded-lg border border-[#800020]/30 bg-[#800020]/5 px-3 py-1 text-xs font-medium text-[#521224] transition-colors hover:bg-[#800020]/10"
      >
        Save now
      </button>
    </div>
  );
}
