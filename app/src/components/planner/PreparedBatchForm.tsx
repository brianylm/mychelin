"use client";

import { useId, useState, type FormEvent } from "react";
import { Button, Field, fieldDescriptionIds } from "@/components/ui";
import type { CreatePreparedBatchRequest } from "@/lib/meal-pilot/types";
import { effectivePortions, PortionStepper } from "./PortionStepper";

const inputClass =
  "h-11 w-full min-w-0 rounded-lg border border-ui-border-strong bg-ui-surface-subtle px-3 text-sm text-ui-text outline-none transition-colors placeholder:text-ui-muted focus:border-ui-accent/45 focus:bg-ui-surface-raised focus-visible:ring-2 focus-visible:ring-ui-focus-soft disabled:cursor-not-allowed disabled:opacity-60";

const textareaClass =
  "min-h-[88px] w-full min-w-0 resize-y rounded-lg border border-ui-border-strong bg-ui-surface-subtle px-3 py-2 text-sm text-ui-text outline-none transition-colors placeholder:text-ui-muted focus:border-ui-accent/45 focus:bg-ui-surface-raised focus-visible:ring-2 focus-visible:ring-ui-focus-soft disabled:cursor-not-allowed disabled:opacity-60";

const segmentedOptionClass =
  "min-h-11 min-w-0 flex-1 rounded-md px-2 text-xs font-semibold whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-focus focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm";

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

