"use client";

import { useState, useCallback } from "react";
import { Star } from "lucide-react";
import { SaveIndicator } from "@/components/ui/SaveIndicator";

interface RatingSectionProps {
  authenticityRating: number | null;
  tasteRating: number | null;
  nostalgiaRating: number | null;
  onSave: (
    field: "authenticityRating" | "tasteRating" | "nostalgiaRating",
    value: number | null
  ) => Promise<void>;
}

function StarRating({
  label,
  value,
  onChange,
  isSaving,
}: {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  isSaving: boolean;
}) {
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <div className="flex items-center gap-3">
      <span className="min-w-[70px] text-xs font-medium text-neutral-600">
        {label}
      </span>
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            title={`${star} star${star !== 1 ? "s" : ""}`}
            className={`rounded-md p-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-focus ${
              star <= (hovered ?? value ?? 0)
                ? "text-ui-accent/70 hover:text-ui-accent"
                : "text-neutral-300 hover:text-ui-accent/50"
            }`}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(null)}
            onClick={() => onChange(value === star ? null : star)}
            aria-label={`${star} star${star !== 1 ? "s" : ""}`}
            aria-pressed={star <= (value ?? 0)}
          >
            <Star
              className="h-5 w-5"
              fill={star <= (hovered ?? value ?? 0) ? "currentColor" : "none"}
              aria-hidden="true"
            />
          </button>
        ))}
      </div>
      {value && (
        <span className="text-xs text-neutral-500">({value}/5)</span>
      )}
      <SaveIndicator isSaving={isSaving} />
    </div>
  );
}

export function RatingSection({
  authenticityRating,
  tasteRating,
  nostalgiaRating,
  onSave,
}: RatingSectionProps) {
  const [savingField, setSavingField] = useState<string | null>(null);

  const handleChange = useCallback(
    async (
      field: "authenticityRating" | "tasteRating" | "nostalgiaRating",
      value: number | null
    ) => {
      setSavingField(field);
      try {
        await onSave(field, value);
      } finally {
        setSavingField(null);
      }
    },
    [onSave]
  );

  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-5">
      <h3 className="mb-3 text-sm font-semibold text-neutral-800">
        Ratings
      </h3>
      <div className="space-y-2">
        <StarRating
          label="Authenticity"
          value={authenticityRating}
          onChange={(v) => handleChange("authenticityRating", v)}
          isSaving={savingField === "authenticityRating"}
        />
        <StarRating
          label="Taste"
          value={tasteRating}
          onChange={(v) => handleChange("tasteRating", v)}
          isSaving={savingField === "tasteRating"}
        />
        <StarRating
          label="Nostalgia"
          value={nostalgiaRating}
          onChange={(v) => handleChange("nostalgiaRating", v)}
          isSaving={savingField === "nostalgiaRating"}
        />
      </div>
    </section>
  );
}
