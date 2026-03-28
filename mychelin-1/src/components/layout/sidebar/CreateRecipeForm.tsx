"use client";

import { Button } from "@radix-ui/themes";

interface CreateRecipeFormProps {
  name: string;
  onNameChange: (name: string) => void;
  error: string | null;
  isSaving: boolean;
  onSave: () => void;
  onCancel: () => void;
}

export function CreateRecipeForm({
  name,
  onNameChange,
  error,
  isSaving,
  onSave,
  onCancel,
}: CreateRecipeFormProps) {
  return (
    <div className="mt-3 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
      <input
        type="text"
        value={name}
        onChange={(e) => onNameChange(e.target.value)}
        placeholder="Recipe name..."
        className="mb-2 w-full rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100 focus:bg-white placeholder:text-neutral-400"
        autoFocus
        onKeyDown={(e) => {
          if (e.key === "Enter" && name.trim()) onSave();
          if (e.key === "Escape") onCancel();
        }}
      />
      {error && (
        <p className="mb-2 text-xs text-red-600">{error}</p>
      )}
      <div className="flex gap-2">
        <Button
          size="1"
          variant="solid"
          onClick={onSave}
          disabled={!name.trim() || isSaving}
        >
          {isSaving ? "Creating..." : "Create"}
        </Button>
        <Button size="1" variant="soft" color="gray" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
