"use client";

import { StarFilledIcon, StarIcon } from "@radix-ui/react-icons";

interface HalfStarRatingProps {
  value: number | null;
  onChange: (value: number) => void;
  ariaLabel: string;
  disabled?: boolean;
  size?: "sm" | "md";
  leftLabel?: string;
  rightLabel?: string;
}

const sizeClasses = {
  sm: {
    button: "h-8 w-8",
    icon: "h-7 w-7",
  },
  md: {
    button: "h-10 w-10",
    icon: "h-9 w-9",
  },
};

export function HalfStarRating({
  value,
  onChange,
  ariaLabel,
  disabled = false,
  size = "md",
  leftLabel,
  rightLabel,
}: HalfStarRatingProps) {
  const classes = sizeClasses[size];

  return (
    <div className="inline-flex flex-col">
      <div className="flex flex-wrap items-center gap-1.5" role="radiogroup" aria-label={ariaLabel}>
        {[1, 2, 3, 4, 5].map((star) => (
          <div key={star} className={`relative ${classes.button}`}>
            <StarIcon className={`absolute inset-0 ${classes.icon} text-[#d7c7ad]`} />
            {(value ?? 0) >= star && (
              <StarFilledIcon className={`absolute inset-0 ${classes.icon} text-[#f7c86a]`} />
            )}
            {(value ?? 0) >= star - 0.5 && (value ?? 0) < star && (
              <div className="absolute inset-0 w-1/2 overflow-hidden">
                <StarFilledIcon className={`${classes.icon} text-[#f7c86a]`} />
              </div>
            )}
            <button
              type="button"
              aria-label={`${star - 0.5} stars`}
              aria-checked={value === star - 0.5}
              className="absolute inset-y-0 left-0 w-1/2 rounded-l-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[#800020]/35 disabled:cursor-not-allowed"
              disabled={disabled}
              role="radio"
              onClick={() => onChange(star - 0.5)}
            />
            <button
              type="button"
              aria-label={`${star} stars`}
              aria-checked={value === star}
              className="absolute inset-y-0 right-0 w-1/2 rounded-r-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[#800020]/35 disabled:cursor-not-allowed"
              disabled={disabled}
              role="radio"
              onClick={() => onChange(star)}
            />
          </div>
        ))}
      </div>
      {(leftLabel || rightLabel) && (
        <div className="mt-1 flex w-full justify-between gap-3 text-[11px] font-medium text-neutral-500">
          <span>{leftLabel}</span>
          <span>{rightLabel}</span>
        </div>
      )}
    </div>
  );
}
