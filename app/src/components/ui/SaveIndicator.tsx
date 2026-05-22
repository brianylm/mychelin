"use client";

import { useEffect, useState } from "react";
import { Spinner } from "@radix-ui/themes";

interface SaveIndicatorProps {
  isSaving: boolean;
}

export function SaveIndicator({ isSaving }: SaveIndicatorProps) {
  const [showCheckmark, setShowCheckmark] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isSaving) {
      setIsVisible(true);
      setShowCheckmark(false);
    } else if (isVisible && !isSaving) {
      setShowCheckmark(true);
      const timer = setTimeout(() => setIsVisible(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isSaving, isVisible]);

  if (!isVisible) return null;

  return (
    <div className="inline-flex items-center">
      {!showCheckmark ? (
        <Spinner size="1" />
      ) : (
        <div className="animate-fade-out">
          <svg
            className="h-4 w-4 text-green-500"
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
