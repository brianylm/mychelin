"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  X,
} from "lucide-react";
import { HalfStarRating } from "@/components/recipes/HalfStarRating";
import { requestLeftovers } from "@/lib/leftovers-prompt";

interface Ingredient {
  name: string;
  quantity?: number;
  unit?: string;
  notes?: string;
}

interface VersionInstruction {
  content: string;
  stepNumber?: number;
  tip?: string | null;
}

interface Version {
  id: number;
  versionNumber: number;
  versionLabel: string | null;
  ingredients: Ingredient[];
  instructions: VersionInstruction[];
}

const labelOf = (v: { versionLabel?: string | null; versionNumber: number }) =>
  v.versionLabel ?? String(v.versionNumber);

interface AdjustedIngredient extends Ingredient {
  actualQuantity?: number;
  actualUnit?: string;
  adjusted: boolean;
}

interface CookAlongCaptureProps {
  recipeId: number;
  recipeTitle?: string;
  onClose: () => void;
  onComplete?: (mode: "attempt_only" | "attempt_and_version") => void;
}

const STEPS = [
  { label: "Choose version", icon: "📋" },
  { label: "Adjust amounts", icon: "🍳" },
  { label: "Rate & notes", icon: "⭐" },
  { label: "Save", icon: "✅" },
];

function formatAmount(quantity?: number, unit?: string) {
  return [quantity ?? "agak-agak", unit].filter(Boolean).join(" ");
}

function describeIngredientChange(ingredient: AdjustedIngredient) {
  return ingredient.name + ": " + formatAmount(ingredient.quantity, ingredient.unit) + " -> " + formatAmount(ingredient.actualQuantity, ingredient.actualUnit);
}

function buildAttemptNotes(closenessRating: number, closenessNotes: string) {
  const parts: string[] = [];
  if (closenessRating > 0) parts.push("Closeness: " + closenessRating.toFixed(1).replace(".0", "") + "/5");
  if (closenessNotes.trim()) parts.push(closenessNotes.trim());
  return parts.length ? parts.join("\n") : null;
}

