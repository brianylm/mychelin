"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ChefHat,
  Star,
  ArrowRight,
  ArrowLeft,
  Check,
  Plus,
  Trash2,
} from "lucide-react";

interface Ingredient {
  name: string;
  quantity?: number;
  unit?: string;
  notes?: string;
}

interface Version {
  id: number;
  versionNumber: number;
  ingredients: Ingredient[];
  instructions: any[];
}

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

export function CookAlongCapture({
  recipeId,
  onClose,
  onComplete,
}: CookAlongCaptureProps) {
  const [step, setStep] = useState(0);
  const [versions, setVersions] = useState<Version[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<Version | null>(null);
  const [adjustedIngredients, setAdjustedIngredients] = useState<
    AdjustedIngredient[]
  >([]);
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
          // Auto-select active or latest version
          if (data.versions.length > 0) {
            const active =
              data.versions.find(
                (v: Version) => v.id === data.activeVersionId
              ) ?? data.versions[0];
            setSelectedVersion(active);
          }
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    })();
  }, [recipeId]);

  // Initialize adjusted ingredients when version is selected
  useEffect(() => {
    if (selectedVersion) {
      setAdjustedIngredients(
        selectedVersion.ingredients.map((ing) => ({
          ...ing,
          actualQuantity: ing.quantity,
          actualUnit: ing.unit,
          adjusted: false,
        }))
      );
    }
  }, [selectedVersion]);

  const updateIngredient = useCallback(
    (index: number, field: "actualQuantity" | "actualUnit", value: any) => {
      setAdjustedIngredients((prev) =>
        prev.map((ing, i) =>
          i === index
            ? {
                ...ing,
                [field]: value,
                adjusted: true,
              }
            : ing
        )
      );
    },
    []
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
          changeNote: `Cook-along from v${selectedVersion.versionNumber}`,
          closenessRating: closenessRating || null,
          closenessNotes: closenessNotes || null,
          cookingSessionDate: Math.floor(Date.now() / 1000),
          setActive: false,
        }),
      });

      if (res.ok) {
        onComplete?.();
        onClose();
      }
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-neutral-100 bg-white px-4 py-3 rounded-t-2xl">
          <div className="flex items-center gap-2">
            <ChefHat size={16} className="text-amber-600" />
            <h3 className="text-sm font-semibold text-neutral-800">
              Cook Along
            </h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100"
          >
            <X size={18} />
          </button>
        </div>

        {/* Progress */}
        <div className="flex border-b border-neutral-100 px-4">
          {STEPS.map((s, i) => (
            <div
              key={i}
              className={`flex flex-1 flex-col items-center gap-1 py-2 text-[10px] font-medium ${
                i === step
                  ? "text-amber-700"
                  : i < step
                  ? "text-emerald-600"
                  : "text-neutral-400"
              }`}
            >
              <span className="text-sm">{s.icon}</span>
              <span className="hidden sm:block">{s.label}</span>
              <div
                className={`h-1 w-full rounded-full ${
                  i <= step ? "bg-amber-400" : "bg-neutral-200"
                }`}
              />
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="px-4 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-amber-600 border-t-transparent" />
            </div>
          ) : (
            <AnimatePresence mode="wait">
              {/* Step 0: Choose Version */}
              {step === 0 && (
                <motion.div
                  key="step0"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-3"
                >
                  <p className="text-sm text-neutral-600">
                    Which version are you cooking from?
                  </p>
                  {versions.length === 0 ? (
                    <p className="py-8 text-center text-sm text-neutral-400">
                      No versions yet. Create one first!
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {versions.map((v) => (
                        <button
                          key={v.id}
                          onClick={() => setSelectedVersion(v)}
                          className={`flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors ${
                            selectedVersion?.id === v.id
                              ? "border-amber-400 bg-amber-50"
                              : "border-neutral-200 hover:border-amber-200"
                          }`}
                        >
                          <div
                            className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                              selectedVersion?.id === v.id
                                ? "bg-amber-500 text-white"
                                : "bg-neutral-100 text-neutral-500"
                            }`}
                          >
                            {v.versionNumber}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-neutral-800">
                              Version {v.versionNumber}
                            </div>
                            <div className="text-[11px] text-neutral-400">
                              {v.ingredients.length} ingredients
                            </div>
                          </div>
                          {selectedVersion?.id === v.id && (
                            <Check
                              size={16}
                              className="ml-auto text-amber-600"
                            />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {/* Step 1: Adjust Ingredients */}
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-3"
                >
                  <p className="text-sm text-neutral-600">
                    Note the actual measurements you used while cooking:
                  </p>
                  <div className="space-y-2">
                    {adjustedIngredients.map((ing, i) => (
                      <div
                        key={i}
                        className={`rounded-xl border px-3 py-2.5 ${
                          ing.adjusted
                            ? "border-amber-300 bg-amber-50/50"
                            : "border-neutral-200"
                        }`}
                      >
                        <div className="mb-1.5 text-sm font-medium text-neutral-800">
                          {ing.name}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1">
                            <label className="text-[10px] uppercase tracking-wide text-neutral-400">
                              Recipe says
                            </label>
                            <div className="text-xs text-neutral-500">
                              {ing.quantity} {ing.unit}
                            </div>
                          </div>
                          <ArrowRight size={12} className="text-neutral-300" />
                          <div className="flex-1">
                            <label className="text-[10px] uppercase tracking-wide text-neutral-400">
                              I used
                            </label>
                            <div className="flex gap-1">
                              <input
                                type="number"
                                step="any"
                                value={ing.actualQuantity ?? ""}
                                onChange={(e) =>
                                  updateIngredient(
                                    i,
                                    "actualQuantity",
                                    e.target.value
                                      ? parseFloat(e.target.value)
                                      : undefined
                                  )
                                }
                                className="w-16 rounded-lg border border-neutral-200 px-2 py-1 text-xs focus:border-amber-400 focus:outline-none"
                              />
                              <input
                                type="text"
                                value={ing.actualUnit ?? ""}
                                onChange={(e) =>
                                  updateIngredient(
                                    i,
                                    "actualUnit",
                                    e.target.value
                                  )
                                }
                                className="w-14 rounded-lg border border-neutral-200 px-2 py-1 text-xs focus:border-amber-400 focus:outline-none"
                                placeholder="unit"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Step 2: Rate & Notes */}
              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <div>
                    <p className="mb-2 text-sm font-medium text-neutral-700">
                      How close was this to the &quot;real&quot; recipe?
                    </p>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onClick={() => setClosenessRating(star)}
                          className="rounded-lg p-1 transition-transform hover:scale-110"
                        >
                          <Star
                            size={28}
                            className={
                              star <= closenessRating
                                ? "fill-amber-400 text-amber-400"
                                : "text-neutral-300"
                            }
                          />
                        </button>
                      ))}
                    </div>
                    <div className="mt-1 flex justify-between text-[10px] text-neutral-400">
                      <span>Way off</span>
                      <span>Spot on!</span>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-neutral-700">
                      What was different?
                    </label>
                    <textarea
                      value={closenessNotes}
                      onChange={(e) => setClosenessNotes(e.target.value)}
                      placeholder="e.g., too salty, needed more garlic, texture was off..."
                      rows={3}
                      className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none"
                    />
                  </div>
                </motion.div>
              )}

              {/* Step 3: Summary & Save */}
              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <div className="rounded-xl bg-amber-50 p-4">
                    <h4 className="mb-2 text-sm font-semibold text-amber-800">
                      Session Summary
                    </h4>
                    <div className="space-y-1 text-xs text-amber-700">
                      <p>
                        Cooked from: v{selectedVersion?.versionNumber}
                      </p>
                      <p>
                        Adjusted:{" "}
                        {adjustedIngredients.filter((i) => i.adjusted).length}{" "}
                        ingredients
                      </p>
                      {closenessRating > 0 && (
                        <div className="flex items-center gap-1">
                          <span>Closeness:</span>
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              size={10}
                              className={
                                s <= closenessRating
                                  ? "fill-amber-600 text-amber-600"
                                  : "text-amber-300"
                              }
                            />
                          ))}
                        </div>
                      )}
                      {closenessNotes && <p>Notes: {closenessNotes}</p>}
                    </div>
                  </div>

                  <p className="text-xs text-neutral-500">
                    This will create a new &quot;cook along&quot; version with
                    your actual measurements for future reference.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>

        {/* Navigation */}
        <div className="sticky bottom-0 flex items-center justify-between border-t border-neutral-100 bg-white px-4 py-3">
          <button
            onClick={() => (step === 0 ? onClose() : setStep(step - 1))}
            className="flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-medium text-neutral-500 hover:bg-neutral-100"
          >
            <ArrowLeft size={12} />
            {step === 0 ? "Cancel" : "Back"}
          </button>

          {step < 3 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={step === 0 && !selectedVersion}
              className="flex items-center gap-1 rounded-xl bg-amber-500 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-amber-600 disabled:opacity-50"
            >
              Next
              <ArrowRight size={12} />
            </button>
          ) : (
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1 rounded-xl bg-amber-500 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-amber-600 disabled:opacity-50"
            >
              {saving ? (
                <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <Check size={12} />
              )}
              Save Version
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
