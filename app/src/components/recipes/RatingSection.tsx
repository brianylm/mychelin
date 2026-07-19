"use client";

import { useState, useCallback } from "react";
import { IconButton, Tooltip } from "@radix-ui/themes";
import { StarIcon, StarFilledIcon } from "@radix-ui/react-icons";
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
    <div className="grid gap-2 py-3 sm:grid-cols-[7rem_minmax(0,1fr)_auto] sm:items-center">
      <span className="text-sm font-medium text-[var(--ui-text)]">{label}</span>
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Tooltip key={star} content={`${star} star${star !== 1 ? "s" : ""}`}>
            <IconButton
              variant="ghost"
              size="1"
              className={`!h-11 !w-11 !p-0 transition-colors ${
                star <= (hovered ?? value ?? 0)
                  ? "text-[#800020]/70 hover:text-[#800020]"
                  : "text-neutral-300 hover:text-[#800020]/50"
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
      <div className="flex min-h-6 items-center gap-2 text-xs text-[var(--ui-muted)]">
        {value ? <span>{value}/5</span> : <span>Not rated</span>}
        <SaveIndicator isSaving={isSaving} />
      </div>
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
    <section className="border-t border-[var(--ui-border)] pt-5">
      <h3 className="mb-3 text-sm font-semibold text-neutral-800">
        Ratings
      </h3>
      <div className="divide-y divide-[var(--ui-border)]">
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
