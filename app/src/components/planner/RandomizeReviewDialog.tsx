"use client";

import { useMemo, useState } from "react";
import { Dices } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui";
import type { SlotRef } from "@/lib/planner-randomize";

const MEAL_LABELS: Record<string, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

type SlotChoice = "fill" | "eatingOut";

interface RandomizeReviewDialogProps {
  open: boolean;
  onClose: () => void;
  // Human label for the scope, e.g. "this week" or "Tue 28 Jul".
  scopeLabel: string;
  slots: SlotRef[];
  busy: boolean;
  onConfirm: (fill: SlotRef[], eatingOut: SlotRef[]) => void;
}

function slotKey(slot: SlotRef): string {
  return `${slot.date}|${slot.mealType}`;
}

function formatSlotDate(dateKey: string): string {
  return new Date(dateKey + "T00:00:00").toLocaleDateString("en-SG", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

// Pre-randomise review: shows every open slot in scope and lets the
// user mark slots to fill vs skip (eating out) before the roll.
export function RandomizeReviewDialog({
  open,
  onClose,
  scopeLabel,
  slots,
  busy,
  onConfirm,
}: RandomizeReviewDialogProps) {
  const [choices, setChoices] = useState<Record<string, SlotChoice>>({});

  // Reset choices when a new slot list arrives (each review open builds
  // a fresh slots array). Render-phase adjust is React's documented
  // pattern for prop-driven resets — the project's lint rules forbid
  // setState-in-effect.
  const [prevSlots, setPrevSlots] = useState(slots);
  if (open && prevSlots !== slots) {
    setPrevSlots(slots);
    const next: Record<string, SlotChoice> = {};
    for (const slot of slots) next[slotKey(slot)] = "fill";
    setChoices(next);
  }

  const grouped = useMemo(() => {
    const byDate = new Map<string, SlotRef[]>();
    for (const slot of slots) {
      const list = byDate.get(slot.date) ?? [];
      list.push(slot);
      byDate.set(slot.date, list);
    }
    return Array.from(byDate.entries());
  }, [slots]);

  const fillCount = slots.filter((s) => choices[slotKey(s)] !== "eatingOut").length;

  const confirm = () => {
    const fill = slots.filter((s) => choices[slotKey(s)] !== "eatingOut");
    const eatingOut = slots.filter((s) => choices[slotKey(s)] === "eatingOut");
    onConfirm(fill, eatingOut);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`Randomize ${scopeLabel}`}
      subtitle="Review the open slots before the roll. Anything marked Eating out gets blocked."
      mobileFullHeight={false}
      footer={
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            className="flex-1"
            onClick={confirm}
            disabled={busy || fillCount === 0}
            loading={busy}
            iconStart={<Dices className="h-4 w-4" />}
          >
            Randomize {fillCount} meal{fillCount === 1 ? "" : "s"}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {grouped.map(([date, dateSlots]) => (
          <div key={date}>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-ui-muted">
              {formatSlotDate(date)}
            </p>
            <div className="space-y-1.5">
              {dateSlots.map((slot) => {
                const key = slotKey(slot);
                const choice = choices[key] ?? "fill";
                return (
                  <div
                    key={key}
                    className="flex items-center justify-between gap-3 rounded-lg border border-ui-border bg-ui-surface px-3 py-2"
                  >
                    <span className="text-sm font-medium text-ui-text">
                      {MEAL_LABELS[slot.mealType] ?? slot.mealType}
                    </span>
                    <span className="inline-flex rounded-lg bg-ui-surface-subtle p-0.5 text-xs font-semibold">
                      <button
                        type="button"
                        onClick={() => setChoices((prev) => ({ ...prev, [key]: "fill" }))}
                        className={
                          "rounded-md px-2.5 py-1 transition-colors " +
                          (choice === "fill"
                            ? "bg-ui-action text-ui-action-text"
                            : "text-ui-muted hover:text-ui-text")
                        }
                        aria-pressed={choice === "fill"}
                      >
                        Fill
                      </button>
                      <button
                        type="button"
                        onClick={() => setChoices((prev) => ({ ...prev, [key]: "eatingOut" }))}
                        className={
                          "rounded-md px-2.5 py-1 transition-colors " +
                          (choice === "eatingOut"
                            ? "bg-ui-action text-ui-action-text"
                            : "text-ui-muted hover:text-ui-text")
                        }
                        aria-pressed={choice === "eatingOut"}
                      >
                        Eating out
                      </button>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </Dialog>
  );
}
