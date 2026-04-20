"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Button, IconButton } from "@radix-ui/themes";
import { Cross2Icon, PlusIcon, ChevronUpIcon, ChevronDownIcon } from "@radix-ui/react-icons";
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

const HEAT_LEVELS = [null, "low", "medium", "high"] as const;
type HeatLevel = (typeof HEAT_LEVELS)[number];

const HEAT_CONFIG: Record<string, { label: string; emoji: string; color: string }> = {
  low: { label: "Low", emoji: "🔵", color: "bg-blue-50 text-blue-700 border-blue-200" },
  medium: { label: "Med", emoji: "🟠", color: "bg-orange-50 text-orange-700 border-orange-200" },
  high: { label: "High", emoji: "🔴", color: "bg-red-50 text-red-700 border-red-200" },
};

function capitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function parseHeatFromTip(tip: string | null): { heat: HeatLevel; cleanTip: string } {
  if (!tip) return { heat: null, cleanTip: "" };
  const match = tip.match(/^\[heat:(low|medium|high)\]\s*/);
  if (match) {
    return { heat: match[1] as HeatLevel, cleanTip: tip.slice(match[0].length) };
  }
  return { heat: null, cleanTip: tip };
}

function encodeHeatInTip(heat: HeatLevel, cleanTip: string): string | null {
  if (!heat && !cleanTip) return null;
  if (!heat) return cleanTip;
  return `[heat:${heat}]${cleanTip ? " " + cleanTip : ""}`;
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

export function RecipeSteps({
  instructions,
  recipeId,
  onAdd,
  onUpdate,
  onDelete,
}: RecipeStepsProps) {
  const [newStep, setNewStep] = useState("");
  const addingRef = useRef(false);

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

  const handleMoveStep = useCallback(
    async (fromIdx: number, toIdx: number) => {
      if (toIdx < 0 || toIdx >= sorted.length) return;
      const from = sorted[fromIdx];
      const to = sorted[toIdx];
      // Swap step numbers
      await Promise.all([
        onUpdate(recipeId, from.id, { stepNumber: to.stepNumber }),
        onUpdate(recipeId, to.id, { stepNumber: from.stepNumber }),
      ]);
    },
    [sorted, onUpdate, recipeId]
  );

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
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-100 px-1.5 text-xs font-medium text-amber-700">
          {sorted.length}
        </span>
      </div>

      {sorted.length > 0 && (
        <ol className="mb-3 space-y-2">
          {sorted.map((step, idx) => {
            const { heat } = parseHeatFromTip(step.tip);
            return (
              <li
                key={step.id}
                className="group flex gap-2 rounded-lg border border-neutral-100 bg-neutral-50/50 px-3 py-2"
              >
                {/* Step number + reorder buttons */}
                <div className="flex flex-col items-center gap-0.5 pt-0.5">
                  <button
                    type="button"
                    onClick={() => handleMoveStep(idx, idx - 1)}
                    disabled={idx === 0}
                    className="text-neutral-300 hover:text-neutral-600 disabled:invisible"
                    aria-label="Move step up"
                  >
                    <ChevronUpIcon className="h-3.5 w-3.5" />
                  </button>
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-xs font-semibold text-amber-700">
                    {idx + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleMoveStep(idx, idx + 1)}
                    disabled={idx === sorted.length - 1}
                    className="text-neutral-300 hover:text-neutral-600 disabled:invisible"
                    aria-label="Move step down"
                  >
                    <ChevronDownIcon className="h-3.5 w-3.5" />
                  </button>
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
                    className="w-full resize-none rounded border border-transparent bg-transparent px-2 py-1 text-sm text-neutral-800 outline-none transition hover:border-neutral-200 focus:border-amber-400 focus:ring-1 focus:ring-amber-100"
                  />
                  {/* Heat indicator */}
                  <button
                    type="button"
                    onClick={() => cycleHeat(step)}
                    className={`mt-1 ml-2 inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium transition ${
                      heat && HEAT_CONFIG[heat]
                        ? HEAT_CONFIG[heat].color
                        : "border-neutral-200 bg-white text-neutral-400 hover:border-neutral-300"
                    }`}
                    title="Cycle heat: off → low → medium → high"
                  >
                    {heat && HEAT_CONFIG[heat] ? (
                      <>
                        <span>{HEAT_CONFIG[heat].emoji}</span>
                        <span>{HEAT_CONFIG[heat].label} heat</span>
                      </>
                    ) : (
                      <>
                        <span className="text-xs">🍳</span>
                        <span>Heat</span>
                      </>
                    )}
                  </button>
                </div>

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