export function CookAlongCapture({ recipeId, recipeTitle, onClose, onComplete }: CookAlongCaptureProps) {
  const [step, setStep] = useState(0);
  const [versions, setVersions] = useState<Version[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<Version | null>(null);
  const [adjustedIngredients, setAdjustedIngredients] = useState<AdjustedIngredient[]>([]);
  const [closenessRating, setClosenessRating] = useState(0);
  const [closenessNotes, setClosenessNotes] = useState("");
  const [saveMode, setSaveMode] = useState<"attempt_only" | "attempt_and_version">("attempt_and_version");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/recipes/${recipeId}/versions`);
        if (res.ok) {
          const data = await res.json();
          setVersions(data.versions);
          if (data.versions.length > 0) {
            const active = data.versions.find((v: Version) => v.id === data.activeVersionId) ?? data.versions[0];
            setSelectedVersion(active);
          }
        }
      } catch { /* silent */ } finally {
        setLoading(false);
      }
    })();
  }, [recipeId]);

  useEffect(() => {
    if (selectedVersion) {
      setAdjustedIngredients(
        selectedVersion.ingredients.map((ing) => ({
          ...ing, actualQuantity: ing.quantity, actualUnit: ing.unit, adjusted: false,
        }))
      );
    }
  }, [selectedVersion]);

  const updateIngredient = useCallback(
    (index: number, field: "actualQuantity" | "actualUnit", value: number | string | undefined) => {
      setAdjustedIngredients((prev) =>
        prev.map((ing, i) => (i === index ? { ...ing, [field]: value, adjusted: true } : ing))
      );
    }, []
  );

  const handleSave = async () => {
    if (!selectedVersion) return;
    setSaving(true);
    setError(null);
    try {
      const actualIngredients = adjustedIngredients.map((ing) => ({
        name: ing.name,
        quantity: ing.adjusted ? ing.actualQuantity : ing.quantity,
        unit: ing.adjusted ? ing.actualUnit : ing.unit,
        notes: ing.adjusted
          ? `${ing.notes ? ing.notes + " | " : ""}Originally: ${ing.quantity} ${ing.unit}`
          : ing.notes,
      }));
      const changedIngredientNotes = adjustedIngredients
        .filter((ing) => ing.adjusted)
        .map(describeIngredientChange);
      const cookedAt = new Date().toISOString();
      const attemptNotes = buildAttemptNotes(closenessRating, closenessNotes);

      if (saveMode === "attempt_only") {
        const response = await fetch(`/api/recipes/${recipeId}/attempts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            versionId: selectedVersion.id,
            notes: attemptNotes,
            changeNotes: changedIngredientNotes,
            ingredientsSnapshot: actualIngredients,
            instructionsSnapshot: selectedVersion.instructions,
            cookedAt,
            source: "log_cook",
          }),
        });
        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body.error || "Failed to save attempt");
        }
        requestLeftovers({ recipeId, title: recipeTitle ?? "this dish", mealPlanId: null });
        onComplete?.("attempt_only");
        onClose();
        return;
      }

      const res = await fetch(`/api/recipes/${recipeId}/versions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseVersionId: selectedVersion.id,
          captureMethod: "cook_along",
          ingredients: actualIngredients,
          instructions: selectedVersion.instructions,
          changeNote: `Logged cook from v${labelOf(selectedVersion)}`,
          closenessRating: closenessRating || null,
          closenessNotes: closenessNotes || null,
          cookingSessionDate: Math.floor(new Date(cookedAt).getTime() / 1000),
          createAttempt: true,
          attemptNotes,
          attemptChangeNotes: changedIngredientNotes,
          attemptCookedAt: cookedAt,
          setActive: false,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to save cooked version");
      }
      requestLeftovers({ recipeId, title: recipeTitle ?? "this dish", mealPlanId: null });
      onComplete?.("attempt_and_version");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save cooked version");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ui-scrim sm:items-center" onClick={onClose}>
      <div
        className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-ui-surface-raised sm:rounded-2xl animate-in slide-in-from-bottom"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-ui-border bg-ui-surface-raised px-4 py-3 rounded-t-2xl">
          <div className="flex items-center gap-2">
            <span>👨‍🍳</span>
            <h3 className="text-sm font-semibold text-ui-text">Log cook</h3>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-ui-muted hover:bg-ui-surface-subtle">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Progress */}
        <div className="flex border-b border-ui-border px-4">
          {STEPS.map((s, i) => (
            <div key={i} className={`flex flex-1 flex-col items-center gap-1 py-2 text-[10px] font-medium ${
              i === step ? "text-ui-accent" : i < step ? "text-ui-success" : "text-ui-muted"
            }`}>
              <span className="text-sm">{s.icon}</span>
              <span className="hidden sm:block">{s.label}</span>
              <div className={`h-1 w-full rounded-full ${i <= step ? "bg-ui-warning" : "bg-ui-border"}`} />
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="px-4 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-ui-accent border-t-transparent" />
            </div>
          ) : (
            <>
              {/* Step 0: Choose Version */}
              {step === 0 && (
                <div className="space-y-3">
                  <p className="text-sm text-ui-muted">Which version did you cook from?</p>
                  {versions.length === 0 ? (
                    <p className="py-8 text-center text-sm text-ui-muted">No versions yet. Create one first!</p>
                  ) : (
                    <div className="space-y-2">
                      {versions.map((v) => (
                        <button
                          key={v.id}
                          onClick={() => setSelectedVersion(v)}
                          className={`flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors ${
                            selectedVersion?.id === v.id ? "border-ui-accent bg-ui-accent-muted" : "border-ui-border hover:border-ui-border-strong"
                          }`}
                        >
                          <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                            selectedVersion?.id === v.id ? "bg-ui-accent text-ui-action-text" : "bg-ui-surface-subtle text-ui-muted"
                          }`}>{labelOf(v)}</div>
                          <div>
                            <div className="text-sm font-medium text-ui-text">Version {labelOf(v)}</div>
                            <div className="text-[11px] text-ui-muted">{v.ingredients.length} ingredients</div>
                          </div>
                          {selectedVersion?.id === v.id && <Check className="ml-auto h-4 w-4 text-ui-accent" aria-hidden="true" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Step 1: Adjust Ingredients */}
              {step === 1 && (
                <div className="space-y-3">
                  <p className="text-sm text-ui-muted">Record any actual measurements you used. Changed ingredients become attempt notes automatically.</p>
                  <div className="space-y-2">
                    {adjustedIngredients.map((ing, i) => (
                      <div key={i} className={`rounded-xl border px-3 py-3 ${ing.adjusted ? "border-ui-accent bg-ui-accent-muted" : "border-ui-border"}`}>
                        <div className="mb-2 text-sm font-medium text-ui-text">{ing.name}</div>
                        <div className="flex items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <label className="mb-1 block text-xs font-semibold text-ui-muted">Recipe says</label>
                            <div className="rounded-lg bg-ui-surface-subtle px-2.5 py-1.5 text-xs text-ui-muted">
                              {ing.quantity ?? "—"} {ing.unit ?? ""}
                            </div>
                          </div>
                          <ArrowRight className="mt-5 h-3 w-3 shrink-0 text-ui-muted" aria-hidden="true" />
                          <div className="flex-1 min-w-0">
                            <label className="mb-1 block text-xs font-semibold text-ui-accent">I used</label>
                            <div className="flex gap-1">
                              <input
                                type="number"
                                step="any"
                                value={ing.actualQuantity ?? ""}
                                onChange={(e) => updateIngredient(i, "actualQuantity", e.target.value ? parseFloat(e.target.value) : undefined)}
                                placeholder="qty"
                                className="w-16 rounded-lg border border-ui-border-strong bg-ui-surface-raised px-2 py-1.5 text-xs text-ui-text outline-none transition focus:border-ui-accent focus:ring-2 focus:ring-ui-focus-soft placeholder:text-ui-muted"
                              />
                              <input
                                type="text"
                                value={ing.actualUnit ?? ""}
                                onChange={(e) => updateIngredient(i, "actualUnit", e.target.value)}
                                placeholder="unit"
                                className="w-16 rounded-lg border border-ui-border-strong bg-ui-surface-raised px-2 py-1.5 text-xs text-ui-text outline-none transition focus:border-ui-accent focus:ring-2 focus:ring-ui-focus-soft placeholder:text-ui-muted"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 2: Rate & Notes */}
              {step === 2 && (
                <div className="space-y-4">
                  <div>
                    <p className="mb-2 text-sm font-medium text-ui-text">How close was this cook to the version you want?</p>
                    <HalfStarRating
                      value={closenessRating || null}
                      onChange={setClosenessRating}
                      ariaLabel="Version closeness rating"
                      leftLabel="Way off"
                      rightLabel="Spot on"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-ui-text">What was different?</label>
                    <textarea value={closenessNotes} onChange={(e) => setClosenessNotes(e.target.value)}
                      placeholder="e.g., too salty, needed more garlic, texture was off..."
                      rows={3} className="w-full rounded-xl border border-ui-border px-3 py-2 text-sm focus:border-ui-accent focus:outline-none" />
                  </div>
                </div>
              )}

              {/* Step 3: Summary & Save */}
              {step === 3 && (
                <div className="space-y-4">
                  <div className="rounded-xl bg-ui-accent-muted p-4">
                    <h4 className="mb-2 text-sm font-semibold text-ui-text">Cook log summary</h4>
                    <div className="space-y-1 text-xs text-ui-accent">
                      <p>Cooked from: v{selectedVersion ? labelOf(selectedVersion) : ""}</p>
                      <p>Adjusted: {adjustedIngredients.filter((i) => i.adjusted).length} ingredients</p>
                      <p>Attempt: will be saved to cooking log</p>
                      {closenessRating > 0 && (
                        <div className="flex items-center gap-1">
                          <span>Closeness:</span>
                          <span>{closenessRating.toFixed(1).replace(".0", "")}/5</span>
                        </div>
                      )}
                      {closenessNotes && <p>Notes: {closenessNotes}</p>}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-ui-muted">Save as</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => setSaveMode("attempt_and_version")}
                        className={"rounded-xl border px-3 py-3 text-left transition " + (saveMode === "attempt_and_version" ? "border-ui-accent bg-ui-accent-muted" : "border-ui-border bg-ui-surface-raised hover:border-ui-border-strong")}
                      >
                        <span className="text-sm font-semibold text-ui-text">Attempt + version</span>
                        <span className="mt-1 block text-xs leading-5 text-ui-muted">Use this when the cook changed the recipe enough to preserve a new version.</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSaveMode("attempt_only")}
                        className={"rounded-xl border px-3 py-3 text-left transition " + (saveMode === "attempt_only" ? "border-ui-accent bg-ui-accent-muted" : "border-ui-border bg-ui-surface-raised hover:border-ui-border-strong")}
                      >
                        <span className="text-sm font-semibold text-ui-text">Attempt only</span>
                        <span className="mt-1 block text-xs leading-5 text-ui-muted">Use this when you cooked it but are not ready to change the recipe.</span>
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-ui-muted">
                    New versions are not definitive unless you set them later.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {error && (
          <p className="mx-4 mb-3 rounded-xl border border-ui-border bg-ui-danger-soft px-3 py-2 text-sm text-ui-danger">
            {error}
          </p>
        )}

        {/* Navigation */}
        <div className="sticky bottom-0 flex items-center justify-between border-t border-ui-border bg-ui-surface-raised px-4 py-3">
          <button onClick={() => (step === 0 ? onClose() : setStep(step - 1))}
            className="flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-medium text-ui-muted hover:bg-ui-surface-subtle">
            <ArrowLeft className="h-3 w-3" aria-hidden="true" />
            {step === 0 ? "Cancel" : "Back"}
          </button>
          {step < 3 ? (
            <button onClick={() => setStep(step + 1)} disabled={step === 0 && !selectedVersion}
              className="flex items-center gap-1 rounded-xl bg-ui-accent px-4 py-2 text-xs font-semibold text-ui-action-text transition-colors hover:bg-ui-action disabled:opacity-50">
              Next <ArrowRight className="h-3 w-3" aria-hidden="true" />
            </button>
          ) : (
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-1 rounded-xl bg-ui-accent px-4 py-2 text-xs font-semibold text-ui-action-text transition-colors hover:bg-ui-action disabled:opacity-50">
              {saving
                ? <div className="h-3 w-3 animate-spin rounded-full border-2 border-ui-action-text border-t-transparent" />
                : <Check className="h-3 w-3" aria-hidden="true" />}
              {saveMode === "attempt_only" ? "Save attempt" : "Save attempt + version"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
