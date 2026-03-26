"use client";

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
}: EditableFieldProps) {
  const inputClasses =
    "w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200";

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
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          rows={rows}
          className={inputClasses}
        />
      ) : (
        <input
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
