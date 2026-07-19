"use client";

import { useCallback, useEffect, useState } from "react";
import {
  StarIcon,
  StarFilledIcon,
} from "@radix-ui/react-icons";
import { Check, ChevronRight, RefreshCw, WandSparkles, X } from "lucide-react";

interface VersionIngredient {
  name: string;
  quantity?: number;
  unit?: string;
  notes?: string;
}

interface Version {
  id: number;
  versionNumber: number;
  versionLabel: string | null;
  captureMethod: string;
  closenessRating: number | null;
  closenessNotes: string | null;
  ingredients: VersionIngredient[];
  instructions: unknown[];
  notes: string | null;
}

const labelOf = (v: { versionLabel?: string | null; versionNumber: number }) =>
  v.versionLabel ?? String(v.versionNumber);

interface Suggestion {
  ingredient: string;
  currentAmount: string;
  suggestedAmount: string;
  reason: string;
}

interface RefinementPanelProps {
  recipeId: number;
  recipeTitle: string;
  version: Version;
  onClose: () => void;
  onComplete?: () => void;
}

export function RefinementPanel({ recipeId, recipeTitle, version, onClose, onComplete }: RefinementPanelProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<number>>(new Set());

  const generateFallbackSuggestions = useCallback(() => {
    const notes = (version.closenessNotes ?? "").toLowerCase();
    const fallback: Suggestion[] = [];
    if (notes.includes("salty") || notes.includes("salt")) {
      const saltIngredient = version.ingredients.find((ingredient) => {
        const name = ingredient.name.toLowerCase();
        return name.includes("salt") || name.includes("soy sauce") || name.includes("fish sauce");
      });
      if (saltIngredient) {
        fallback.push({
          ingredient: saltIngredient.name,
          currentAmount: `${saltIngredient.quantity ?? ""} ${saltIngredient.unit ?? ""}`.trim(),
          suggestedAmount: `${Math.max(0, (saltIngredient.quantity ?? 1) * 0.7).toFixed(1)} ${saltIngredient.unit ?? ""}`.trim(),
          reason: "Reduce to address saltiness",
        });
      }
    }
    if (notes.includes("sweet") || notes.includes("sugar")) {
      const sugarIngredient = version.ingredients.find((ingredient) => {
        const name = ingredient.name.toLowerCase();
        return name.includes("sugar") || name.includes("honey");
      });
      if (sugarIngredient) {
        fallback.push({
          ingredient: sugarIngredient.name,
          currentAmount: `${sugarIngredient.quantity ?? ""} ${sugarIngredient.unit ?? ""}`.trim(),
          suggestedAmount: `${Math.max(0, (sugarIngredient.quantity ?? 1) * 0.75).toFixed(1)} ${sugarIngredient.unit ?? ""}`.trim(),
          reason: "Reduce sweetness",
        });
      }
    }
    setSuggestions(fallback);
    setSelectedSuggestions(new Set(fallback.map((_, index) => index)));
  }, [version.closenessNotes, version.ingredients]);

  const generateSuggestions = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/capture/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: `Based on this cook-along session for "${recipeTitle}":
Closeness rating: ${version.closenessRating}/5
What was different: ${version.closenessNotes || "No specific notes"}
Current ingredients:
${version.ingredients.map((ingredient) => `- ${ingredient.name}: ${ingredient.quantity ?? ""} ${ingredient.unit ?? ""} ${ingredient.notes ? `(${ingredient.notes})` : ""}`).join("\n")}
Please suggest specific ingredient adjustments to make this recipe closer to the original.
Return a JSON array of suggestions, each with: ingredient, currentAmount, suggestedAmount, reason.
Only suggest changes that address the feedback. Return 2-5 suggestions maximum.
Return ONLY the JSON array, no other text.`,
          mode: "refinement",
        }),
      });
      if (!response.ok) {
        generateFallbackSuggestions();
        return;
      }

      const data = await response.json();
      try {
        const parsed = typeof data.suggestions === "string"
          ? JSON.parse(data.suggestions)
          : data.suggestions ?? data.ingredients ?? [];
        if (Array.isArray(parsed)) {
          const nextSuggestions = parsed.slice(0, 5) as Suggestion[];
          setSuggestions(nextSuggestions);
          setSelectedSuggestions(new Set(nextSuggestions.map((_, index) => index)));
        }
      } catch {
        generateFallbackSuggestions();
      }
    } catch {
      generateFallbackSuggestions();
    } finally {
      setLoading(false);
    }
  }, [generateFallbackSuggestions, recipeTitle, version.closenessNotes, version.closenessRating, version.ingredients]);

  useEffect(() => {
    void generateSuggestions();
  }, [generateSuggestions]);

  const toggleSuggestion = (index: number) => {
    setSelectedSuggestions((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index); else next.add(index);
      return next;
    });
  };

  const handleApply = async () => {
    setSaving(true);
    try {
      const refinedIngredients = version.ingredients.map((ing) => {
        const suggestion = suggestions.find((s, i) =>
          selectedSuggestions.has(i) && s.ingredient.toLowerCase() === ing.name.toLowerCase());
        if (suggestion) {
          const match = suggestion.suggestedAmount.match(/^([\d.]+)\s*(.*)$/);
          if (match) return { ...ing, quantity: parseFloat(match[1]), unit: match[2] || ing.unit, notes: `${ing.notes ? ing.notes + " | " : ""}Refined: ${suggestion.reason}` };
        }
        return ing;
      });
      const res = await fetch(`/api/recipes/${recipeId}/versions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseVersionId: version.id, captureMethod: "refinement", ingredients: refinedIngredients,
          instructions: version.instructions, notes: version.notes,
          changeNote: `AI refinement based on v${labelOf(version)} cook-along feedback`, setActive: false,
        }),
      });
      if (res.ok) { onComplete?.(); onClose(); }
    } catch { /* silent */ } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-stone-950/45 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div className="relative max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-lg border border-[var(--ui-border-strong)] bg-[var(--ui-surface-raised)] shadow-xl sm:rounded-lg" role="dialog" aria-modal="true" aria-labelledby="refinement-title" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 z-10 flex min-h-16 items-center justify-between border-b border-[var(--ui-border)] bg-[var(--ui-surface-raised)] px-4 py-2">
          <div className="flex items-center gap-2">
            <WandSparkles className="h-5 w-5 text-[var(--ui-accent)]" aria-hidden="true" />
            <h3 id="refinement-title" className="text-sm font-semibold text-[var(--ui-text)]">Suggested refinement</h3>
          </div>
          <button onClick={onClose} className="flex h-11 w-11 items-center justify-center rounded-lg text-[var(--ui-muted)] transition-colors hover:bg-[var(--ui-surface-subtle)] hover:text-[var(--ui-text)]" aria-label="Close suggested refinement">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Context */}
        <div className="border-b border-neutral-100 px-4 py-3">
          <div className="border-l-2 border-[var(--ui-accent)] bg-[var(--ui-accent-muted)] px-3 py-2">
            <div className="flex items-center gap-2 text-xs text-[#800020]">
              <span>Based on v{labelOf(version)} cook-along</span>
              {version.closenessRating && (
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) =>
                    s <= version.closenessRating!
                      ? <StarFilledIcon key={s} className="h-2.5 w-2.5 text-amber-500" />
                      : <StarIcon key={s} className="h-2.5 w-2.5 text-amber-300" />
                  )}
                </div>
              )}
            </div>
            {version.closenessNotes && (
              <p className="mt-1 text-xs text-[#800020] italic">&quot;{version.closenessNotes}&quot;</p>
            )}
          </div>
        </div>

        {/* Suggestions */}
        <div className="px-4 py-3">
          {loading ? (
            <div className="flex flex-col items-center gap-2 py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#800020] border-t-transparent" />
              <p className="text-xs text-neutral-500">Generating suggestions…</p>
            </div>
          ) : suggestions.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-neutral-500">No specific suggestions could be generated.</p>
              <p className="mt-1 text-xs text-neutral-400">Try adding more detailed notes about what was different.</p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="mb-3 text-xs text-neutral-500">Select which suggestions to apply:</p>
              {suggestions.map((suggestion, i) => (
                <button key={i} onClick={() => toggleSuggestion(i)}
                  className={`flex min-h-16 w-full items-start gap-3 rounded-lg border px-3 py-3 text-left transition-colors ${
                    selectedSuggestions.has(i) ? "border-[#800020]/45 bg-[#800020]/5" : "border-neutral-200 hover:border-neutral-300"
                  }`}>
                  <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                    selectedSuggestions.has(i) ? "border-amber-500 bg-[#800020]/50" : "border-neutral-300"
                  }`}>
                    {selectedSuggestions.has(i) && <Check className="h-3 w-3 text-white" aria-hidden="true" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-neutral-800">{suggestion.ingredient}</div>
                    <div className="mt-0.5 flex items-center gap-1 text-xs">
                      <span className="text-neutral-400">{suggestion.currentAmount}</span>
                      <ChevronRight className="h-3 w-3 text-neutral-300" aria-hidden="true" />
                      <span className="font-medium text-[#800020]">{suggestion.suggestedAmount}</span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-neutral-500">{suggestion.reason}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        {suggestions.length > 0 && (
          <div className="sticky bottom-0 flex items-center justify-between gap-2 border-t border-[var(--ui-border)] bg-[var(--ui-surface-raised)] px-4 py-3">
            <button onClick={generateSuggestions} disabled={loading}
              className="flex h-11 items-center gap-2 rounded-lg px-3 text-xs font-semibold text-[var(--ui-muted)] transition-colors hover:bg-[var(--ui-surface-subtle)]">
              <RefreshCw className="h-4 w-4" aria-hidden="true" /> Regenerate
            </button>
            <button onClick={handleApply} disabled={saving || selectedSuggestions.size === 0}
              className="flex h-11 items-center gap-2 rounded-lg bg-[var(--ui-action)] px-4 text-xs font-semibold text-[var(--ui-action-text)] transition-colors hover:bg-[var(--ui-action-hover)] disabled:opacity-50">
              {saving ? <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <WandSparkles className="h-4 w-4" aria-hidden="true" />}
              Apply {selectedSuggestions.size} Suggestion{selectedSuggestions.size !== 1 ? "s" : ""}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
