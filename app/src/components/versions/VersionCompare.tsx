"use client";

import { useState, useEffect } from "react";
import {
  Minus,
  Plus,
  RotateCw,
  Star,
  X,
} from "lucide-react";

interface IngredientDiff {
  name: string;
  status: "added" | "removed" | "changed" | "unchanged";
  base?: { name: string; quantity?: number; unit?: string; notes?: string };
  compare?: { name: string; quantity?: number; unit?: string; notes?: string };
  percentChange?: number;
}

interface VersionInstruction {
  content?: string;
  text?: string;
  step?: number;
  tip?: string;
  imageUrl?: string;
}

interface CompareData {
  base: { id: number; versionNumber: number; versionLabel: string | null; captureMethod: string; closenessRating: number | null; createdAt: string };
  compare: { id: number; versionNumber: number; versionLabel: string | null; captureMethod: string; closenessRating: number | null; createdAt: string };
  ingredientDiffs: IngredientDiff[];
  baseInstructions: VersionInstruction[];
  compareInstructions: VersionInstruction[];
  baseNotes: string | null;
  compareNotes: string | null;
}

const labelOf = (v: { versionLabel?: string | null; versionNumber: number }) =>
  v.versionLabel ?? String(v.versionNumber);

interface VersionCompareProps {
  recipeId: number;
  baseVersionId: number;
  compareVersionId: number;
  onClose: () => void;
}

type StatusIcon = typeof Plus | null;

const STATUS_CONFIG: Record<
  IngredientDiff["status"],
  { text: string; Icon: StatusIcon }
> = {
  added: { text: "text-ui-success", Icon: Plus },
  removed: { text: "text-ui-danger", Icon: Minus },
  changed: { text: "text-ui-accent", Icon: RotateCw },
  unchanged: { text: "text-ui-muted", Icon: null },
};

function ClosenessStars({ rating }: { rating: number | null }) {
  if (!rating) return <span className="text-xs text-ui-muted">No rating</span>;
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) =>
        star <= rating
          ? <Star key={star} className="h-2.5 w-2.5 text-ui-accent" fill="currentColor" />
          : <Star key={star} className="h-2.5 w-2.5 text-ui-muted" />
      )}
    </div>
  );
}