type BatchSource = "recipe" | "someone";

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
  const whoId = `${idPrefix}-who`;
  const totalId = `${idPrefix}-total-portions`;
  const freezerId = `${idPrefix}-freezer-portions`;
  const fridgeUseById = `${idPrefix}-fridge-use-by`;
  const freezerUseById = `${idPrefix}-freezer-use-by`;
  const cookedAtId = `${idPrefix}-cooked-at`;
  const recipeFieldId = `${idPrefix}-recipe`;
  const notesId = `${idPrefix}-notes`;

  const [sourceChoice, setSourceChoice] = useState<BatchSource | null>(null);
  const [title, setTitle] = useState("");
  const [titleError, setTitleError] = useState<string | null>(null);
  const [who, setWho] = useState("");
  const [totalPortions, setTotalPortions] = useState("");
  const [freezerPortions, setFreezerPortions] = useState("");
  const [portionsError, setPortionsError] = useState<string | null>(null);
  const [fridgeUseBy, setFridgeUseBy] = useState("");
  const [freezerUseBy, setFreezerUseBy] = useState("");
  const [cookedAt, setCookedAt] = useState("");
  const [cookedAtError, setCookedAtError] = useState<string | null>(null);
  const [recipeId, setRecipeId] = useState("");
  const [recipeError, setRecipeError] = useState<string | null>(null);
  const [notes, setNotes] = useState("");

  const source = sourceChoice ?? (recipes.length === 0 ? "someone" : "recipe");
  const sortedRecipes = [...recipes].sort((left, right) =>
    left.title.localeCompare(right.title, undefined, { sensitivity: "base" }),
  );
  const selectedRecipeId = selectedRecipeIdOrNull(recipeId);
  const selectedRecipe =
    selectedRecipeId === null
      ? undefined
      : sortedRecipes.find((recipe) => recipe.id === selectedRecipeId);

  const total = Math.max(0, effectivePortions(totalPortions, 4));
  const freezer = Math.min(
    Math.max(0, effectivePortions(freezerPortions, 0)),
    total,
  );
  const fridge = total - freezer;

  function chooseSource(nextSource: BatchSource) {
    setSourceChoice(nextSource);
    setTitleError(null);
    setRecipeError(null);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    let batchTitle: string;
    if (source === "recipe") {
      if (!selectedRecipe) {
        setRecipeError("Choose the recipe you cooked.");
        return;
      }
      setRecipeError(null);
      setTitleError(null);
      batchTitle = selectedRecipe.title;
    } else {
      const trimmedTitle = title.trim();
      if (!trimmedTitle) {
        setTitleError("Give this batch a name.");
        return;
      }
      setTitleError(null);
      setRecipeError(null);
      batchTitle = trimmedTitle;
    }

    if (!event.currentTarget.reportValidity()) return;

    let cookedAtIso: string | null = null;
    if (cookedAt) {
      cookedAtIso = toIsoInstantOrNull(cookedAt);
      if (!cookedAtIso) {
        setCookedAtError("Enter a valid cooked date and time.");
        return;
      }
    }
    setCookedAtError(null);

    const trimmedFridgeUseBy = fridgeUseBy.trim();
    const trimmedFreezerUseBy = freezerUseBy.trim();
    if (total <= 0) {
      setPortionsError("Add at least one portion.");
      return;
    }
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
    const trimmedWho = who.trim();
    const batchNotes =
      source === "someone" && trimmedWho
        ? `Made by ${trimmedWho}${trimmedNotes ? `\n${trimmedNotes}` : ""}`
        : trimmedNotes;

    onSave({
      title: batchTitle,
      notes: batchNotes || null,
      lots,
      ...(source === "recipe" && selectedRecipe
        ? { recipeId: selectedRecipe.id }
        : {}),
      ...(cookedAtIso !== null ? { cookedAt: cookedAtIso } : {}),
    });
  }

  return (
    <form className="grid gap-3" onSubmit={handleSubmit}>
      <div
        role="radiogroup"
        aria-label="Where is this food from?"
        className="flex gap-1 rounded-lg border border-ui-border bg-ui-surface-subtle p-1"
      >
        <button
          type="button"
          role="radio"
          aria-checked={source === "recipe"}
          disabled={saving}
          onClick={() => chooseSource("recipe")}
          className={`${segmentedOptionClass} ${
            source === "recipe"
              ? "bg-ui-action text-ui-action-text hover:bg-ui-action-hover"
              : "bg-ui-surface-subtle text-ui-text hover:bg-ui-surface-raised"
          }`}
        >
          From my recipes
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={source === "someone"}
          disabled={saving}
          onClick={() => chooseSource("someone")}
          className={`${segmentedOptionClass} ${
            source === "someone"
              ? "bg-ui-action text-ui-action-text hover:bg-ui-action-hover"
              : "bg-ui-surface-subtle text-ui-text hover:bg-ui-surface-raised"
          }`}
        >
          Someone else made it
        </button>
      </div>

      {recipes.length === 0 && (
        <p className="text-xs leading-5 text-ui-muted">
          You have no recipes yet — add this as food from someone else.
        </p>
      )}

      {source === "recipe" ? (
        <Field id={recipeFieldId} label="Which recipe?" error={recipeError}>
          <select
            id={recipeFieldId}
            required
            value={recipeId}
            disabled={saving}
            aria-invalid={Boolean(recipeError) || undefined}
            aria-describedby={fieldDescriptionIds(
              recipeFieldId,
              false,
              Boolean(recipeError),
            )}
            onChange={(event) => {
              setRecipeError(null);
              setRecipeId(event.target.value);
            }}
            className={inputClass}
          >
            <option value="" disabled>
              Choose a recipe
            </option>
            {sortedRecipes.map((recipe) => (
              <option key={recipe.id} value={String(recipe.id)}>
                {recipe.title}
              </option>
            ))}
          </select>
        </Field>
      ) : (
        <div className="grid gap-3">
          <Field id={titleId} label="What is it?" error={titleError}>
            <input
              id={titleId}
              type="text"
              required
              maxLength={160}
              value={title}
              disabled={saving}
              placeholder="e.g. Ah Ma's curry chicken"
              aria-invalid={Boolean(titleError) || undefined}
              aria-describedby={fieldDescriptionIds(
                titleId,
                false,
                Boolean(titleError),
              )}
              onChange={(event) => {
                setTitleError(null);
                setTitle(event.target.value);
              }}
              className={inputClass}
            />
          </Field>

          <Field id={whoId} label="Who made it? (optional)">
            <input
              id={whoId}
              type="text"
              maxLength={80}
              value={who}
              disabled={saving}
              placeholder="e.g. Ah Ma, neighbour, catering"
              onChange={(event) => setWho(event.target.value)}
              className={inputClass}
            />
          </Field>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <PortionStepper
          id={totalId}
          label="How many portions?"
          value={totalPortions}
          suggestion={4}
          min={1}
          max={100}
          disabled={saving}
          onChange={(value) => {
            setPortionsError(null);
            setTotalPortions(value);
          }}
        />
        <PortionStepper
          id={freezerId}
          label="Of these, in the freezer"
          value={freezerPortions}
          suggestion={0}
          min={0}
          max={total}
          disabled={saving}
          onChange={(value) => {
            setPortionsError(null);
            setFreezerPortions(value);
          }}
        />
      </div>

      <p aria-live="polite" className="text-sm text-ui-muted">
        {`${fridge} in the fridge · ${freezer} in the freezer`}
      </p>
      {portionsError && (
        <p role="alert" className="text-sm text-ui-danger">
          {portionsError}
        </p>
      )}

      <details className="border-t border-ui-border pt-1">
        <summary className="flex min-h-11 cursor-pointer items-center text-sm font-medium text-ui-accent">
          More details
        </summary>
        <div className="grid gap-3 pt-2">
          {fridge > 0 && (
            <Field id={fridgeUseById} label="Fridge use-by (optional)">
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

          {freezer > 0 && (
            <Field id={freezerUseById} label="Freezer use-by (optional)">
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

          <Field
            id={cookedAtId}
            label="Cooked on (optional)"
            error={cookedAtError}
          >
            <input
              id={cookedAtId}
              type="datetime-local"
              value={cookedAt}
              disabled={saving}
              aria-invalid={Boolean(cookedAtError) || undefined}
              aria-describedby={fieldDescriptionIds(
                cookedAtId,
                false,
                Boolean(cookedAtError),
              )}
              onChange={(event) => {
                setCookedAtError(null);
                setCookedAt(event.target.value);
              }}
              className={inputClass}
            />
          </Field>

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
        </div>
      </details>

      {error && (
        <p
          role="alert"
          className="rounded-lg border border-ui-danger/20 bg-ui-danger-soft px-3 py-2 text-sm text-ui-danger"
        >
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button
          type="button"
          variant="secondary"
          className="h-11"
          disabled={saving}
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button type="submit" className="h-11" loading={saving}>
          {saving ? "Saving…" : "Add prepared food"}
        </Button>
      </div>
    </form>
  );
}
