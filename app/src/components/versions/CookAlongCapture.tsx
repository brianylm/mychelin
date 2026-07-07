"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Cross2Icon,
  ArrowRightIcon,
  ArrowLeftIcon,
  CheckIcon,
} from "@radix-ui/react-icons";
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
  onComplete?: () => void;
}

const STEPS = [
  { label: "Choose Version", icon: "📋" },
  { label: "Cook & Adjust", icon: "🍳" },
  { label: "Rate & Notes", icon: "⭐" },
  { label: "Save", icon: "✅" },
];

export function CookAlongCapture({ recipeId, onClose, onComplete }: CookAlongCaptureProps) {
  const [step, setStep] = useState(0);
  const [versions, setVersions] = useState<Version[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<Version | null>(null);
  const [adjustedIngredients, setAdjustedIngredients] = useState<AdjustedIngredient[]>([]);
  const [closenessRating, setClosenessRating] = useState(0);
  const [closenessNotes, setClosenessNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

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
    try {
      const actualIngredients = adjustedIngredients.map((ing) => ({
        name: ing.name,
        quantity: ing.adjusted ? ing.actualQuantity : ing.quantity,
        unit: ing.adjusted ? ing.actualUnit : ing.unit,
        notes: ing.adjusted
          ? `${ing.notes ? ing.notes + " | " : ""}Originally: ${ing.quantity} ${ing.unit}`
          : ing.notes,
      }));
      const res = await fetch(`/api/recipes/${recipeId}/versions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseVersionId: selectedVersion.id,
          captureMethod: "cook_along",
          ingredients: actualIngredients,
          instructions: selectedVersion.instructions,
          changeNote: `Cook-along from v${labelOf(selectedVersion)}`,
          closenessRating: closenessRating || null,
          closenessNotes: closenessNotes || null,
          cookingSessionDate: Math.floor(Date.now() / 1000),
          setActive: false,
        }),
      });
      if (res.ok) { onComplete?.(); onClose(); }
    } catch { /* silent */ } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div
        className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white sm:rounded-2xl animate-in slide-in-from-bottom"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-neutral-100 bg-white px-4 py-3 rounded-t-2xl">
          <div className="flex items-center gap-2">
            <span>👨‍🍳</span>
            <h3 className="text-sm font-semibold text-neutral-800">Cook Along</h3>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100">
            <Cross2Icon className="h-4 w-4" />
          </button>
        </div>

        {/* Progress */}
        <div className="flex border-b border-neutral-100 px-4">
          {STEPS.map((s, i) => (
            <div key={i} className={`flex flex-1 flex-col items-center gap-1 py-2 text-[10px] font-medium ${
              i === step ? "text-[#800020]" : i < step ? "text-emerald-600" : "text-neutral-400"
            }`}>
              <span className="text-sm">{s.icon}</span>
              <span className="hidden sm:block">{s.label}</span>
              <div className={`h-1 w-full rounded-full ${i <= step ? "bg-amber-400" : "bg-neutral-200"}`} />
            </div>
          ))}
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
                  <p className="text-sm text-neutral-600">Which version are you cooking from?</p>
                  {versions.length === 0 ? (
                    <p className="py-8 text-center text-sm text-neutral-400">No versions yet. Create one first!</p>
                  ) : (
                    <div className="space-y-2">
                      {versions.map((v) => (
                        <button
                          key={v.id}
                          onClick={() => setSelectedVersion(v)}
                          className={`flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors ${
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
                          {selectedVersion?.id === v.id && <CheckIcon className="ml-auto h-4 w-4 text-[#800020]" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Step 1: Adjust Ingredients */}
              {step === 1 && (
                <div className="space-y-3">
                  <p className="text-sm text-neutral-600">Note the actual measurements you used:</p>
                  <div className="space-y-2">
                    {adjustedIngredients.map((ing, i) => (
                      <div key={i} className={`rounded-xl border px-3 py-3 ${ing.adjusted ? "border-[#800020]/30 bg-[#800020]/5" : "border-neutral-200"}`}>
                        <div className="mb-2 text-sm font-medium text-neutral-800">{ing.name}</div>
                        <div className="flex items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-neutral-400">Recipe says</label>
                            <div className="rounded-lg bg-neutral-100 px-2.5 py-1.5 text-xs text-neutral-600">
                              {ing.quantity ?? "—"} {ing.unit ?? ""}
                            </div>
                          </div>
                          <ArrowRightIcon className="mt-5 h-3 w-3 shrink-0 text-neutral-300" />
                          <div className="flex-1 min-w-0">
                            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[#800020]">I used</label>
                            <div className="flex gap-1">
                              <input
                                type="number"
                                step="any"
                                value={ing.actualQuantity ?? ""}
                                onChange={(e) => updateIngredient(i, "actualQuantity", e.target.value ? parseFloat(e.target.value) : undefined)}
                                placeholder="qty"
                                className="w-16 rounded-lg border border-neutral-300 bg-white px-2 py-1.5 text-xs text-neutral-900 shadow-sm outline-none transition focus:border-[#800020]/45 focus:ring-2 focus:ring-[#800020]/10 placeholder:text-neutral-300"
                              />
                              <input
                                type="text"
                                value={ing.actualUnit ?? ""}
                                onChange={(e) => updateIngredient(i, "actualUnit", e.target.value)}
                                placeholder="unit"
                                className="w-16 rounded-lg border border-neutral-300 bg-white px-2 py-1.5 text-xs text-neutral-900 shadow-sm outline-none transition focus:border-[#800020]/45 focus:ring-2 focus:ring-[#800020]/10 placeholder:text-neutral-300"
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
                    <p className="mb-2 text-sm font-medium text-neutral-700">How close was this to the &quot;real&quot; recipe?</p>
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
                      rows={3} className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:border-[#800020]/45 focus:outline-none" />
                  </div>
                </div>
              )}

              {/* Step 3: Summary & Save */}
              {step === 3 && (
                <div className="space-y-4">
                  <div className="rounded-xl bg-[#800020]/5 p-4">
                    <h4 className="mb-2 text-sm font-semibold text-[#521224]">Session Summary</h4>
                    <div className="space-y-1 text-xs text-[#800020]">
                      <p>Cooked from: v{selectedVersion ? labelOf(selectedVersion) : ""}</p>
                      <p>Adjusted: {adjustedIngredients.filter((i) => i.adjusted).length} ingredients</p>
                      {closenessRating > 0 && (
                        <div className="flex items-center gap-1">
                          <span>Closeness:</span>
                          <span>{closenessRating.toFixed(1).replace(".0", "")}/5</span>
                        </div>
                      )}
                      {closenessNotes && <p>Notes: {closenessNotes}</p>}
                    </div>
                  </div>
                  <p className="text-xs text-neutral-500">
                    This will create a new &quot;cook along&quot; version with your actual measurements.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Navigation */}
        <div className="sticky bottom-0 flex items-center justify-between border-t border-neutral-100 bg-white px-4 py-3">
          <button onClick={() => (step === 0 ? onClose() : setStep(step - 1))}
            className="flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-medium text-neutral-500 hover:bg-neutral-100">
            <ArrowLeftIcon className="h-3 w-3" />
            {step === 0 ? "Cancel" : "Back"}
          </button>
          {step < 3 ? (
            <button onClick={() => setStep(step + 1)} disabled={step === 0 && !selectedVersion}
              className="flex items-center gap-1 rounded-xl bg-[#800020]/50 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#17131f] disabled:opacity-50">
              Next <ArrowRightIcon className="h-3 w-3" />
            </button>
          ) : (
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-1 rounded-xl bg-[#800020]/50 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#17131f] disabled:opacity-50">
              {saving
                ? <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                : <CheckIcon className="h-3 w-3" />}
              Save Version
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
