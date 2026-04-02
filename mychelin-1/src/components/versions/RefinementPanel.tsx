"use client";

import { useState, useEffect } from "react";
import {
  Cross2Icon,
  StarIcon,
  StarFilledIcon,
  CheckIcon,
  ReloadIcon,
  ChevronRightIcon,
} from "@radix-ui/react-icons";

interface Version {
  id: number;
  versionNumber: number;
  captureMethod: string;
  closenessRating: number | null;
  closenessNotes: string | null;
  ingredients: any[];
  instructions: any[];
  notes: string | null;
}

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

  useEffect(() => { generateSuggestions(); }, []);

  const generateSuggestions = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/capture/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: `Based on this cook-along session for "${recipeTitle}":
Closeness rating: ${version.closenessRating}/5
What was different: ${version.closenessNotes || "No specific notes"}
Current ingredients:
${version.ingredients.map((i: any) => `- ${i.name}: ${i.quantity ?? ""} ${i.unit ?? ""} ${i.notes ? `(${i.notes})` : ""}`).join("\n")}
Please suggest specific ingredient adjustments to make this recipe closer to the original. 
Return a JSON array of suggestions, each with: ingredient, currentAmount, suggestedAmount, reason.
Only suggest changes that address the feedback. Return 2-5 suggestions maximum.
Return ONLY the JSON array, no other text.`,
          mode: "refinement",
        }),
      });
      if (res.ok) {
        const data = await res.json();
        try {
          const parsed = typeof data.suggestions === "string" ? JSON.parse(data.suggestions) : data.suggestions ?? data.ingredients ?? [];
          if (Array.isArray(parsed)) {
            setSuggestions(parsed.slice(0, 5));
            setSelectedSuggestions(new Set(parsed.slice(0, 5).map((_: any, i: number) => i)));
          }
        } catch { generateFallbackSuggestions(); }
      } else { generateFallbackSuggestions(); }
    } catch { generateFallbackSuggestions(); } finally { setLoading(false); }
  };

  const generateFallbackSuggestions = () => {
    const notes = (version.closenessNotes ?? "").toLowerCase();
    const fallback: Suggestion[] = [];
    if (notes.includes("salty") || notes.includes("salt")) {
      const saltIng = version.ingredients.find((i: any) =>
        i.name.toLowerCase().includes("salt") || i.name.toLowerCase().includes("soy sauce") || i.name.toLowerCase().includes("fish sauce"));
      if (saltIng) fallback.push({
        ingredient: saltIng.name,
        currentAmount: `${saltIng.quantity ?? ""} ${saltIng.unit ?? ""}`.trim(),
        suggestedAmount: `${Math.max(0, (saltIng.quantity ?? 1) * 0.7).toFixed(1)} ${saltIng.unit ?? ""}`.trim(),
        reason: "Reduce to address saltiness",
      });
    }
    if (notes.includes("sweet") || notes.includes("sugar")) {
      const sugarIng = version.ingredients.find((i: any) =>
        i.name.toLowerCase().includes("sugar") || i.name.toLowerCase().includes("honey"));
      if (sugarIng) fallback.push({
        ingredient: sugarIng.name,
        currentAmount: `${sugarIng.quantity ?? ""} ${sugarIng.unit ?? ""}`.trim(),
        suggestedAmount: `${Math.max(0, (sugarIng.quantity ?? 1) * 0.75).toFixed(1)} ${sugarIng.unit ?? ""}`.trim(),
        reason: "Reduce sweetness",
      });
    }
    setSuggestions(fallback);
    setSelectedSuggestions(new Set(fallback.map((_, i) => i)));
  };

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
      const refinedIngredients = version.ingredients.map((ing: any) => {
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
          changeNote: `AI refinement based on v${version.versionNumber} cook-along feedback`, setActive: false,
        }),
      });
      if (res.ok) { onComplete?.(); onClose(); }
    } catch { /* silent */ } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div className="relative max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-neutral-100 bg-white px-4 py-3 rounded-t-2xl">
          <div className="flex items-center gap-2">
            <span>✨</span>
            <h3 className="text-sm font-semibold text-neutral-800">AI Refinement</h3>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100">
            <Cross2Icon className="h-4 w-4" />
          </button>
        </div>

        {/* Context */}
        <div className="border-b border-neutral-100 px-4 py-3">
          <div className="rounded-xl bg-amber-50 p-3">
            <div className="flex items-center gap-2 text-xs text-amber-700">
              <span>Based on v{version.versionNumber} cook-along</span>
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
              <p className="mt-1 text-xs text-amber-600 italic">&quot;{version.closenessNotes}&quot;</p>
            )}
          </div>
        </div>

        {/* Suggestions */}
        <div className="px-4 py-3">
          {loading ? (
            <div className="flex flex-col items-center gap-2 py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-amber-600 border-t-transparent" />
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
                  className={`flex w-full items-start gap-3 rounded-xl border px-3 py-3 text-left transition-colors ${
                    selectedSuggestions.has(i) ? "border-amber-400 bg-amber-50/50" : "border-neutral-200 hover:border-neutral-300"
                  }`}>
                  <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                    selectedSuggestions.has(i) ? "border-amber-500 bg-amber-500" : "border-neutral-300"
                  }`}>
                    {selectedSuggestions.has(i) && <CheckIcon className="h-3 w-3 text-white" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-neutral-800">{suggestion.ingredient}</div>
                    <div className="mt-0.5 flex items-center gap-1 text-xs">
                      <span className="text-neutral-400">{suggestion.currentAmount}</span>
                      <ChevronRightIcon className="h-2.5 w-2.5 text-neutral-300" />
                      <span className="font-medium text-amber-700">{suggestion.suggestedAmount}</span>
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
          <div className="sticky bottom-0 flex items-center justify-between border-t border-neutral-100 bg-white px-4 py-3">
            <button onClick={generateSuggestions} disabled={loading}
              className="flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-medium text-neutral-500 hover:bg-neutral-100">
              <ReloadIcon className="h-3 w-3" /> Regenerate
            </button>
            <button onClick={handleApply} disabled={saving || selectedSuggestions.size === 0}
              className="flex items-center gap-1 rounded-xl bg-amber-500 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-amber-600 disabled:opacity-50">
              {saving ? <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <span>✨</span>}
              Apply {selectedSuggestions.size} Suggestion{selectedSuggestions.size !== 1 ? "s" : ""}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
