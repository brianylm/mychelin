"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ClockIcon,
  StarIcon,
  StarFilledIcon,
  CheckIcon,
  DotsVerticalIcon,
  CounterClockwiseClockIcon,
  Pencil1Icon,
  TrashIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "@radix-ui/react-icons";

interface VersionIngredient {
  name: string;
  quantity?: number;
  unit?: string;
  notes?: string;
}

interface VersionInstruction {
  content?: string;
  text?: string;
  step?: number;
  tip?: string;
  imageUrl?: string;
}

interface Version {
  id: number;
  recipeId: number;
  versionNumber: number;
  versionLabel: string | null;
  captureMethod: string;
  closenessRating: number | null;
  closenessNotes: string | null;
  changeNote: string | null;
  notes: string | null;
  createdAt: string;
  ingredients: VersionIngredient[];
  instructions: VersionInstruction[];
  sourceVersionId: number | null;
}

const labelOf = (v: { versionLabel?: string | null; versionNumber: number }) =>
  v.versionLabel ?? String(v.versionNumber);

interface VersionTimelineProps {
  recipeId: number;
  onCompare?: (baseId: number, compareId: number) => void;
  onVersionSelect?: (version: Version) => void;
}

const METHOD_LABELS: Record<string, string> = {
  ai_capture: "Conversation capture",
  cook_along: "Logged cook",
  attempt_promotion: "Promoted attempt",
  manual: "Manual edit",
  refinement: "Refinement",
};

function ClosenessStars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) =>
        star <= rating
          ? <StarFilledIcon key={star} className="h-3 w-3 text-[#800020]/70" />
          : <StarIcon key={star} className="h-3 w-3 text-neutral-300" />
      )}
    </div>
  );
}

