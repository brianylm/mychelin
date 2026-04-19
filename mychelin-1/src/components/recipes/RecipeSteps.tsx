"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Button, IconButton } from "@radix-ui/themes";
import { Cross2Icon, PlusIcon } from "@radix-ui/react-icons";
import type { Instruction } from "@/db/schema";

interface RecipeStepsProps {
  instructions: Instruction[];
  recipeId: number;
  onAdd: (
    recipeId: number,
    data: { content: string; tip?: string }
  ) => Promise<void>;
  onUpdate: (
    recipeId: number,
    instructionId: number,
    data: Partial<Instruction>
  ) => Promise<void>;
  onDelete: (recipeId: number, instructionId: number) => Promise<void>;
}

const fieldBase =
  "w-full rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100 focus:bg-white placeholder:text-neutral-400";

function autoResize(el: HTMLTextAreaElement) {
  el.style.height = "auto";
  el.style.height = el.scrollHeight + "px";
}

function AutoTextarea({
  defaultValue,
  onBlur,
  className,
  placeholder,
}: {
  defaultValue: string;
  onBlur: (value: string) => void;
  className: string;
  placeholder?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (ref.current) autoResize(ref.current);
  }, []);
  return (
    <textarea
      ref={ref}
      defaultValue={defaultValue}
      onBlur={(e) => onBlur(e.target.value.trim())}
      onInput={(e) => autoResize(e.currentTarget)}
      className={className}
      placeholder={placeholder}
      rows={1}
    />
  );
}

export function RecipeSteps({
  instructions,
  recipeId,
  onAdd,
  onUpdate,
  onDelete,
}: RecipeStepsProps) {
  const [newStep, setNewStep] = useState("");
  // Track whether an add is in-flight so we don't double-fire on blur+enter.
  const addingRef = useRef(false);

  const sorted = [...instructions].sort(
    (a, b) => a.stepNumber - b.stepNumber
  );

  const handleAddStep = useCallback(async () => {
    const trimmed = newStep.trim();
    if (!trimmed || addingRef.current) return;
    addingRef.current = true;
    try {
      await onAdd(recipeId, { content: trimmed });
      setNewStep("");
    } finally {
      addingRef.current = false;
    }
  }, [newStep, onAdd, recipeId]);

  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-neutral-800">Steps</h3>
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-100 px-1.5 text-xs font-medium text-amber-700">
          {sorted.length}
        </span>
      </div>

      {sorted.length > 0 && (
        <ol className="mb-3 space-y-2">
          {sorted.map((step, idx) => (
            <li
              key={step.id}
              className="group flex gap-3 rounded-lg border border-neutral-100 bg-neutral-50/50 px-3 py-2"
            >
              <span className="mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-semibold text-amber-700">
                {idx + 1}
              </span>
              <AutoTextarea
                defaultValue={step.content}
                onBlur={(value) => {
                  if (value === step.content) return;
                  if (value === "") {
                    onDelete(recipeId, step.id);
                    return;
                  }
                  onUpdate(recipeId, step.id, { content: value });
                }}
                className="flex-1 min-w-0 resize-none rounded border border-transparent bg-transparent px-2 py-1 text-sm text-neutral-800 outline-none transition hover:border-neutral-200 focus:border-amber-400 focus:ring-1 focus:ring-amber-100"
              />
              <IconButton
                variant="ghost"
                size="1"
                color="red"
                className="mt-1 flex-shrink-0 opacity-100 md:opacity-0 md:transition-opacity md:group-hover:opacity-100"
                onClick={() => onDelete(recipeId, step.id)}
                aria-label="Remove step"
              >
                <Cross2Icon />
              </IconButton>
            </li>
          ))}
        </ol>
      )}

      {/* Inline add-step input. Always visible so quick capture doesn't
          require a mode toggle. Enter adds + keeps the input focused for
          the next step. Blur also adds any in-progress text. */}
      <div className="flex gap-2">
        <input
          value={newStep}
          onChange={(e) => setNewStep(e.target.value)}
          onBlur={handleAddStep}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAddStep();
            }
          }}
          placeholder={
            sorted.length === 0
              ? "Add the first step..."
              : "Add another step..."
          }
          className={fieldBase}
        />
        <Button
          size="2"
          variant="solid"
          onClick={handleAddStep}
          disabled={!newStep.trim()}
        >
          <PlusIcon className="h-4 w-4" />
        </Button>
      </div>
    </section>
  );
}
