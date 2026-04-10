"use client";

import { useEffect, useRef } from "react";
import { SaveIndicator } from "./SaveIndicator";

interface EditableFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  rows?: number;
  onBlur?: () => void;
  isSaving?: boolean;
  // When true, focus the field and select its contents on mount. Used for
  // the title of a freshly created recipe so the user can start typing
  // immediately over the default "Untitled recipe" name.
  autoFocusAndSelect?: boolean;
}

export function EditableField({
  label,
  value,
  onChange,
  placeholder,
  multiline,
  rows = 3,
  onBlur,
  isSaving = false,
  autoFocusAndSelect = false,
}: EditableFieldProps) {
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (autoFocusAndSelect && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFocusAndSelect]);

  const inputClasses =
    "w-full rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100 focus:bg-white placeholder:text-neutral-400";

  return (
    <label className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-neutral-500">
          {label}
        </span>
        <SaveIndicator isSaving={isSaving} />
      </div>
      {multiline ? (
        <textarea
          ref={(el) => {
            inputRef.current = el;
          }}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          rows={rows}
          className={inputClasses}
        />
      ) : (
        <input
          ref={(el) => {
            inputRef.current = el;
          }}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          className={inputClasses}
        />
      )}
    </label>
  );
}
