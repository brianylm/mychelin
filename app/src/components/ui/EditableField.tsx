"use client";

import { useEffect, useRef } from "react";
import { SaveIndicator } from "./SaveIndicator";

interface EditableFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  helpText?: string;
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
  helpText,
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
  }, [autoFocusAndSelect]);

  const inputClasses =
    "w-full rounded-lg border border-ui-border-strong bg-ui-surface-subtle px-3 py-2 text-sm outline-none transition focus:border-ui-accent focus:ring-2 focus:ring-ui-focus-soft focus:bg-ui-surface-raised placeholder:text-ui-muted";

  return (
    <label className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-ui-muted">
          {label}
        </span>
        <SaveIndicator isSaving={isSaving} />
      </div>
      {helpText && <p className="text-xs leading-5 text-ui-muted">{helpText}</p>}
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
