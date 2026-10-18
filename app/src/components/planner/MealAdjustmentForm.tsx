"use client";

import { useId, useState, type FormEvent } from "react";
import { Button, Field, fieldDescriptionIds } from "@/components/ui";
import { MealSourceBadge } from "@/components/planner/MealSourceBadge";
import type {
  ConfirmFreshDishInput,
  ConfirmMealRequest,
  ConfirmPreparedDishInput,
  FreshMealDish,
  MealGroupView,
  PreparedMealDish,
} from "@/lib/meal-pilot/types";

const inputClass =
  "h-11 w-full min-w-0 rounded-lg border border-ui-border-strong bg-ui-surface-subtle px-3 text-sm text-ui-text outline-none transition-colors placeholder:text-ui-muted focus:border-ui-accent/45 focus:bg-ui-surface-raised focus-visible:ring-2 focus-visible:ring-ui-focus-soft disabled:cursor-not-allowed disabled:opacity-60";

const checkboxClass =
  "h-5 w-5 shrink-0 rounded border-ui-border-strong accent-ui-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-focus-soft disabled:cursor-not-allowed disabled:opacity-60";

interface FreshDraft {
  cooked: boolean;
  fridge: string;
  freezer: string;
}

// Number("") is 0, so blank input has to be rejected explicitly rather than
// being read as "no portions".
function nonNegativeNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function positiveInteger(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

// Post-meal adjustment: records what actually happened — who ate, how much of
// each ready-made dish was used, and what each freshly cooked dish produced.
// The parent owns the dialog and the confirm call; this form only reports the
// adjusted outcome. Stored stock and reservation limits stay server-side.
export function MealAdjustmentForm({
  meal,
  busy = false,
  error = null,
  onCancel,
  onSave,
}: {
  meal: MealGroupView;
  busy?: boolean;
  error?: string | null;
  onCancel: () => void;
  onSave: (
    input: Omit<ConfirmMealRequest, "idempotencyKey" | "expectedRevision">
  ) => void;
}) {
  const idPrefix = useId();
  const dinersId = `${idPrefix}-diners`;

  const preparedDishes = meal.dishes.filter(
    (dish): dish is PreparedMealDish => dish.source !== "fresh"
  );
  const freshDishes = meal.dishes.filter(
    (dish): dish is FreshMealDish => dish.source === "fresh"
  );

  const [diners, setDiners] = useState(() => String(meal.dinerCount));
  const [consumed, setConsumed] = useState<Record<number, string>>(() => {
    const next: Record<number, string> = {};
    for (const dish of preparedDishes) {
      next[dish.reservationId] = String(dish.plannedPortions);
    }
    return next;
  });
  const [fresh, setFresh] = useState<Record<number, FreshDraft>>(() => {
    const next: Record<number, FreshDraft> = {};
    for (const dish of freshDishes) {
      next[dish.mealPlanId] = {
        cooked: true,
        fridge: String(dish.plannedOutput?.fridge ?? 0),
        freezer: String(dish.plannedOutput?.freezer ?? 0),
      };
    }
    return next;
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  function clearError(key: string) {
    setErrors((previous) => {
      if (!(key in previous)) return previous;
      const next = { ...previous };
      delete next[key];
      return next;
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    const nextErrors: Record<string, string> = {};
    const actualDiners = positiveInteger(diners);
    if (actualDiners === null) {
      nextErrors.diners = "Enter a whole number of diners, 1 or more.";
    }

    const preparedInput: ConfirmPreparedDishInput[] = [];
    for (const dish of preparedDishes) {
      const parsed = nonNegativeNumber(consumed[dish.reservationId] ?? "");
      if (parsed === null) {
        nextErrors[`consumed-${dish.reservationId}`] = "Enter 0 or more portions.";
        continue;
      }
      preparedInput.push({
        reservationId: dish.reservationId,
        consumedPortions: parsed,
      });
    }

    const freshInput: ConfirmFreshDishInput[] = [];
    for (const dish of freshDishes) {
      const draft = fresh[dish.mealPlanId];
      // Not cooked means no output at all, whatever is still typed in the
      // portion boxes.
      if (!draft || !draft.cooked) {
        freshInput.push({
          mealPlanId: dish.mealPlanId,
          cooked: false,
          output: null,
        });
        continue;
      }

      const fridge = nonNegativeNumber(draft.fridge);
      const freezer = nonNegativeNumber(draft.freezer);
      if (fridge === null) {
        nextErrors[`fridge-${dish.mealPlanId}`] = "Enter 0 or more portions.";
      }
      if (freezer === null) {
        nextErrors[`freezer-${dish.mealPlanId}`] = "Enter 0 or more portions.";
      }
      if (fridge === null || freezer === null) continue;

      freshInput.push({
        mealPlanId: dish.mealPlanId,
        cooked: true,
        output: fridge + freezer > 0 ? { fridge, freezer } : null,
      });
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    if (!event.currentTarget.checkValidity()) return;
    if (actualDiners === null) return;

    onSave({
      outcome: "adjusted",
      actualDiners,
      prepared: preparedInput,
      fresh: freshInput,
    });
  }

  return (
    <form
      className="grid gap-4"
      aria-busy={busy || undefined}
      onSubmit={handleSubmit}
    >
      {error && (
        <p
          role="alert"
          className="rounded-lg border border-ui-danger/20 bg-ui-danger-soft px-3 py-2 text-sm text-ui-danger"
        >
          {error}
        </p>
      )}

      <p className="text-xs leading-5 text-ui-muted">
        Set what actually happened. Zero portions means that dish was skipped;
        extra portions are food you stored, not food you ate.
      </p>

      <Field
        id={dinersId}
        label="Diners who ate"
        error={errors.diners}
        className="max-w-[12rem] min-w-0"
      >
        <input
          id={dinersId}
          type="number"
          inputMode="numeric"
          min={1}
          step={1}
          required
          value={diners}
          disabled={busy}
          aria-invalid={Boolean(errors.diners) || undefined}
          aria-describedby={fieldDescriptionIds(
            dinersId,
            false,
            Boolean(errors.diners)
          )}
          onChange={(event) => {
            clearError("diners");
            setDiners(event.target.value);
          }}
          className={inputClass}
        />
      </Field>

      {preparedDishes.length > 0 && (
        <section className="grid gap-2">
          <h3 className="text-xs font-semibold tracking-wide text-ui-muted uppercase">
            Ready-made dishes
          </h3>
          <ul className="divide-y divide-ui-border">
            {preparedDishes.map((dish) => {
              const fieldId = `${idPrefix}-consumed-${dish.reservationId}`;
              const fieldError = errors[`consumed-${dish.reservationId}`];

              return (
                <li
                  key={dish.reservationId}
                  className="grid min-w-0 gap-3 py-4 first:pt-0 last:pb-0"
                >
                  <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="min-w-0 flex-1 text-sm font-medium break-words text-ui-text">
                      {dish.title}
                    </span>
                    <MealSourceBadge source={dish.source} className="shrink-0" />
                  </div>

                  <Field
                    id={fieldId}
                    label="Portions eaten"
                    help={`Planned ${dish.plannedPortions}`}
                    error={fieldError}
                    className="max-w-[12rem] min-w-0"
                  >
                    <input
                      id={fieldId}
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step={0.5}
                      required
                      value={consumed[dish.reservationId] ?? ""}
                      disabled={busy}
                      aria-invalid={Boolean(fieldError) || undefined}
                      aria-describedby={fieldDescriptionIds(
                        fieldId,
                        !fieldError,
                        Boolean(fieldError)
                      )}
                      onChange={(event) => {
                        clearError(`consumed-${dish.reservationId}`);
                        const value = event.target.value;
                        setConsumed((previous) => ({
                          ...previous,
                          [dish.reservationId]: value,
                        }));
                      }}
                      className={inputClass}
                    />
                  </Field>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {freshDishes.length > 0 && (
        <section className="grid gap-2">
          <h3 className="text-xs font-semibold tracking-wide text-ui-muted uppercase">
            Cooked fresh
          </h3>
          <ul className="divide-y divide-ui-border">
            {freshDishes.map((dish) => {
              const draft = fresh[dish.mealPlanId];
              const cooked = draft?.cooked ?? true;
              const cookedId = `${idPrefix}-cooked-${dish.mealPlanId}`;
              const fridgeId = `${idPrefix}-fridge-${dish.mealPlanId}`;
              const freezerId = `${idPrefix}-freezer-${dish.mealPlanId}`;
              const fridgeError = errors[`fridge-${dish.mealPlanId}`];
              const freezerError = errors[`freezer-${dish.mealPlanId}`];

              return (
                <li
                  key={dish.mealPlanId}
                  className="grid min-w-0 gap-3 py-4 first:pt-0 last:pb-0"
                >
                  <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="min-w-0 flex-1 text-sm font-medium break-words text-ui-text">
                      {dish.title}
                    </span>
                    <MealSourceBadge source="fresh" className="shrink-0" />
                  </div>

                  <label
                    htmlFor={cookedId}
                    className="flex min-h-11 w-fit items-center gap-2 text-sm text-ui-text"
                  >
                    <input
                      id={cookedId}
                      type="checkbox"
                      checked={cooked}
                      disabled={busy}
                      onChange={(event) => {
                        const checked = event.target.checked;
                        setFresh((previous) => ({
                          ...previous,
                          [dish.mealPlanId]: {
                            cooked: checked,
                            fridge: previous[dish.mealPlanId]?.fridge ?? "0",
                            freezer: previous[dish.mealPlanId]?.freezer ?? "0",
                          },
                        }));
                      }}
                      className={checkboxClass}
                    />
                    Cooked this dish
                  </label>

                  {cooked && (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <Field
                        id={fridgeId}
                        label="Fridge portions kept"
                        error={fridgeError}
                        className="min-w-0"
                      >
                        <input
                          id={fridgeId}
                          type="number"
                          inputMode="decimal"
                          min={0}
                          step={0.5}
                          required
                          value={draft?.fridge ?? "0"}
                          disabled={busy}
                          aria-invalid={Boolean(fridgeError) || undefined}
                          aria-describedby={fieldDescriptionIds(
                            fridgeId,
                            false,
                            Boolean(fridgeError)
                          )}
                          onChange={(event) => {
                            clearError(`fridge-${dish.mealPlanId}`);
                            const value = event.target.value;
                            setFresh((previous) => ({
                              ...previous,
                              [dish.mealPlanId]: {
                                cooked: previous[dish.mealPlanId]?.cooked ?? true,
                                fridge: value,
                                freezer: previous[dish.mealPlanId]?.freezer ?? "0",
                              },
                            }));
                          }}
                          className={inputClass}
                        />
                      </Field>

                      <Field
                        id={freezerId}
                        label="Freezer portions kept"
                        error={freezerError}
                        className="min-w-0"
                      >
                        <input
                          id={freezerId}
                          type="number"
                          inputMode="decimal"
                          min={0}
                          step={0.5}
                          required
                          value={draft?.freezer ?? "0"}
                          disabled={busy}
                          aria-invalid={Boolean(freezerError) || undefined}
                          aria-describedby={fieldDescriptionIds(
                            freezerId,
                            false,
                            Boolean(freezerError)
                          )}
                          onChange={(event) => {
                            clearError(`freezer-${dish.mealPlanId}`);
                            const value = event.target.value;
                            setFresh((previous) => ({
                              ...previous,
                              [dish.mealPlanId]: {
                                cooked: previous[dish.mealPlanId]?.cooked ?? true,
                                fridge: previous[dish.mealPlanId]?.fridge ?? "0",
                                freezer: value,
                              },
                            }));
                          }}
                          className={inputClass}
                        />
                      </Field>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <div className="grid gap-2 sm:flex sm:flex-wrap sm:items-center sm:justify-end">
        <Button
          type="button"
          variant="secondary"
          className="h-11"
          disabled={busy}
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button type="submit" className="h-11" loading={busy}>
          {busy ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
