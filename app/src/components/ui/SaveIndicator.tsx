"use client";

import { useEffect, useState } from "react";
import { Spinner } from "./Spinner";

interface SaveIndicatorProps {
  isSaving: boolean;
}

export function SaveIndicator({ isSaving }: SaveIndicatorProps) {
  const [phase, setPhase] = useState<"hidden" | "saving" | "saved">(
    isSaving ? "saving" : "hidden"
  );
  const [wasSaving, setWasSaving] = useState(isSaving);

  // Derive the phase from the saving→saved transition during render rather
  // than in an effect; only the timed fade-out needs an effect.
  if (isSaving !== wasSaving) {
    setWasSaving(isSaving);
    setPhase(isSaving ? "saving" : "saved");
  }

  useEffect(() => {
    if (phase !== "saved") return;
    const timer = setTimeout(() => setPhase("hidden"), 2000);
    return () => clearTimeout(timer);
  }, [phase]);

  if (phase === "hidden") return null;

  return (
    <div className="inline-flex items-center">
      {phase === "saving" ? (
        <Spinner label="Saving" className="text-ui-muted" />
      ) : (
        <div className="animate-fade-out">
          <svg
            className="h-4 w-4 text-ui-success"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
      )}
    </div>
  );
}
