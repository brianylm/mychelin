"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ChevronDown,
  ChevronUp,
  Clock,
  EllipsisVertical,
  History,
  Pencil,
  Star,
  Trash2,
} from "lucide-react";

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
  ai_capture: "AI Capture",
  cook_along: "Logged Cook",
  attempt_promotion: "Promoted Attempt",
  manual: "Manual Edit",
  refinement: "Refinement",
};

function ClosenessStars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) =>
        star <= rating
          ? <Star key={star} className="h-3 w-3 text-ui-accent" fill="currentColor" />
          : <Star key={star} className="h-3 w-3 text-ui-muted" />
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
      <div className="rounded-2xl border border-ui-border bg-ui-surface-raised p-4">
        <div className="flex items-center gap-2 text-sm text-ui-muted">
          <Clock className="h-4 w-4" aria-hidden="true" /> Loading versions…
        </div>
      </div>
    );
  }

  if (versions.length === 0) return null;

  const displayVersions = expanded ? versions : versions.slice(0, 3);

  return (
    <div className="rounded-2xl border border-ui-border bg-ui-surface-raised">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-ui-text">Versions</h3>
        </div>
        {versions.length >= 2 && (
          <button
            onClick={() => { setCompareMode(!compareMode); setCompareSelection([]); }}
            className={`flex min-h-11 items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium transition-colors ${
              compareMode ? "bg-ui-accent-muted text-ui-accent" : "text-ui-muted hover:bg-ui-surface-subtle"
            }`}
          >⇄ Compare</button>
        )}
      </div>

      {compareMode && (
        <div className="px-4 py-2 text-sm text-ui-muted">
          Select two versions to compare ({compareSelection.length}/2)
        </div>
      )}

      {error && (
        <div className="px-4 py-2 text-sm text-ui-danger">
          {error}
        </div>
      )}

      {/* Timeline */}
      <div className="space-y-4 px-4">
        {displayVersions.map((version) => {
          const method = METHOD_LABELS[version.captureMethod] ?? METHOD_LABELS.manual;
          const isActive = version.id === activeVersionId;
          const isAncestor = version.recipeId !== recipeId;
          return (
            <div
              key={version.id}
              className={`relative py-3 transition-colors ${
                isActive ? "text-ui-accent" : "hover:bg-ui-surface-subtle"
              } ${compareMode ? "cursor-pointer" : ""} ${
                compareSelection.includes(version.id) ? "ring-2 ring-inset ring-ui-warning" : ""
              }`}
              onClick={() => {
                if (compareMode) handleCompareToggle(version.id);
                else onVersionSelect?.(version);
              }}
            >
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-ui-muted">{method}</span>
                    <span className="text-sm font-medium text-ui-text">v{labelOf(version)}</span>
                    {isActive && (
                      <span className="text-sm text-ui-accent">Definitive</span>
                    )}
                    {isAncestor && (
                      <span className="text-sm text-ui-muted">Ancestor</span>
                    )}
                    {version.closenessRating && <ClosenessStars rating={version.closenessRating} />}
                  </div>
                  {version.changeNote && (
                    <p className="mt-0.5 text-xs text-ui-muted line-clamp-1">{version.changeNote}</p>
                  )}
                  <p className="mt-0.5 text-[11px] text-ui-muted">
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
                      className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-ui-muted hover:bg-ui-surface-subtle hover:text-ui-muted"
                    >
                      <EllipsisVertical className="h-3.5 w-3.5" />
                    </button>
                    {menuOpen === version.id && (
                      <div className="absolute right-0 top-8 z-10 w-40 rounded-xl border border-ui-border bg-ui-surface-raised py-1">
                        {!isActive && !isAncestor && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleSetDefinitive(version.id); }}
                            className="flex min-h-11 w-full items-center gap-2 px-3 py-2 text-xs text-ui-text hover:bg-ui-surface-subtle"
                          >
                            <History className="h-3 w-3" aria-hidden="true" /> Set as definitive
                          </button>
                        )}
                        {!isAncestor && (
                          <button
                            onClick={(e) => { e.stopPropagation(); startEditVersion(version); }}
                            className="flex min-h-11 w-full items-center gap-2 px-3 py-2 text-xs text-ui-text hover:bg-ui-surface-subtle"
                          >
                            <Pencil className="h-3 w-3" aria-hidden="true" /> Edit notes
                          </button>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); onVersionSelect?.(version); setMenuOpen(null); }}
                          className="flex min-h-11 w-full items-center gap-2 px-3 py-2 text-xs text-ui-text hover:bg-ui-surface-subtle"
                        >
                          <Clock className="h-3 w-3" aria-hidden="true" /> View Details
                        </button>
                        {!isActive && !isAncestor && (
                          <button
                            onClick={(e) => { e.stopPropagation(); void deleteVersion(version.id); }}
                            className="flex min-h-11 w-full items-center gap-2 px-3 py-2 text-xs text-ui-danger hover:bg-ui-danger-soft"
                            disabled={savingVersionId === version.id}
                          >
                            <Trash2 className="h-3 w-3" aria-hidden="true" /> Delete version
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {editingVersionId === version.id && (
                <div
                  className="mt-6 space-y-4"
                  onClick={(event) => event.stopPropagation()}
                >
                  <label className="block text-xs font-semibold text-ui-muted">
                    Version note
                    <input
                      value={draftChangeNote}
                      onChange={(event) => setDraftChangeNote(event.target.value)}
                      className="mt-1 h-9 w-full rounded-md border border-ui-border px-2 text-sm text-ui-text"
                    />
                  </label>
                  <label className="mt-2 block text-xs font-semibold text-ui-muted">
                    Details
                    <textarea
                      value={draftNotes}
                      onChange={(event) => setDraftNotes(event.target.value)}
                      rows={2}
                      className="mt-1 w-full resize-none rounded-md border border-ui-border px-2 py-2 text-sm text-ui-text"
                    />
                  </label>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => void saveVersion(version.id)}
                      disabled={savingVersionId === version.id}
                      className="rounded-md bg-ui-action px-3 py-2 text-xs font-semibold text-ui-action-text disabled:opacity-50"
                    >
                      {savingVersionId === version.id ? "Saving..." : "Save version"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingVersionId(null)}
                      className="rounded-md bg-ui-surface-subtle px-3 py-2 text-xs font-semibold text-ui-text"
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
          className="flex min-h-11 w-full items-center justify-center gap-1 py-2 text-xs font-medium text-ui-muted hover:bg-ui-surface-subtle"
        >
          {expanded
            ? <><ChevronUp className="h-3 w-3" aria-hidden="true" /> Show less</>
            : <><ChevronDown className="h-3 w-3" aria-hidden="true" /> Show all {versions.length} versions</>}
        </button>
      )}
    </div>
  );
}
