"use client";

import { useState, useEffect, type ComponentType } from "react";
import {
  StarIcon,
  StarFilledIcon,
  PlusIcon,
  MinusIcon,
  ReloadIcon,
} from "@radix-ui/react-icons";
import { ArrowLeftRight, X } from "lucide-react";

interface IngredientDiff {
  name: string;
  status: "added" | "removed" | "changed" | "unchanged";
  base?: { name: string; quantity?: number; unit?: string; notes?: string };
  compare?: { name: string; quantity?: number; unit?: string; notes?: string };
  percentChange?: number;
}

interface VersionInstruction {
  step?: number;
  content?: string;
  text?: string;
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

const STATUS_CONFIG: Record<string, { bg: string; text: string; Icon: ComponentType<{ className?: string }> | null }> = {
  added: { bg: "bg-emerald-50", text: "text-emerald-700", Icon: PlusIcon },
  removed: { bg: "bg-red-50", text: "text-red-700", Icon: MinusIcon },
  changed: { bg: "bg-[#800020]/5", text: "text-[#800020]", Icon: ReloadIcon },
  unchanged: { bg: "bg-white", text: "text-neutral-500", Icon: null },
};

function ClosenessStars({ rating }: { rating: number | null }) {
  if (!rating) return <span className="text-xs text-neutral-400">No rating</span>;
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) =>
        star <= rating
          ? <StarFilledIcon key={star} className="h-2.5 w-2.5 text-[#800020]/70" />
          : <StarIcon key={star} className="h-2.5 w-2.5 text-neutral-300" />
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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-stone-950/45 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div className="relative max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-lg border border-[var(--ui-border-strong)] bg-[var(--ui-surface-raised)] shadow-xl sm:rounded-lg" role="dialog" aria-modal="true" aria-labelledby="version-compare-title" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 z-10 flex min-h-16 items-center justify-between border-b border-[var(--ui-border)] bg-[var(--ui-surface-raised)] px-4 py-2">
          <div className="flex items-center gap-2">
            <ArrowLeftRight className="h-5 w-5 text-[var(--ui-accent)]" aria-hidden="true" />
            <h3 id="version-compare-title" className="text-sm font-semibold text-[var(--ui-text)]">Compare versions</h3>
          </div>
          <button onClick={onClose} className="flex h-11 w-11 items-center justify-center rounded-lg text-[var(--ui-muted)] transition-colors hover:bg-[var(--ui-surface-subtle)] hover:text-[var(--ui-text)]" aria-label="Close version comparison">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#800020] border-t-transparent" />
          </div>
        ) : data ? (
          <div>
            {/* Version headers */}
            <div className="grid grid-cols-2 gap-px border-b border-neutral-100 bg-neutral-100">
              <div className="bg-white px-4 py-3">
                <div className="text-xs font-medium text-neutral-500">Base</div>
                <div className="text-sm font-semibold text-neutral-800">v{labelOf(data.base)}</div>
                <ClosenessStars rating={data.base.closenessRating} />
              </div>
              <div className="bg-white px-4 py-3">
                <div className="text-xs font-medium text-neutral-500">Compare</div>
                <div className="text-sm font-semibold text-neutral-800">v{labelOf(data.compare)}</div>
                <ClosenessStars rating={data.compare.closenessRating} />
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-neutral-100">
              {(["ingredients", "instructions", "notes"] as const).map((t) => (
                <button key={t} onClick={() => setTab(t)}
                  className={`min-h-11 flex-1 py-2 text-xs font-medium capitalize transition-colors ${
                    tab === t ? "border-b-2 border-amber-500 text-[#800020]" : "text-neutral-500 hover:text-neutral-700"
                  }`}>{t}</button>
              ))}
            </div>

            <div className="px-4 py-3">
              {tab === "ingredients" && (
                <div className="space-y-1.5">
                  {data.ingredientDiffs.length === 0 ? (
                    <p className="py-4 text-center text-xs text-neutral-400">No ingredient data to compare</p>
                  ) : data.ingredientDiffs.map((diff, i) => {
                    const cfg = STATUS_CONFIG[diff.status];
                    const Icon = cfg.Icon;
                    return (
                      <div key={i} className={`flex items-center gap-2 rounded-lg px-3 py-2 ${cfg.bg}`}>
                        {Icon && <Icon className={`h-3 w-3 ${cfg.text}`} />}
                        <div className="min-w-0 flex-1">
                          <span className={`text-sm font-medium ${cfg.text}`}>{diff.name}</span>
                          {diff.status === "changed" && (
                            <div className="mt-0.5 flex gap-3 text-[11px]">
                              <span className="text-neutral-400">
                                {diff.base?.quantity} {diff.base?.unit} → {diff.compare?.quantity} {diff.compare?.unit}
                              </span>
                              {diff.percentChange !== undefined && (
                                <span className={diff.percentChange > 0 ? "text-emerald-600" : "text-red-600"}>
                                  {diff.percentChange > 0 ? "+" : ""}{diff.percentChange}%
                                </span>
                              )}
                            </div>
                          )}
                          {diff.status === "removed" && diff.base && (
                            <div className="mt-0.5 text-[11px] text-neutral-400">Was: {diff.base.quantity} {diff.base.unit}</div>
                          )}
                          {diff.status === "added" && diff.compare && (
                            <div className="mt-0.5 text-[11px] text-neutral-400">{diff.compare.quantity} {diff.compare.unit}</div>
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
                      <div className="mb-2 text-[11px] font-medium uppercase tracking-wide text-neutral-400">v{col.label}</div>
                      {col.items.length === 0 ? (
                        <p className="text-xs text-neutral-400 italic">No instructions</p>
                      ) : (
                        <ol className="space-y-2">
                          {col.items.map((inst, i) => (
                            <li key={i} className="text-xs leading-relaxed text-neutral-700">
                              <span className="mr-1 font-semibold text-[#800020]">{inst.step ?? i + 1}.</span>
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
                      <div className="mb-2 text-[11px] font-medium uppercase tracking-wide text-neutral-400">v{col.label}</div>
                      <p className="text-xs leading-relaxed text-neutral-600">
                        {col.text || <span className="italic text-neutral-400">No notes</span>}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {data.ingredientDiffs.some((d) => d.status !== "unchanged") && (
              <div className="border-t border-neutral-100 px-4 py-3">
                <div className="flex flex-wrap gap-2 text-[11px]">
                  {(() => {
                    const added = data.ingredientDiffs.filter((d) => d.status === "added").length;
                    const removed = data.ingredientDiffs.filter((d) => d.status === "removed").length;
                    const changed = data.ingredientDiffs.filter((d) => d.status === "changed").length;
                    return (<>
                      {added > 0 && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-700">+{added} added</span>}
                      {removed > 0 && <span className="rounded-full bg-red-100 px-2 py-0.5 text-red-700">-{removed} removed</span>}
                      {changed > 0 && <span className="rounded-full bg-[#800020]/10 px-2 py-0.5 text-[#800020]">~{changed} changed</span>}
                    </>);
                  })()}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="py-12 text-center text-sm text-neutral-500">Failed to load comparison</div>
        )}
      </div>
    </div>
  );
}
