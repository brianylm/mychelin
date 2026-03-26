"use client";

import { useState, useCallback } from "react";
import { IconButton, Tooltip } from "@radix-ui/themes";
import { StarIcon, StarFilledIcon } from "@radix-ui/react-icons";
import { SaveIndicator } from "@/components/ui/SaveIndicator";

interface RatingSectionProps {
  tasteRating: number | null;
  visualRating: number | null;
  textureRating: number | null;
  onSave: (
    field: "tasteRating" | "visualRating" | "textureRating",
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
          <Tooltip key={star} content={`${star} star${star !== 1 ? "s" : ""}`}>
            <IconButton
              variant="ghost"
              size="1"
              className={`!h-auto !p-1 transition-colors ${
                star <= (hovered ?? value ?? 0)
                  ? "text-amber-400 hover:text-amber-500"
                  : "text-neutral-300 hover:text-amber-300"
              }`}
              onMouseEnter={() => setHovered(star)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => onChange(value === star ? null : star)}
              aria-label={`${star} star${star !== 1 ? "s" : ""}`}
            >
              {star <= (hovered ?? value ?? 0) ? (
                <StarFilledIcon className="h-5 w-5" />
              ) : (
                <StarIcon className="h-5 w-5" />
              )}
            </IconButton>
          </Tooltip>
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
  tasteRating,
  visualRating,
  textureRating,
  onSave,
}: RatingSectionProps) {
  const [savingField, setSavingField] = useState<string | null>(null);

  const handleChange = useCallback(
    async (
      field: "tasteRating" | "visualRating" | "textureRating",
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
          label="Taste"
          value={tasteRating}
          onChange={(v) => handleChange("tasteRating", v)}
          isSaving={savingField === "tasteRating"}
        />
        <StarRating
          label="Visual"
          value={visualRating}
          onChange={(v) => handleChange("visualRating", v)}
          isSaving={savingField === "visualRating"}
        />
        <StarRating
          label="Texture"
          value={textureRating}
          onChange={(v) => handleChange("textureRating", v)}
          isSaving={savingField === "textureRating"}
        />
      </div>
    </section>
  );
}