export function VersionTimeline({ recipeId, onCompare, onVersionSelect }: VersionTimelineProps) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [activeVersionId, setActiveVersionId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [menuOpen, setMenuOpen] = useState<number | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [compareSelection, setCompareSelection] = useState<number[]>([]);
  const [editingVersionId, setEditingVersionId] = useState<number | null>(null);
  const [draftChangeNote, setDraftChangeNote] = useState("");
  const [draftNotes, setDraftNotes] = useState("");
  const [savingVersionId, setSavingVersionId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchVersions = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch(`/api/recipes/${recipeId}/versions`);
      if (res.ok) {
        const data = await res.json();
        setVersions(data.versions);
        setActiveVersionId(data.activeVersionId);
      }
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, [recipeId]);

  useEffect(() => { fetchVersions(); }, [fetchVersions]);

  const handleSetDefinitive = async (versionId: number) => {
    setError(null);
    try {
      const res = await fetch(`/api/recipes/${recipeId}/versions/${versionId}/rollback`, { method: "POST" });
      if (res.ok) { setActiveVersionId(versionId); setMenuOpen(null); }
      else {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to set definitive version");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to set definitive version");
    }
  };

  const startEditVersion = (version: Version) => {
    setEditingVersionId(version.id);
    setDraftChangeNote(version.changeNote ?? "");
    setDraftNotes(version.notes ?? "");
    setMenuOpen(null);
  };

  const saveVersion = async (versionId: number) => {
    setSavingVersionId(versionId);
    setError(null);
    try {
      const res = await fetch(`/api/recipes/${recipeId}/versions/${versionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          changeNote: draftChangeNote.trim() || null,
          notes: draftNotes.trim() || null,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to update version");
      }
      setEditingVersionId(null);
      await fetchVersions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update version");
    } finally {
      setSavingVersionId(null);
    }
  };

  const deleteVersion = async (versionId: number) => {
    if (!window.confirm("Delete this version? This cannot be undone.")) return;
    setSavingVersionId(versionId);
    setError(null);
    try {
      const res = await fetch(`/api/recipes/${recipeId}/versions/${versionId}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to delete version");
      }
      setMenuOpen(null);
      await fetchVersions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete version");
    } finally {
      setSavingVersionId(null);
    }
  };

  const handleCompareToggle = (versionId: number) => {
    setCompareSelection((prev) => {
      if (prev.includes(versionId)) return prev.filter((id) => id !== versionId);
      if (prev.length >= 2) return [prev[1], versionId];
      return [...prev, versionId];
    });
  };

  useEffect(() => {
    if (compareSelection.length === 2 && onCompare) {
      onCompare(compareSelection[0], compareSelection[1]);
      setCompareSelection([]);
      setCompareMode(false);
    }
  }, [compareSelection, onCompare]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-neutral-200 bg-white p-4">
        <div className="flex items-center gap-2 text-sm text-neutral-400">
          <ClockIcon className="h-4 w-4" /> Loading versions…
        </div>
      </div>
    );
  }

  if (versions.length === 0) return null;

  const displayVersions = expanded ? versions : versions.slice(0, 3);

  return (
    <section className="border-y border-ui-border">
      <div className="flex min-h-14 items-center justify-between gap-3 border-b border-ui-border">
        <div className="flex items-baseline gap-2">
          <h3 className="text-base font-semibold text-ui-text">Versions</h3>
          <span className="text-xs font-semibold tabular-nums text-ui-muted">
            {versions.length}
          </span>
        </div>
        {versions.length >= 2 && (
          <button
            type="button"
            onClick={() => {
              setCompareMode(!compareMode);
              setCompareSelection([]);
            }}
            className={`inline-flex h-11 items-center rounded-lg px-3 text-xs font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-focus focus-visible:ring-offset-2 ${
              compareMode
                ? "bg-ui-accent-muted text-ui-accent"
                : "text-ui-muted hover:bg-ui-surface-subtle hover:text-ui-text"
            }`}
          >
            Compare
          </button>
        )}
      </div>

      {compareMode && (
        <div className="border-b border-[#800020]/10 bg-[#800020]/5 px-4 py-2 text-xs text-[#800020]">
          Select two versions to compare ({compareSelection.length}/2)
        </div>
      )}

      {error && (
        <div className="border-b border-red-100 bg-red-50 px-4 py-2 text-xs text-red-700">
          {error}
        </div>
      )}

      {/* Timeline */}
      <div className="divide-y divide-ui-border">
        {displayVersions.map((version, index) => {
          const methodLabel = METHOD_LABELS[version.captureMethod] ?? METHOD_LABELS.manual;
          const isActive = version.id === activeVersionId;
          const isAncestor = version.recipeId !== recipeId;
          return (
            <div
              key={version.id}
              className={`relative px-1 py-4 outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ui-focus ${
                isActive ? "bg-ui-accent-muted/60" : "hover:bg-ui-surface-subtle"
              } ${compareMode ? "cursor-pointer" : ""} ${
                compareSelection.includes(version.id)
                  ? "ring-2 ring-inset ring-ui-warning"
                  : ""
              }`}
              role="button"
              tabIndex={0}
              onClick={() => {
                if (compareMode) handleCompareToggle(version.id);
                else onVersionSelect?.(version);
              }}
              onKeyDown={(event) => {
                if (event.target !== event.currentTarget) return;
                if (event.key !== "Enter" && event.key !== " ") return;
                event.preventDefault();
                if (compareMode) handleCompareToggle(version.id);
                else onVersionSelect?.(version);
              }}
            >
              <div className="flex items-start gap-3">
                <div className="mt-1 flex flex-col items-center">
                  <div className={`flex h-7 w-7 items-center justify-center rounded-full text-sm ${
                    isActive ? "bg-[#800020]/50 text-white" : "bg-neutral-100 text-neutral-500"
                  }`}>
                    {isActive ? <CheckIcon className="h-3.5 w-3.5" /> : labelOf(version)}
                  </div>
                  {index < displayVersions.length - 1 && <div className="mt-1 h-4 w-px bg-neutral-200" />}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-ui-text">v{labelOf(version)}</span>
                    <span className="text-[11px] font-medium text-ui-muted">{methodLabel}</span>
                    {isActive && (
                      <span className="rounded-full bg-[#800020]/50 px-1.5 py-0.5 text-[10px] font-semibold text-white">DEFINITIVE</span>
                    )}
                    {isAncestor && (
                      <span className="rounded-full bg-neutral-100 px-1.5 py-0.5 text-[10px] font-semibold text-neutral-500">ANCESTOR</span>
                    )}
                    {version.closenessRating && <ClosenessStars rating={version.closenessRating} />}
                  </div>
                  {version.changeNote && (
                    <p className="mt-0.5 text-xs text-neutral-500 line-clamp-1">{version.changeNote}</p>
                  )}
                  <p className="mt-0.5 text-[11px] text-neutral-400">
                    {new Date(version.createdAt).toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric" })}
                    {version.sourceVersionId && (
                      <span className="ml-1">
                        · forked from v{(() => {
                          const src = versions.find((v) => v.id === version.sourceVersionId);
                          return src ? labelOf(src) : "?";
                        })()}
                      </span>
                    )}
                  </p>
                </div>

                {!compareMode && (
                  <div className="relative">
                    <button
                      onClick={(e) => { e.stopPropagation(); setMenuOpen(menuOpen === version.id ? null : version.id); }}
                      className="flex h-11 w-11 items-center justify-center rounded-lg text-ui-muted transition-colors duration-200 hover:bg-ui-surface-subtle hover:text-ui-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-focus"
                      aria-label={`Actions for version ${labelOf(version)}`}
                    >
                      <DotsVerticalIcon className="h-3.5 w-3.5" />
                    </button>
                    {menuOpen === version.id && (
                      <div className="absolute right-0 top-11 z-10 w-48 rounded-lg border border-ui-border-strong bg-ui-surface-raised py-1 shadow-lg">
                        {!isActive && !isAncestor && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleSetDefinitive(version.id); }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-xs text-neutral-700 hover:bg-neutral-50"
                          >
                            <CounterClockwiseClockIcon className="h-3 w-3" /> Set as definitive
                          </button>
                        )}
                        {!isAncestor && (
                          <button
                            onClick={(e) => { e.stopPropagation(); startEditVersion(version); }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-xs text-neutral-700 hover:bg-neutral-50"
                          >
                            <Pencil1Icon className="h-3 w-3" /> Edit notes
                          </button>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); onVersionSelect?.(version); setMenuOpen(null); }}
                          className="flex w-full items-center gap-2 px-3 py-2 text-xs text-neutral-700 hover:bg-neutral-50"
                        >
                          <ClockIcon className="h-3 w-3" /> View Details
                        </button>
                        {!isActive && !isAncestor && (
                          <button
                            onClick={(e) => { e.stopPropagation(); void deleteVersion(version.id); }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-xs text-red-700 hover:bg-red-50"
                            disabled={savingVersionId === version.id}
                          >
                            <TrashIcon className="h-3 w-3" /> Delete version
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {editingVersionId === version.id && (
                <div
                  className="mt-3 rounded-xl border border-neutral-200 bg-white p-3"
                  onClick={(event) => event.stopPropagation()}
                >
                  <label className="block text-xs font-semibold text-neutral-500">
                    Version note
                    <input
                      value={draftChangeNote}
                      onChange={(event) => setDraftChangeNote(event.target.value)}
                      className="mt-1 h-9 w-full rounded-md border border-neutral-200 px-2 text-sm text-neutral-800"
                    />
                  </label>
                  <label className="mt-2 block text-xs font-semibold text-neutral-500">
                    Details
                    <textarea
                      value={draftNotes}
                      onChange={(event) => setDraftNotes(event.target.value)}
                      rows={2}
                      className="mt-1 w-full resize-none rounded-md border border-neutral-200 px-2 py-2 text-sm text-neutral-800"
                    />
                  </label>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => void saveVersion(version.id)}
                      disabled={savingVersionId === version.id}
                      className="rounded-md bg-[#17131f] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                    >
                      {savingVersionId === version.id ? "Saving..." : "Save version"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingVersionId(null)}
                      className="rounded-md bg-neutral-100 px-3 py-2 text-xs font-semibold text-neutral-700"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {versions.length > 3 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex min-h-11 w-full items-center justify-center gap-1 border-t border-ui-border px-3 py-2 text-xs font-semibold text-ui-muted transition-colors duration-200 hover:bg-ui-surface-subtle hover:text-ui-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ui-focus"
        >
          {expanded
            ? <><ChevronUpIcon className="h-3 w-3" /> Show less</>
            : <><ChevronDownIcon className="h-3 w-3" /> Show all {versions.length} versions</>}
        </button>
      )}
    </section>
  );
}
