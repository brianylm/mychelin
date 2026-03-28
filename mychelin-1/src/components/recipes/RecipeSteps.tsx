"use client";

import { useState, useCallback } from "react";
import { Button, IconButton } from "@radix-ui/themes";
import {
  Cross2Icon,
  Pencil1Icon,
  PlusIcon,
  CheckIcon,
} from "@radix-ui/react-icons";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
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

export function RecipeSteps({
  instructions,
  recipeId,
  onAdd,
  onUpdate,
  onDelete,
}: RecipeStepsProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [newStep, setNewStep] = useState("");

  const sorted = [...instructions].sort(
    (a, b) => a.stepNumber - b.stepNumber
  );

  const handleAddStep = useCallback(async () => {
    if (!newStep.trim()) return;
    await onAdd(recipeId, {
      content: newStep.trim(),
    });
    setNewStep("");
  }, [newStep, onAdd, recipeId]);

  return (
    <CollapsibleSection
      title="Recipe Steps"
      badge={sorted.length || undefined}
      defaultOpen={false}
    >
      <div className="space-y-3">
        {sorted.length > 0 ? (
          <ol className="space-y-2">
            {sorted.map((step, idx) => (
              <li
                key={step.id}
                className="group flex gap-3 rounded-lg border border-neutral-100 bg-neutral-50/50 px-3 py-2"
              >
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-semibold text-amber-700">
                  {idx + 1}
                </span>
                {isEditing ? (
                  <div className="flex flex-1 items-start gap-2">
                    <textarea
                      defaultValue={step.content}
                      onBlur={(e) => {
                        if (e.target.value !== step.content) {
                          onUpdate(recipeId, step.id, {
                            content: e.target.value,
                          });
                        }
                      }}
                      className="flex-1 resize-none rounded border border-neutral-200 bg-white px-2 py-1 text-sm outline-none focus:border-neutral-400"
                      rows={2}
                    />
                    <IconButton
                      variant="ghost"
                      size="1"
                      color="red"
                      onClick={() => onDelete(recipeId, step.id)}
                      aria-label="Remove step"
                    >
                      <Cross2Icon />
                    </IconButton>
                  </div>
                ) : (
                  <div className="flex-1">
                    <p className="text-sm text-neutral-800">{step.content}</p>
                    {step.tip && (
                      <p className="mt-1 text-xs italic text-amber-700">
                        💡 {step.tip}
                      </p>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ol>
        ) : (
          !isEditing && (
            <p className="py-3 text-center text-sm text-neutral-500">
              No steps yet. Add cooking instructions!
            </p>
          )
        )}

        {/* Add new step (in edit mode) */}
        {isEditing && (
          <div className="flex gap-2">
            <input
              value={newStep}
              onChange={(e) => setNewStep(e.target.value)}
              placeholder="Add a new step..."
              className="flex-1 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-400"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddStep();
              }}
            />
            <Button size="2" variant="solid" onClick={handleAddStep}>
              <PlusIcon className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Toggle edit mode */}
        <div className="flex justify-end">
          <Button
            size="1"
            variant="soft"
            color={isEditing ? "green" : "gray"}
            onClick={() => setIsEditing(!isEditing)}
          >
            {isEditing ? (
              <>
                <CheckIcon className="mr-1 h-3 w-3" /> Done
              </>
            ) : (
              <>
                <Pencil1Icon className="mr-1 h-3 w-3" /> {sorted.length === 0 ? "Add steps" : "Edit steps"}
              </>
            )}
          </Button>
        </div>
      </div>
    </CollapsibleSection>
  );
}