export function VersionCompare({ recipeId, baseVersionId, compareVersionId, onClose }: VersionCompareProps) {
  const [data, setData] = useState<CompareData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"ingredients" | "instructions" | "notes">("ingredients");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/recipes/${recipeId}/versions/compare?base=${baseVersionId}&compare=${compareVersionId}`);
        if (res.ok) setData(await res.json());
      } catch { /* silent */ } finally {
        setLoading(false);
      }
    })();
  }, [recipeId, baseVersionId, compareVersionId]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ui-scrim sm:items-center" onClick={onClose}>
      <div className="relative max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-ui-surface-raised sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-ui-border bg-ui-surface-raised px-4 py-3 rounded-t-2xl">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-ui-text">Compare Versions</h3>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-ui-muted hover:bg-ui-surface-subtle">
            <X className="h-4 w-4" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-ui-accent border-t-transparent" />
          </div>
        ) : data ? (
          <div>
            {/* Version headers */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-ui-surface-raised px-4 py-3">
                <div className="text-xs font-medium text-ui-muted">Base</div>
                <div className="text-sm font-semibold text-ui-text">v{labelOf(data.base)}</div>
                <ClosenessStars rating={data.base.closenessRating} />
              </div>
              <div className="bg-ui-surface-raised px-4 py-3">
                <div className="text-xs font-medium text-ui-muted">Compare</div>
                <div className="text-sm font-semibold text-ui-text">v{labelOf(data.compare)}</div>
                <ClosenessStars rating={data.compare.closenessRating} />
              </div>
            </div>

            {/* Tabs */}
            <div className="flex">
              {(["ingredients", "instructions", "notes"] as const).map((t) => (
                <button key={t} onClick={() => setTab(t)}
                  className={`flex min-h-11 flex-1 items-center justify-center rounded-lg py-2.5 text-xs font-medium capitalize transition-colors ${
                    tab === t ? "border-b-2 border-ui-warning text-ui-accent" : "text-ui-muted hover:text-ui-text"
                  }`}>{t}</button>
              ))}
            </div>

            <div className="px-4 py-3">
              {tab === "ingredients" && (
                <div className="space-y-1.5">
                  {data.ingredientDiffs.length === 0 ? (
                    <p className="py-4 text-center text-xs text-ui-muted">No ingredient data to compare</p>
                  ) : data.ingredientDiffs.map((diff, i) => {
                    const cfg = STATUS_CONFIG[diff.status];
                    const Icon = cfg.Icon;
                    return (
                      <div key={i} className={`flex items-center gap-2 px-0 py-2 ${cfg.text}`}>
                        {Icon && <Icon className={`h-3 w-3 ${cfg.text}`} aria-hidden="true" />}
                        <div className="min-w-0 flex-1">
                          <span className={`text-sm font-medium ${cfg.text}`}>{diff.name}</span>
                          {diff.status === "changed" && (
                            <div className="mt-0.5 flex gap-3 text-[11px]">
                              <span className="text-ui-muted">
                                {diff.base?.quantity} {diff.base?.unit} → {diff.compare?.quantity} {diff.compare?.unit}
                              </span>
                              {diff.percentChange !== undefined && (
                                <span className={diff.percentChange > 0 ? "text-ui-success" : "text-ui-danger"}>
                                  {diff.percentChange > 0 ? "+" : ""}{diff.percentChange}%
                                </span>
                              )}
                            </div>
                          )}
                          {diff.status === "removed" && diff.base && (
                            <div className="mt-0.5 text-[11px] text-ui-muted">Was: {diff.base.quantity} {diff.base.unit}</div>
                          )}
                          {diff.status === "added" && diff.compare && (
                            <div className="mt-0.5 text-[11px] text-ui-muted">{diff.compare.quantity} {diff.compare.unit}</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {tab === "instructions" && (
                <div className="grid grid-cols-2 gap-3">
                  {[{ label: labelOf(data.base), items: data.baseInstructions }, { label: labelOf(data.compare), items: data.compareInstructions }].map((col, ci) => (
                    <div key={ci}>
                      <div className="mb-2 text-xs font-medium text-ui-muted">v{col.label}</div>
                      {col.items.length === 0 ? (
                        <p className="text-xs text-ui-muted">No instructions</p>
                      ) : (
                        <ol className="space-y-2">
                          {col.items.map((inst, i) => (
                            <li key={i} className="text-xs leading-relaxed text-ui-text">
                              <span className="mr-1 font-semibold text-ui-accent">{inst.step ?? i + 1}.</span>
                              {inst.content ?? inst.text}
                            </li>
                          ))}
                        </ol>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {tab === "notes" && (
                <div className="grid grid-cols-2 gap-3">
                  {[{ label: labelOf(data.base), text: data.baseNotes }, { label: labelOf(data.compare), text: data.compareNotes }].map((col, ci) => (
                    <div key={ci}>
                      <div className="mb-2 text-xs font-medium text-ui-muted">v{col.label}</div>
                      <p className="text-xs leading-relaxed text-ui-muted">
                        {col.text || <span className="text-ui-muted">No notes</span>}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {data.ingredientDiffs.some((d) => d.status !== "unchanged") && (
              <div className="px-4 py-3">
                <div className="flex flex-wrap gap-2 text-[11px]">
                  {(() => {
                    const added = data.ingredientDiffs.filter((d) => d.status === "added").length;
                    const removed = data.ingredientDiffs.filter((d) => d.status === "removed").length;
                    const changed = data.ingredientDiffs.filter((d) => d.status === "changed").length;
                    return (<>
                      {added > 0 && <span className="text-ui-success">+{added} added</span>}
                      {removed > 0 && <span className="text-ui-danger">-{removed} removed</span>}
                      {changed > 0 && <span className="text-ui-accent">~{changed} changed</span>}
                    </>);
                  })()}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="py-12 text-center text-sm text-ui-muted">Failed to load comparison</div>
        )}
      </div>
    </div>
  );
}
