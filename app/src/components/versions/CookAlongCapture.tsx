"use client";

import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, ArrowRight, Check, ClipboardCheck, ListChecks, MessageSquareText, Save, Scale, X } from "lucide-react";
import { HalfStarRating } from "@/components/recipes/HalfStarRating";

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
  onClose: () => void;
  onComplete?: (mode: "attempt_only" | "attempt_and_version") => void;
}

const STEPS = [
  { label: "Choose version", icon: ListChecks },
  { label: "Adjust amounts", icon: Scale },
  { label: "Rate & notes", icon: MessageSquareText },
  { label: "Save", icon: Save },
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

export function CookAlongCapture({ recipeId, onClose, onComplete }: CookAlongCaptureProps) {
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
      onComplete?.("attempt_and_version");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save cooked version");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-stone-950/45 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-lg border border-[var(--ui-border-strong)] bg-[var(--ui-surface-raised)] shadow-xl animate-in slide-in-from-bottom sm:rounded-lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="log-cook-title"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex min-h-16 items-center justify-between border-b border-[var(--ui-border)] bg-[var(--ui-surface-raised)] px-4 py-2">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-[var(--ui-accent)]" aria-hidden="true" />
            <h3 id="log-cook-title" className="text-sm font-semibold text-[var(--ui-text)]">Log cook</h3>
          </div>
          <button onClick={onClose} className="flex h-11 w-11 items-center justify-center rounded-lg text-[var(--ui-muted)] transition-colors hover:bg-[var(--ui-surface-subtle)] hover:text-[var(--ui-text)]" aria-label="Close log cook">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Progress */}
        <div className="flex border-b border-neutral-100 px-4">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            return (
            <div key={i} className={`flex flex-1 flex-col items-center gap-1 py-2 text-[10px] font-medium ${
              i === step ? "text-[#800020]" : i < step ? "text-emerald-600" : "text-neutral-400"
            }`}>
              <Icon className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:block">{s.label}</span>
              <div className={`h-1 w-full rounded-full ${i <= step ? "bg-amber-400" : "bg-neutral-200"}`} />
            </div>
            );
          })}
        </div>

        {/* Content */}
        <div className="px-4 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#800020] border-t-transparent" />
            </div>
          ) : (
            <>
              {/* Step 0: Choose Version */}
              {step === 0 && (
                <div className="space-y-3">
                  <p className="text-sm text-neutral-600">Which version did you cook from?</p>
                  {versions.length === 0 ? (
                    <p className="py-8 text-center text-sm text-neutral-400">No versions yet. Create one first!</p>
                  ) : (
                    <div className="space-y-2">
                      {versions.map((v) => (
                        <button
                          key={v.id}
                          onClick={() => setSelectedVersion(v)}
                          className={`flex min-h-16 w-full items-center gap-3 rounded-lg border px-3 py-3 text-left transition-colors ${
                            selectedVersion?.id === v.id ? "border-[#800020]/45 bg-[#800020]/5" : "border-neutral-200 hover:border-[#800020]/15"
                          }`}
                        >
                          <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                            selectedVersion?.id === v.id ? "bg-[#800020]/50 text-white" : "bg-neutral-100 text-neutral-500"
                          }`}>{labelOf(v)}</div>
                          <div>
                            <div className="text-sm font-medium text-neutral-800">Version {labelOf(v)}</div>
                            <div className="text-[11px] text-neutral-400">{v.ingredients.length} ingredients</div>
                          </div>
                          {selectedVersion?.id === v.id && <Check className="ml-auto h-4 w-4 text-[var(--ui-accent)]" aria-hidden="true" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Step 1: Adjust Ingredients */}
              {step === 1 && (
                <div className="space-y-3">
                  <p className="text-sm text-neutral-600">Record any actual measurements you used. Changed ingredients become attempt notes automatically.</p>
                  <div className="space-y-2">
                    {adjustedIngredients.map((ing, i) => (
                      <div key={i} className={`rounded-xl border px-3 py-3 ${ing.adjusted ? "border-[#800020]/30 bg-[#800020]/5" : "border-neutral-200"}`}>
                        <div className="mb-2 text-sm font-medium text-neutral-800">{ing.name}</div>
                        <div className="flex items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-neutral-400">Recipe says</label>
                            <div className="flex min-h-11 items-center rounded-lg bg-[var(--ui-surface-subtle)] px-2.5 text-xs text-[var(--ui-muted)]">
                              {ing.quantity ?? "—"} {ing.unit ?? ""}
                            </div>
                          </div>
                          <ArrowRight className="mt-7 h-4 w-4 shrink-0 text-neutral-300" aria-hidden="true" />
                          <div className="flex-1 min-w-0">
                            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[#800020]">I used</label>
                            <div className="grid grid-cols-2 gap-1">
                              <input
                                type="number"
                                step="any"
                                value={ing.actualQuantity ?? ""}
                                onChange={(e) => updateIngredient(i, "actualQuantity", e.target.value ? parseFloat(e.target.value) : undefined)}
                                placeholder="qty"
                                className="h-11 min-w-0 w-full rounded-lg border border-[var(--ui-border-strong)] bg-[var(--ui-surface-raised)] px-2 text-xs text-[var(--ui-text)] outline-none focus:border-[var(--ui-accent)] focus:ring-2 focus:ring-[var(--ui-focus)] placeholder:text-[var(--ui-muted)]"
                              />
                              <input
                                type="text"
                                value={ing.actualUnit ?? ""}
                                onChange={(e) => updateIngredient(i, "actualUnit", e.target.value)}
                                placeholder="unit"
                                className="h-11 min-w-0 w-full rounded-lg border border-[var(--ui-border-strong)] bg-[var(--ui-surface-raised)] px-2 text-xs text-[var(--ui-text)] outline-none focus:border-[var(--ui-accent)] focus:ring-2 focus:ring-[var(--ui-focus)] placeholder:text-[var(--ui-muted)]"
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
                    <p className="mb-2 text-sm font-medium text-neutral-700">How close was this cook to the version you want?</p>
                    <HalfStarRating
                      value={closenessRating || null}
                      onChange={setClosenessRating}
                      ariaLabel="Version closeness rating"
                      leftLabel="Way off"
                      rightLabel="Spot on"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-neutral-700">What was different?</label>
                    <textarea value={closenessNotes} onChange={(e) => setClosenessNotes(e.target.value)}
                      placeholder="e.g., too salty, needed more garlic, texture was off..."
                      rows={3} className="w-full rounded-lg border border-[var(--ui-border-strong)] bg-[var(--ui-surface-raised)] px-3 py-2 text-sm focus:border-[var(--ui-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--ui-focus)]" />
                  </div>
                </div>
              )}

              {/* Step 3: Summary & Save */}
              {step === 3 && (
                <div className="space-y-4">
                  <div className="border-l-2 border-[var(--ui-accent)] bg-[var(--ui-accent-muted)] px-4 py-3">
                    <h4 className="mb-2 text-sm font-semibold text-[#521224]">Cook log summary</h4>
                    <div className="space-y-1 text-xs text-[#800020]">
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
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">Save as</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => setSaveMode("attempt_and_version")}
                        className={"min-h-24 rounded-lg border px-3 py-3 text-left transition-colors " + (saveMode === "attempt_and_version" ? "border-[#800020]/40 bg-[#800020]/5" : "border-neutral-200 bg-white hover:border-[#800020]/20")}
                      >
                        <span className="text-sm font-semibold text-neutral-900">Attempt + version</span>
                        <span className="mt-1 block text-xs leading-5 text-neutral-500">Use this when the cook changed the recipe enough to preserve a new version.</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSaveMode("attempt_only")}
                        className={"min-h-24 rounded-lg border px-3 py-3 text-left transition-colors " + (saveMode === "attempt_only" ? "border-[#800020]/40 bg-[#800020]/5" : "border-neutral-200 bg-white hover:border-[#800020]/20")}
                      >
                        <span className="text-sm font-semibold text-neutral-900">Attempt only</span>
                        <span className="mt-1 block text-xs leading-5 text-neutral-500">Use this when you cooked it but are not ready to change the recipe.</span>
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-neutral-500">
                    New versions are not definitive unless you set them later.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {error && (
          <p className="mx-4 mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {error}
          </p>
        )}

        {/* Navigation */}
        <div className="sticky bottom-0 flex items-center justify-between gap-2 border-t border-[var(--ui-border)] bg-[var(--ui-surface-raised)] px-4 py-3">
          <button onClick={() => (step === 0 ? onClose() : setStep(step - 1))}
            className="flex h-11 items-center gap-2 rounded-lg px-3 text-xs font-semibold text-[var(--ui-muted)] transition-colors hover:bg-[var(--ui-surface-subtle)]">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {step === 0 ? "Cancel" : "Back"}
          </button>
          {step < 3 ? (
            <button onClick={() => setStep(step + 1)} disabled={step === 0 && !selectedVersion}
              className="flex h-11 items-center gap-2 rounded-lg bg-[var(--ui-action)] px-4 text-xs font-semibold text-[var(--ui-action-text)] transition-colors hover:bg-[var(--ui-action-hover)] disabled:opacity-50">
              Next <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          ) : (
            <button onClick={handleSave} disabled={saving}
              className="flex h-11 items-center gap-2 rounded-lg bg-[var(--ui-action)] px-4 text-xs font-semibold text-[var(--ui-action-text)] transition-colors hover:bg-[var(--ui-action-hover)] disabled:opacity-50">
              {saving
                ? <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                : <Check className="h-4 w-4" aria-hidden="true" />}
              {saveMode === "attempt_only" ? "Save attempt" : "Save attempt + version"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
