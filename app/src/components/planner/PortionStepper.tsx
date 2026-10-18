"use client";

import { Minus, Plus } from "lucide-react";

export interface PortionStepperProps {
  id: string;
  label: string;
  value: string;
  suggestion: number;
  min?: number;
  max?: number;
  disabled?: boolean;
  onChange: (value: string) => void;
  describedBy?: string;
}

const inputClass =
  "h-11 w-20 min-w-0 rounded-lg border border-ui-border-strong bg-ui-surface-subtle px-3 text-center text-sm text-ui-text outline-none transition-colors placeholder:text-ui-muted focus:border-ui-accent/45 focus:bg-ui-surface-raised focus-visible:ring-2 focus-visible:ring-ui-focus-soft disabled:cursor-not-allowed disabled:opacity-60";

const buttonClass =
  "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-ui-border-strong bg-ui-surface-subtle text-ui-text transition-colors hover:bg-ui-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-focus disabled:cursor-not-allowed disabled:opacity-45";

export function effectivePortions(value: string, suggestion: number): number {
  if (value.trim() === "") return suggestion;

  const parsed = Number(value);
  return Number.isNaN(parsed) ? suggestion : parsed;
}

export function PortionStepper({
  id,
  label,
  value,
  suggestion,
  min = 0,
  max = 1000,
  disabled = false,
  onChange,
  describedBy,
}: PortionStepperProps) {
  const effective = effectivePortions(value, suggestion);

  function changeBy(delta: number) {
    const next = Math.min(Math.max(effective + delta, min), max);
    onChange(String(next));
  }

  return (
    <div className="grid gap-1.5">
      <label
        htmlFor={id}
        className="text-xs font-semibold text-[var(--ui-muted)]"
      >
        {label}
      </label>
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label={`Fewer ${label.toLowerCase()}`}
          disabled={disabled || effective <= min}
          onClick={() => changeBy(-1)}
          className={buttonClass}
        >
          <Minus className="h-4 w-4" aria-hidden="true" />
        </button>
        <input
          id={id}
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          step={1}
          value={value}
          placeholder={String(suggestion)}
          disabled={disabled}
          aria-describedby={describedBy}
          onChange={(event) => onChange(event.target.value)}
          className={inputClass}
        />
        <button
          type="button"
          aria-label={`More ${label.toLowerCase()}`}
          disabled={disabled || effective >= max}
          onClick={() => changeBy(1)}
          className={buttonClass}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
