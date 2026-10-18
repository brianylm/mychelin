"use client";

import { Field, fieldDescriptionIds } from "@/components/ui";

export interface MealPlanningFieldsProps {
  idPrefix: string;
  diners: string;
  dinersSuggestion?: number;
  serveTime: string;
  durationMinutes: string;
  disabled?: boolean;
  timingError?: string | null;
  onChange: (
    field: "diners" | "serveTime" | "durationMinutes",
    value: string,
  ) => void;
}

const inputClass =
  "h-11 w-full min-w-0 rounded-lg border border-ui-border-strong bg-ui-surface-subtle px-3 text-sm text-ui-text outline-none transition-colors placeholder:text-ui-muted focus:border-ui-accent/45 focus:bg-ui-surface-raised focus-visible:ring-2 focus-visible:ring-ui-focus-soft disabled:cursor-not-allowed disabled:opacity-60";

export function MealPlanningFields({
  idPrefix,
  diners,
  dinersSuggestion = 2,
  serveTime,
  durationMinutes,
  disabled,
  timingError,
  onChange,
}: MealPlanningFieldsProps) {
  const dinersId = `${idPrefix}-diners`;
  const serveTimeId = `${idPrefix}-serve-time`;
  const durationId = `${idPrefix}-duration-minutes`;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <Field id={dinersId} label="People eating" className="min-w-0">
        <input
          id={dinersId}
          type="number"
          min={1}
          max={100}
          step={1}
          value={diners}
          placeholder={String(dinersSuggestion)}
          disabled={disabled}
          onChange={(event) => onChange("diners", event.target.value)}
          className={inputClass}
        />
      </Field>

      <Field id={serveTimeId} label="Serve at" className="min-w-0">
        <input
          id={serveTimeId}
          type="time"
          required
          value={serveTime}
          disabled={disabled}
          onChange={(event) => onChange("serveTime", event.target.value)}
          className={inputClass}
        />
      </Field>

      <Field
        id={durationId}
        label="Cooking time override (minutes)"
        help="Leave blank to use the longest fresh recipe plus 15 minutes."
        error={timingError}
        className="min-w-0"
      >
        <input
          id={durationId}
          type="number"
          min={1}
          step={1}
          value={durationMinutes}
          disabled={disabled}
          placeholder="Automatic"
          aria-invalid={Boolean(timingError) || undefined}
          aria-describedby={fieldDescriptionIds(durationId, !timingError, Boolean(timingError))}
          onChange={(event) => onChange("durationMinutes", event.target.value)}
          className={inputClass}
        />
      </Field>
    </div>
  );
}
