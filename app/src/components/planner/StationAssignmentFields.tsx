"use client";

import { Field, fieldDescriptionIds } from "@/components/ui";

export interface StationAssignmentFieldsProps {
  idPrefix: string;
  stationName: string;
  startOffsetMinutes: string;
  durationMinutes: string;
  disabled?: boolean;
  onChange: (
    field: "stationName" | "startOffsetMinutes" | "durationMinutes",
    value: string,
  ) => void;
}

const stations = [
  "Stove A",
  "Stove B",
  "Oven",
  "Microwave",
  "Rice cooker",
  "Slow cooker",
  "Air fryer",
];

const inputClass =
  "h-11 w-full min-w-0 rounded-lg border border-ui-border-strong bg-ui-surface-subtle px-3 text-sm text-ui-text outline-none transition-colors placeholder:text-ui-muted focus:border-ui-accent/45 focus:bg-ui-surface-raised focus-visible:ring-2 focus-visible:ring-ui-focus-soft disabled:cursor-not-allowed disabled:opacity-60";

export function StationAssignmentFields({
  idPrefix,
  stationName,
  startOffsetMinutes,
  durationMinutes,
  disabled,
  onChange,
}: StationAssignmentFieldsProps) {
  const stationId = `${idPrefix}-station`;
  const offsetId = `${idPrefix}-station-offset`;
  const durationId = `${idPrefix}-station-duration`;
  const stationListId = `${idPrefix}-station-list`;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <Field
        id={stationId}
        label="Cooking station (optional)"
        help="Custom names welcome."
        className="min-w-0"
      >
        <input
          id={stationId}
          type="text"
          list={stationListId}
          maxLength={80}
          value={stationName}
          disabled={disabled}
          placeholder="e.g. Stove A"
          aria-describedby={fieldDescriptionIds(stationId, true)}
          onChange={(event) => onChange("stationName", event.target.value)}
          className={inputClass}
        />
        <datalist id={stationListId}>
          {stations.map((station) => (
            <option key={station} value={station} />
          ))}
        </datalist>
      </Field>

      <Field
        id={offsetId}
        label="Start offset (minutes)"
        help="Optional. Minutes from the combined session start."
        className="min-w-0"
      >
        <input
          id={offsetId}
          type="number"
          min={0}
          step={1}
          value={startOffsetMinutes}
          disabled={disabled}
          placeholder="0"
          aria-describedby={fieldDescriptionIds(offsetId, true)}
          onChange={(event) => onChange("startOffsetMinutes", event.target.value)}
          className={inputClass}
        />
      </Field>

      <Field
        id={durationId}
        label="Station occupied (minutes)"
        help="Optional. Blank uses the dish timing; the plan owns scheduling and conflicts."
        className="min-w-0"
      >
        <input
          id={durationId}
          type="number"
          min={1}
          step={1}
          value={durationMinutes}
          disabled={disabled}
          placeholder="Dish timing"
          aria-describedby={fieldDescriptionIds(durationId, true)}
          onChange={(event) => onChange("durationMinutes", event.target.value)}
          className={inputClass}
        />
      </Field>
    </div>
  );
}
