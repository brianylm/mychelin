"use client";

import { useId, useState, type FormEvent } from "react";
import { Button, Field, fieldDescriptionIds } from "@/components/ui";
import type { CreatePreparedBatchRequest } from "@/lib/meal-pilot/types";

const inputClass =
  "h-11 w-full min-w-0 rounded-lg border border-ui-border-strong bg-ui-surface-subtle px-3 text-sm text-ui-text outline-none transition-colors placeholder:text-ui-muted focus:border-ui-accent/45 focus:bg-ui-surface-raised focus-visible:ring-2 focus-visible:ring-ui-focus-soft disabled:cursor-not-allowed disabled:opacity-60";

const textareaClass =
  "min-h-[88px] w-full min-w-0 resize-y rounded-lg border border-ui-border-strong bg-ui-surface-subtle px-3 py-2 text-sm text-ui-text outline-none transition-colors placeholder:text-ui-muted focus:border-ui-accent/45 focus:bg-ui-surface-raised focus-visible:ring-2 focus-visible:ring-ui-focus-soft disabled:cursor-not-allowed disabled:opacity-60";

function positivePortions(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

// datetime-local gives a local wall-clock string. Unparseable input is rejected
// locally instead of being guessed at.
function toIsoInstantOrNull(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function selectedRecipeIdOrNull(value: string) {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export function PreparedBatchForm({
  onSave,
  onCancel,
  saving = false,
  error = null,
  recipes = [],
}: {
  onSave: (input: CreatePreparedBatchRequest) => void;
  onCancel: () => void;
  saving?: boolean;
  error?: string | null;
  recipes?: readonly { id: number; title: string }[];
}) {
  const idPrefix = useId();
  const titleId = `${idPrefix}-title`;
  const fridgeId = `${idPrefix}-fridge-portions`;
  const freezerId = `${idPrefix}-freezer-portions`;
  const fridgeUseById = `${idPrefix}-fridge-use-by`;
  const freezerUseById = `${idPrefix}-freezer-use-by`;
  const cookedAtId = `${idPrefix}-cooked-at`;
  const recipeFieldId = `${idPrefix}-recipe`;
  const notesId = `${idPrefix}-notes`;
  const portionsErrorId = `${idPrefix}-portions-error`;

  const [title, setTitle] = useState("");
  const [titleError, setTitleError] = useState<string | null>(null);
  const [fridgePortions, setFridgePortions] = useState("0");
  const [freezerPortions, setFreezerPortions] = useState("0");
  const [fridgeUseBy, setFridgeUseBy] = useState("");
  const [freezerUseBy, setFreezerUseBy] = useState("");
  const [cookedAt, setCookedAt] = useState("");
  const [cookedAtError, setCookedAtError] = useState<string | null>(null);
  const [recipeId, setRecipeId] = useState("");
  const [notes, setNotes] = useState("");
  const [portionsError, setPortionsError] = useState<string | null>(null);

  const fridge = positivePortions(fridgePortions);
  const freezer = positivePortions(freezerPortions);
  const portionsDescribedBy = portionsError ? portionsErrorId : undefined;

  function clearPortionsError() {
    setPortionsError(null);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setTitleError("Give this batch a name.");
      return;
    }
    setTitleError(null);

    if (!event.currentTarget.checkValidity()) return;

    if (fridge + freezer <= 0) {
      setPortionsError("Pick at least one portion to store.");
      return;
    }

    let cookedAtIso: string | null = null;
    if (cookedAt) {
      cookedAtIso = toIsoInstantOrNull(cookedAt);
      if (!cookedAtIso) {
        setCookedAtError("Enter a valid cooked date and time.");
        return;
      }
    }

    const trimmedFridgeUseBy = fridgeUseBy.trim();
    const trimmedFreezerUseBy = freezerUseBy.trim();
    const lots: CreatePreparedBatchRequest["lots"] = [];
    if (fridge > 0) {
      lots.push({
        storage: "fridge",
        portions: fridge,
        ...(trimmedFridgeUseBy ? { useByDate: trimmedFridgeUseBy } : {}),
      });
    }
    if (freezer > 0) {
      lots.push({
        storage: "freezer",
        portions: freezer,
        ...(trimmedFreezerUseBy ? { useByDate: trimmedFreezerUseBy } : {}),
      });
    }

    const trimmedNotes = notes.trim();
    const selectedRecipeId = selectedRecipeIdOrNull(recipeId);

    setPortionsError(null);
    setCookedAtError(null);
    onSave({
      title: trimmedTitle,
      notes: trimmedNotes ? trimmedNotes : null,
      lots,
      ...(selectedRecipeId !== null ? { recipeId: selectedRecipeId } : {}),
      ...(cookedAtIso !== null ? { cookedAt: cookedAtIso } : {}),
    });
  }

  return (
    <form className="grid gap-3" onSubmit={handleSubmit}>
      {error && (
        <p
          role="alert"
          className="rounded-lg border border-ui-danger/20 bg-ui-danger-soft px-3 py-2 text-sm text-ui-danger"
        >
          {error}
        </p>
      )}

      <Field id={titleId} label="What did you make?" error={titleError}>
        <input
          id={titleId}
          type="text"
          required
          maxLength={160}
          value={title}
          disabled={saving}
          placeholder="e.g. Grandma's braised pork"
          aria-invalid={Boolean(titleError) || undefined}
          aria-describedby={fieldDescriptionIds(titleId, false, Boolean(titleError))}
          onChange={(event) => {
            setTitleError(null);
            setTitle(event.target.value);
          }}
          className={inputClass}
        />
      </Field>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="grid min-w-0 gap-3">
          <Field id={fridgeId} label="Portions in fridge" className="min-w-0">
            <input
              id={fridgeId}
              type="number"
              inputMode="decimal"
              min={0}
              max={1000}
              step={0.5}
              value={fridgePortions}
              disabled={saving}
              aria-invalid={Boolean(portionsError) || undefined}
              aria-describedby={portionsDescribedBy}
              onChange={(event) => {
                clearPortionsError();
                setFridgePortions(event.target.value);
              }}
              className={inputClass}
            />
          </Field>

          {fridge > 0 && (
            <Field id={fridgeUseById} label="Fridge use-by (optional)" className="min-w-0">
              <input
                id={fridgeUseById}
                type="date"
                value={fridgeUseBy}
                disabled={saving}
                onChange={(event) => setFridgeUseBy(event.target.value)}
                className={inputClass}
              />
            </Field>
          )}
        </div>

        <div className="grid min-w-0 gap-3">
          <Field id={freezerId} label="Portions in freezer" className="min-w-0">
            <input
              id={freezerId}
              type="number"
              inputMode="decimal"
              min={0}
              max={1000}
              step={0.5}
              value={freezerPortions}
              disabled={saving}
              aria-invalid={Boolean(portionsError) || undefined}
              aria-describedby={portionsDescribedBy}
              onChange={(event) => {
                clearPortionsError();
                setFreezerPortions(event.target.value);
              }}
              className={inputClass}
            />
          </Field>

          {freezer > 0 && (
            <Field id={freezerUseById} label="Freezer use-by (optional)" className="min-w-0">
              <input
                id={freezerUseById}
                type="date"
                value={freezerUseBy}
                disabled={saving}
                onChange={(event) => setFreezerUseBy(event.target.value)}
                className={inputClass}
              />
            </Field>
          )}
        </div>
      </div>

      {portionsError && (
        <p id={portionsErrorId} role="alert" className="text-xs leading-5 text-red-700">
          {portionsError}
        </p>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field id={cookedAtId} label="Cooked on (optional)" error={cookedAtError} className="min-w-0">
          <input
            id={cookedAtId}
            type="datetime-local"
            value={cookedAt}
            disabled={saving}
            aria-invalid={Boolean(cookedAtError) || undefined}
            aria-describedby={fieldDescriptionIds(cookedAtId, false, Boolean(cookedAtError))}
            onChange={(event) => {
              setCookedAtError(null);
              setCookedAt(event.target.value);
            }}
            className={inputClass}
          />
        </Field>

        {recipes.length > 0 && (
          <Field id={recipeFieldId} label="Recipe (optional)" className="min-w-0">
            <select
              id={recipeFieldId}
              value={recipeId}
              disabled={saving}
              onChange={(event) => setRecipeId(event.target.value)}
              className={inputClass}
            >
              <option value="">Not linked to a recipe</option>
              {recipes.map((recipe) => (
                <option key={recipe.id} value={String(recipe.id)}>
                  {recipe.title}
                </option>
              ))}
            </select>
          </Field>
        )}
      </div>

      <Field id={notesId} label="Notes (optional)">
        <textarea
          id={notesId}
          rows={3}
          maxLength={1000}
          value={notes}
          disabled={saving}
          placeholder="How it turned out, what to change next time"
          onChange={(event) => setNotes(event.target.value)}
          className={textareaClass}
        />
      </Field>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button type="button" variant="secondary" className="h-11" disabled={saving} onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" className="h-11" loading={saving}>
          {saving ? "Saving…" : "Add prepared food"}
        </Button>
      </div>
    </form>
  );
}
