"use client";

import { useEffect, useMemo, useState } from "react";
import { CookingPot, Refrigerator } from "lucide-react";
import { Button, Dialog, Field } from "@/components/ui";
import { getMealCookingDuration } from "@/lib/meal-cooking-duration";
import type {
  MealGroupView,
  MealType,
  PreparedBatchView,
} from "@/lib/meal-pilot/types";
import { MealPlanningFields } from "./MealPlanningFields";

export interface MealComposerRecipe {
  id: number;
  title: string;
  yield?: string | null;
  prepTime?: number | null;
  cookTime?: number | null;
}

export type MealComposerSubmission = {
  schedule: {
    date: string;
    mealType: MealType;
    serveAt: string;
    timezone: string;
    dinerCount: number;
    durationOverrideMinutes: number | null;
  };
  dish?:
    | {
        source: "fresh";
        recipeId: number;
        targetPortions: number;
        plannedOutput: { fridge: number; freezer: number } | null;
      }
    | {
        source: "prepared";
        lotId: number;
        portions: number;
        reheatNotes: string | null;
        idempotencyKey: string;
      };
};

interface MealComposerDialogProps {
  open: boolean;
  purpose: "create" | "add-dish" | "edit";
  date: string;
  mealType: MealType;
  meal?: MealGroupView | null;
  recipes: MealComposerRecipe[];
  batches: PreparedBatchView[];
  busy?: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (value: MealComposerSubmission) => void | Promise<void>;
}

const inputClass =
  "h-11 w-full rounded-lg border border-ui-border-strong bg-ui-surface-subtle px-3 text-sm text-ui-text outline-none transition placeholder:text-ui-muted focus:border-ui-accent/45 focus:bg-ui-surface-raised focus-visible:ring-2 focus-visible:ring-ui-focus-soft disabled:opacity-60";

function timeInZone(instant: string, timezone: string) {
  const date = new Date(instant);
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return values.hour && values.minute ? `${values.hour}:${values.minute}` : "";
}

function localDateTimeToIso(date: string, time: string, timezone: string) {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  if (![year, month, day, hour, minute].every(Number.isFinite)) return null;

  const desired = Date.UTC(year, month - 1, day, hour, minute);
  let candidate = desired;
  for (let pass = 0; pass < 2; pass += 1) {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date(candidate));
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    const observed = Date.UTC(
      Number(values.year),
      Number(values.month) - 1,
      Number(values.day),
      Number(values.hour),
      Number(values.minute)
    );
    candidate += desired - observed;
  }

  const result = new Date(candidate);
  return Number.isNaN(result.getTime()) ? null : result.toISOString();
}

function newIdempotencyKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `prepared-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function MealComposerDialog({
  open,
  purpose,
  date,
  mealType,
  meal,
  recipes,
  batches,
  busy,
  error,
  onClose,
  onSubmit,
}: MealComposerDialogProps) {
  const timezone = meal?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const [diners, setDiners] = useState("");
  const [serveTime, setServeTime] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("");
  const [dishSource, setDishSource] = useState<"fresh" | "prepared">("fresh");
  const [recipeId, setRecipeId] = useState("");
  const [targetPortions, setTargetPortions] = useState("");
  const [fridgeOutput, setFridgeOutput] = useState("0");
  const [freezerOutput, setFreezerOutput] = useState("0");
  const [lotId, setLotId] = useState("");
  const [preparedPortions, setPreparedPortions] = useState("");
  const [reheatNotes, setReheatNotes] = useState("");
  const [idempotencyKey, setIdempotencyKey] = useState(newIdempotencyKey);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setDiners(meal ? String(meal.dinerCount) : "");
    setServeTime(meal ? timeInZone(meal.serveAt, meal.timezone) : "");
    setDurationMinutes(
      meal?.durationOverrideMinutes != null ? String(meal.durationOverrideMinutes) : ""
    );
    setDishSource("fresh");
    setRecipeId("");
    setTargetPortions("");
    setFridgeOutput("0");
    setFreezerOutput("0");
    setLotId("");
    setPreparedPortions("");
    setReheatNotes("");
    setIdempotencyKey(newIdempotencyKey());
    setValidationError(null);
  }, [open, meal]);

  const selectedRecipe = recipes.find((recipe) => recipe.id === Number(recipeId)) ?? null;
  const selectedLot = useMemo(
    () =>
      batches
        .flatMap((batch) => batch.lots.map((lot) => ({ batch, lot })))
        .find(({ lot }) => lot.id === Number(lotId)) ?? null,
    [batches, lotId]
  );

  const timingResult = useMemo(() => {
    const existingFresh =
      meal?.dishes
        .filter((dish) => dish.source === "fresh")
        .map((dish) => ({ source: "fresh" as const, prepTime: dish.prepTime, cookTime: dish.cookTime })) ?? [];
    const pending =
      purpose !== "edit" && dishSource === "fresh" && selectedRecipe
        ? [
            {
              source: "fresh" as const,
              prepTime: selectedRecipe.prepTime ?? null,
              cookTime: selectedRecipe.cookTime ?? null,
            },
          ]
        : [];
    const override = durationMinutes === "" ? null : Number(durationMinutes);
    return getMealCookingDuration([...existingFresh, ...pending], override);
  }, [dishSource, durationMinutes, meal, purpose, selectedRecipe]);

  const timingError =
    timingResult.missingTiming && durationMinutes === ""
      ? "A fresh recipe is missing prep or cook time. Enter a cooking time override."
      : null;

  const title =
    purpose === "create" ? "Plan this meal" : purpose === "add-dish" ? "Add another dish" : "Meal details";
  const subtitle = `${date} · ${mealType[0].toUpperCase()}${mealType.slice(1)}`;

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setValidationError(null);

    const dinerCount = Number(diners);
    const override = durationMinutes === "" ? null : Number(durationMinutes);
    if (!Number.isInteger(dinerCount) || dinerCount < 1) {
      setValidationError("Enter how many people are eating.");
      return;
    }
    if (!serveTime) {
      setValidationError("Choose when this meal should be served.");
      return;
    }
    if (override != null && (!Number.isFinite(override) || override <= 0)) {
      setValidationError("Cooking time override must be a positive number of minutes.");
      return;
    }
    if (timingError) {
      setValidationError(timingError);
      return;
    }

    const serveAt = localDateTimeToIso(date, serveTime, timezone);
    if (!serveAt) {
      setValidationError("That serving time could not be scheduled.");
      return;
    }

    let dish: MealComposerSubmission["dish"];
    if (purpose !== "edit") {
      if (dishSource === "fresh") {
        const portions = Number(targetPortions);
        const fridge = Number(fridgeOutput || 0);
        const freezer = Number(freezerOutput || 0);
        if (!selectedRecipe || !Number.isFinite(portions) || portions <= 0) {
          setValidationError("Choose a fresh recipe and enter the portions to eat.");
          return;
        }
        if (![fridge, freezer].every((value) => Number.isFinite(value) && value >= 0)) {
          setValidationError("Saved portions cannot be negative.");
          return;
        }
        dish = {
          source: "fresh",
          recipeId: selectedRecipe.id,
          targetPortions: portions,
          plannedOutput: fridge || freezer ? { fridge, freezer } : null,
        };
      } else {
        const portions = Number(preparedPortions);
        if (!selectedLot || !Number.isFinite(portions) || portions <= 0) {
          setValidationError("Choose a prepared batch and enter the portions to serve.");
          return;
        }
        if (portions > selectedLot.lot.unallocatedPortions) {
          setValidationError(`Only ${selectedLot.lot.unallocatedPortions} unallocated portions remain.`);
          return;
        }
        dish = {
          source: "prepared",
          lotId: selectedLot.lot.id,
          portions,
          reheatNotes: reheatNotes.trim() || null,
          idempotencyKey,
        };
      }
    }

    void onSubmit({
      schedule: {
        date,
        mealType,
        serveAt,
        timezone,
        dinerCount,
        durationOverrideMinutes: override,
      },
      dish,
    });
  }

  return (
    <Dialog
      open={open}
      onClose={busy ? () => undefined : onClose}
      title={title}
      subtitle={subtitle}
      className="sm:max-w-2xl"
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose} disabled={busy} className="min-h-11">
            Cancel
          </Button>
          <Button type="submit" form="meal-composer-form" loading={busy} className="min-h-11">
            {purpose === "edit" ? "Save details" : purpose === "add-dish" ? "Add dish" : "Plan meal"}
          </Button>
        </div>
      }
    >
      <form id="meal-composer-form" onSubmit={handleSubmit} className="space-y-5">
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-ui-muted">
            Eating occasion
          </h3>
          <MealPlanningFields
            idPrefix="meal-composer"
            diners={diners}
            serveTime={serveTime}
            durationMinutes={durationMinutes}
            disabled={busy}
            timingError={timingError}
            onChange={(field, value) => {
              if (field === "diners") setDiners(value);
              if (field === "serveTime") setServeTime(value);
              if (field === "durationMinutes") setDurationMinutes(value);
            }}
          />
          {timingResult.durationMinutes != null && durationMinutes === "" && (
            <p className="mt-2 text-xs text-ui-muted">
              Cooking block: {timingResult.durationMinutes} minutes, ending at serving time.
            </p>
          )}
        </section>

        {purpose !== "edit" && (
          <section className="space-y-4 border-t border-ui-border pt-5">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-ui-muted">
                Dish source
              </h3>
              <div className="mt-2 grid grid-cols-2 gap-2" role="group" aria-label="Dish source">
                <button
                  type="button"
                  onClick={() => setDishSource("fresh")}
                  disabled={busy}
                  aria-pressed={dishSource === "fresh"}
                  className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-semibold transition ${
                    dishSource === "fresh"
                      ? "border-ui-accent bg-ui-accent-muted text-ui-accent"
                      : "border-ui-border-strong bg-ui-surface-raised text-ui-muted hover:text-ui-text"
                  }`}
                >
                  <CookingPot className="h-4 w-4" aria-hidden="true" />
                  Cook fresh
                </button>
                <button
                  type="button"
                  onClick={() => setDishSource("prepared")}
                  disabled={busy}
                  aria-pressed={dishSource === "prepared"}
                  className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-semibold transition ${
                    dishSource === "prepared"
                      ? "border-ui-accent bg-ui-accent-muted text-ui-accent"
                      : "border-ui-border-strong bg-ui-surface-raised text-ui-muted hover:text-ui-text"
                  }`}
                >
                  <Refrigerator className="h-4 w-4" aria-hidden="true" />
                  Already cooked
                </button>
              </div>
            </div>

            {dishSource === "fresh" ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <Field id="meal-composer-recipe" label="Fresh recipe" className="sm:col-span-2">
                  <select
                    id="meal-composer-recipe"
                    required
                    value={recipeId}
                    disabled={busy}
                    onChange={(event) => setRecipeId(event.target.value)}
                    className={inputClass}
                  >
                    <option value="">Choose a recipe</option>
                    {recipes.map((recipe) => (
                      <option key={recipe.id} value={recipe.id}>
                        {recipe.title}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field id="meal-composer-target" label="Portions to eat">
                  <input
                    id="meal-composer-target"
                    type="number"
                    min="0.25"
                    step="0.25"
                    required
                    value={targetPortions}
                    disabled={busy}
                    onChange={(event) => setTargetPortions(event.target.value)}
                    className={inputClass}
                  />
                </Field>
                <div className="grid grid-cols-2 gap-2">
                  <Field id="meal-composer-fridge" label="Save in fridge">
                    <input
                      id="meal-composer-fridge"
                      type="number"
                      min="0"
                      step="0.25"
                      value={fridgeOutput}
                      disabled={busy}
                      onChange={(event) => setFridgeOutput(event.target.value)}
                      className={inputClass}
                    />
                  </Field>
                  <Field id="meal-composer-freezer" label="Save frozen">
                    <input
                      id="meal-composer-freezer"
                      type="number"
                      min="0"
                      step="0.25"
                      value={freezerOutput}
                      disabled={busy}
                      onChange={(event) => setFreezerOutput(event.target.value)}
                      className={inputClass}
                    />
                  </Field>
                </div>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                <Field id="meal-composer-lot" label="Prepared food" className="sm:col-span-2">
                  <select
                    id="meal-composer-lot"
                    required
                    value={lotId}
                    disabled={busy}
                    onChange={(event) => setLotId(event.target.value)}
                    className={inputClass}
                  >
                    <option value="">Choose a fridge or freezer batch</option>
                    {batches.flatMap((batch) =>
                      batch.lots.map((lot) => (
                        <option key={lot.id} value={lot.id} disabled={lot.unallocatedPortions <= 0}>
                          {batch.title} · {lot.storage === "freezer" ? "Frozen" : "Fridge"} · {lot.unallocatedPortions} available
                        </option>
                      ))
                    )}
                  </select>
                </Field>
                <Field id="meal-composer-prepared-portions" label="Portions to serve">
                  <input
                    id="meal-composer-prepared-portions"
                    type="number"
                    min="0.25"
                    step="0.25"
                    max={selectedLot?.lot.unallocatedPortions}
                    required
                    value={preparedPortions}
                    disabled={busy}
                    onChange={(event) => setPreparedPortions(event.target.value)}
                    className={inputClass}
                  />
                </Field>
                <Field id="meal-composer-reheat" label="Reheating note" help="Shown in the meal and calendar instructions.">
                  <input
                    id="meal-composer-reheat"
                    type="text"
                    value={reheatNotes}
                    disabled={busy}
                    placeholder="e.g. Microwave 4 min, stir halfway"
                    onChange={(event) => setReheatNotes(event.target.value)}
                    className={inputClass}
                  />
                </Field>
                <p className="sm:col-span-2 text-xs text-ui-muted">
                  Prepared dishes do not create a cooking time block. Frozen portions get a separate defrost reminder.
                </p>
              </div>
            )}
          </section>
        )}

        {(validationError || error) && (
          <p role="alert" className="rounded-lg border border-ui-danger/20 bg-ui-danger-soft px-3 py-2 text-sm text-ui-danger">
            {validationError || error}
          </p>
        )}
      </form>
    </Dialog>
  );
}
