"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@radix-ui/themes";
import { PlusIcon } from "@radix-ui/react-icons";
import { Trash2 } from "lucide-react";
import type { Ingredient, Instruction } from "@/db/schema";
import {
  encodeHeatInTip,
  HEAT_CONFIG,
  HEAT_LEVELS,
  parseHeatFromTip,
} from "@/lib/instruction-heat";
import { matchIngredientsForStep } from "@/lib/step-ingredient-amounts";

interface RecipeStepsProps {
  instructions: Instruction[];
  ingredients?: Ingredient[];
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
  "w-full rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm outline-none transition focus:border-[#800020]/45 focus:ring-2 focus:ring-[#800020]/10 focus:bg-white placeholder:text-neutral-400";


function capitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

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

function GripIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <circle cx="9" cy="5" r="1.5" />
      <circle cx="15" cy="5" r="1.5" />
      <circle cx="9" cy="12" r="1.5" />
      <circle cx="15" cy="12" r="1.5" />
      <circle cx="9" cy="19" r="1.5" />
      <circle cx="15" cy="19" r="1.5" />
    </svg>
  );
}

export function RecipeSteps({
  instructions,
  ingredients = [],
  recipeId,
  onAdd,
  onUpdate,
  onDelete,
}: RecipeStepsProps) {
  const [newStep, setNewStep] = useState("");
  const addingRef = useRef(false);

  // Drag state
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const listRef = useRef<HTMLOListElement>(null);
  const itemRefs = useRef<Map<number, HTMLLIElement>>(new Map());

  const sorted = [...instructions].sort(
    (a, b) => a.stepNumber - b.stepNumber
  );

  const handleAddStep = useCallback(async () => {
    const trimmed = newStep.trim();
    if (!trimmed || addingRef.current) return;
    addingRef.current = true;
    try {
      await onAdd(recipeId, { content: capitalize(trimmed) });
      setNewStep("");
    } finally {
      addingRef.current = false;
    }
  }, [newStep, onAdd, recipeId]);

  const commitReorder = useCallback(
    async (fromIdx: number, toIdx: number) => {
      if (fromIdx === toIdx || toIdx < 0 || toIdx >= sorted.length) return;
      // Build the new order: remove the item from fromIdx, insert at toIdx
      const reordered = [...sorted];
      const [moved] = reordered.splice(fromIdx, 1);
      reordered.splice(toIdx, 0, moved);
      // Update stepNumbers for all affected items
      const updates: Promise<void>[] = [];
      reordered.forEach((step, i) => {
        const newNum = i + 1;
        if (step.stepNumber !== newNum) {
          updates.push(
            onUpdate(recipeId, step.id, { stepNumber: newNum })
          );
        }
      });
      await Promise.all(updates);
    },
    [sorted, onUpdate, recipeId]
  );

  // Pointer-based drag and drop
  const handlePointerDown = useCallback(
    (e: React.PointerEvent, idx: number) => {
      e.preventDefault();
      e.stopPropagation();
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      document.body.style.userSelect = "none";
      setDragIdx(idx);
      setOverIdx(idx);
    },
    []
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (dragIdx === null) return;
      e.preventDefault();
      // Find which item the pointer is over by checking Y positions
      const y = e.clientY;
      let closest = dragIdx;
      let minDist = Infinity;
      itemRefs.current.forEach((el, i) => {
        const rect = el.getBoundingClientRect();
        const mid = rect.top + rect.height / 2;
        const dist = Math.abs(y - mid);
        if (dist < minDist) {
          minDist = dist;
          closest = i;
        }
      });
      setOverIdx(closest);
    },
    [dragIdx]
  );

  const handlePointerUp = useCallback(() => {
    document.body.style.userSelect = "";
    if (dragIdx !== null && overIdx !== null && dragIdx !== overIdx) {
      commitReorder(dragIdx, overIdx);
    }
    setDragIdx(null);
    setOverIdx(null);
  }, [dragIdx, overIdx, commitReorder]);

  useEffect(() => {
    if (dragIdx === null) return;
    return () => {
      document.body.style.userSelect = "";
    };
  }, [dragIdx]);

  // Compute display order during drag
  const displayOrder = (() => {
    if (dragIdx === null || overIdx === null || dragIdx === overIdx) {
      return sorted.map((s, i) => ({ step: s, displayIdx: i }));
    }
    const reordered = [...sorted];
    const [moved] = reordered.splice(dragIdx, 1);
    reordered.splice(overIdx, 0, moved);
    return reordered.map((s, i) => ({
      step: s,
      displayIdx: i,
    }));
  })();

  const cycleHeat = useCallback(
    (step: Instruction) => {
      const { heat, cleanTip } = parseHeatFromTip(step.tip);
      const currentIdx = HEAT_LEVELS.indexOf(heat);
      const nextHeat = HEAT_LEVELS[(currentIdx + 1) % HEAT_LEVELS.length];
      const newTip = encodeHeatInTip(nextHeat, cleanTip);
      onUpdate(recipeId, step.id, { tip: newTip });
    },
    [onUpdate, recipeId]
  );

  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-neutral-800">Steps</h3>
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#800020]/10 px-1.5 text-xs font-medium text-[#800020]">
          {sorted.length}
        </span>
      </div>

      {sorted.length > 0 && (
        <ol
          ref={listRef}
          className="mb-3 space-y-2"
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          {displayOrder.map(({ step, displayIdx }) => {
            const { heat } = parseHeatFromTip(step.tip);
            const amountHints = matchIngredientsForStep(step.content, ingredients);
            const isDragging =
              dragIdx !== null &&
              step.id === sorted[dragIdx]?.id;
            return (
              <li
                key={step.id}
                ref={(el) => {
                  if (el) itemRefs.current.set(displayIdx, el);
                }}
                className={`group flex gap-2 rounded-xl border px-3 py-2.5 transition-all ${
                  isDragging
                    ? "relative z-10 scale-[1.02] select-none border-[#800020]/35 bg-[#800020]/5 shadow-md ring-2 ring-[#800020]/10"
                    : "border-neutral-100 bg-neutral-50/50"
                }`}
              >
                {/* Drag handle + step number */}
                <div className="flex flex-col items-center justify-center gap-1">
                  <button
                    type="button"
                    onPointerDown={(e) =>
                      handlePointerDown(
                        e,
                        sorted.findIndex((s) => s.id === step.id)
                      )
                    }
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                    className={`flex h-10 w-10 cursor-grab touch-none select-none items-center justify-center rounded-full border transition active:cursor-grabbing ${
                      isDragging
                        ? "border-[#800020]/30 bg-[#800020] text-white"
                        : "border-neutral-200 bg-white text-neutral-500 hover:border-[#800020]/25 hover:text-[#800020]"
                    }`}
                    title="Drag to reorder"
                    aria-label="Drag step to reorder"
                  >
                    <GripIcon className="h-4 w-4" />
                  </button>
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#800020]/10 text-xs font-semibold text-[#800020]">
                    {displayIdx + 1}
                  </span>
                </div>

                {/* Content + heat */}
                <div className="flex-1 min-w-0">
                  <AutoTextarea
                    defaultValue={step.content}
                    onBlur={(value) => {
                      const capitalized = capitalize(value);
                      if (capitalized === step.content) return;
                      if (capitalized === "") {
                        onDelete(recipeId, step.id);
                        return;
                      }
                      onUpdate(recipeId, step.id, { content: capitalized });
                    }}
                    className="w-full resize-none rounded border border-transparent bg-transparent px-2 py-1 text-sm text-neutral-800 outline-none transition hover:border-neutral-200 focus:border-[#800020]/45 focus:ring-1 focus:ring-[#800020]/10"
                  />
                  {amountHints.length > 0 && (
                    <div className="mt-2 ml-2 flex flex-wrap gap-1.5" aria-label="Ingredient amounts mentioned in this step">
                      {amountHints.map((hint) => (
                        <span
                          key={hint.name}
                          className="inline-flex max-w-full items-center gap-1 rounded-full border border-[#800020]/10 bg-white px-2 py-1 text-[11px] text-neutral-600"
                        >
                          <span className="font-semibold text-[#521224]">{hint.amount}</span>
                          <span className="truncate">{hint.name}</span>
                        </span>
                      ))}
                    </div>
                  )}
                  {/* Heat indicator */}
                  <button
                    type="button"
                    onClick={() => cycleHeat(step)}
                    className={`mt-1 ml-2 inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium transition ${
                      heat && HEAT_CONFIG[heat]
                        ? HEAT_CONFIG[heat].className
                        : "border-neutral-200 bg-white text-neutral-400 hover:border-neutral-300"
                    }`}
                    title="Cycle heat: off to low to medium to high"
                  >
                    {heat && HEAT_CONFIG[heat] ? (
                      <span>{HEAT_CONFIG[heat].label}</span>
                    ) : (
                      <span>No heat</span>
                    )}
                  </button>
                </div>

                <button
                  type="button"
                  className="mt-1 flex h-10 min-w-10 shrink-0 items-center justify-center rounded-full border border-red-100 bg-white text-red-600 transition hover:border-red-200 hover:bg-red-50"
                  onClick={() => onDelete(recipeId, step.id)}
                  aria-label="Remove step"
                  title="Remove step"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            );
          })}
        </ol>
      )}

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
