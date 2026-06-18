"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowUpRight, ChevronUp, History, Pencil, Star, Trash2 } from "lucide-react";
import { Button, EmptyState, Panel } from "@/components/ui";
import { HalfStarRating } from "./HalfStarRating";

interface RecipeAttempt {
  id: number;
  cookedAt: string;
  rating: number | null;
  dishRating: number | null;
  notes: string | null;
  nextTime: string | null;
  changeNotes: string[];
  promotedVersionId: number | null;
}

interface AttemptHistoryProps {
  recipeId: number;
  refreshKey?: number;
  onPromoted?: () => void;
}

function formatCookedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-SG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function RatingPill({ rating, label }: { rating: number | null; label: string }) {
  if (!rating) return <span className="text-xs text-[var(--ui-muted)]">Unrated</span>;

  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-[#f7c86a]/20 px-2 py-1 text-xs font-semibold text-[#5a3500]">
      <Star className="h-3.5 w-3.5 fill-[#f7c86a] text-[#c68a18]" />
      {label}: {rating.toFixed(1).replace(".0", "")}/5
    </span>
  );
}

export function AttemptHistory({ recipeId, refreshKey, onPromoted }: AttemptHistoryProps) {
  const [attempts, setAttempts] = useState<RecipeAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [promotingId, setPromotingId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [visibleCount, setVisibleCount] = useState(5);
  const [draftRating, setDraftRating] = useState("");
  const [draftNotes, setDraftNotes] = useState("");
  const [draftNextTime, setDraftNextTime] = useState("");
  const [error, setError] = useState<string | null>(null);

  const loadAttempts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/recipes/" + recipeId + "/attempts");
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Failed to load attempts");
      }
      const data = await response.json();
      setAttempts(Array.isArray(data) ? data : []);
      setVisibleCount(5);
      setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load attempts");
    } finally {
      setLoading(false);
    }
  }, [recipeId]);

  useEffect(() => {
    void loadAttempts();
  }, [loadAttempts, refreshKey]);

  const promoteAttempt = useCallback(async (attemptId: number) => {
    const attempt = attempts.find((item) => item.id === attemptId);
    setPromotingId(attemptId);
    setError(null);
    try {
      const response = await fetch("/api/recipes/" + recipeId + "/attempts/" + attemptId + "/promote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          setActive: false,
          changeNote: attempt?.nextTime
            ? "Promoted next-time changes: " + attempt.nextTime
            : undefined,
        }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Failed to promote attempt to version");
      }
      await loadAttempts();
      onPromoted?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to promote attempt to version");
    } finally {
      setPromotingId(null);
    }
  }, [attempts, loadAttempts, onPromoted, recipeId]);

  const startEdit = useCallback((attempt: RecipeAttempt) => {
    setEditingId(attempt.id);
    setDraftRating(attempt.rating ? String(attempt.rating) : "");
    setDraftNotes(attempt.notes ?? "");
    setDraftNextTime(attempt.nextTime ?? "");
  }, []);

  const saveEdit = useCallback(async (attemptId: number) => {
    setSavingId(attemptId);
    setError(null);
    try {
      const response = await fetch("/api/recipes/" + recipeId + "/attempts/" + attemptId, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating: draftRating.trim() ? Number(draftRating) : null,
          notes: draftNotes.trim() || null,
          nextTime: draftNextTime.trim() || null,
        }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Failed to update attempt");
      }
      await loadAttempts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update attempt");
    } finally {
      setSavingId(null);
    }
  }, [draftNextTime, draftNotes, draftRating, loadAttempts, recipeId]);

  const saveDishRating = useCallback(async (attemptId: number, rating: number) => {
    setSavingId(attemptId);
    setError(null);
    try {
      const response = await fetch("/api/recipes/" + recipeId + "/attempts/" + attemptId, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dishRating: rating }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Failed to save dish rating");
      }
      setAttempts((current) =>
        current.map((attempt) =>
          attempt.id === attemptId ? { ...attempt, dishRating: rating } : attempt
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save dish rating");
    } finally {
      setSavingId(null);
    }
  }, [recipeId]);

  const deleteAttempt = useCallback(async (attemptId: number) => {
    if (!window.confirm("Delete this attempt? This cannot be undone.")) return;
    setSavingId(attemptId);
    setError(null);
    try {
      const response = await fetch("/api/recipes/" + recipeId + "/attempts/" + attemptId, {
        method: "DELETE",
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Failed to delete attempt");
      }
      await loadAttempts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete attempt");
    } finally {
      setSavingId(null);
    }
  }, [loadAttempts, recipeId]);

  const remaining = Math.max(0, attempts.length - visibleCount);
  const nextBatch = Math.min(5, remaining);

  return (
    <Panel raised className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--ui-muted)]">
            <History className="h-4 w-4" />
            Attempts
            {!loading && (
              <span className="rounded-md bg-[var(--ui-accent-muted)] px-2 py-0.5 text-[11px] font-semibold text-[var(--ui-accent)]">
                {attempts.length} so far
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-[var(--ui-muted)]">
            Cook sessions stay here until one is worth preserving as a recipe version.
          </p>
        </div>
      </div>

      {error && (
        <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {loading ? (
        <div className="mt-4 space-y-2">
          <div className="h-16 animate-pulse rounded-lg bg-neutral-100" />
          <div className="h-16 animate-pulse rounded-lg bg-neutral-100" />
        </div>
      ) : attempts.length === 0 ? (
        <EmptyState
          className="mt-4"
          title="No attempts yet"
          description="Finish a cook-with-me session to log cooking ease, changes, and next-time notes. Rate the dish here or from Activity after eating."
        />
      ) : (
        <div className="mt-4 space-y-3">
          {attempts.slice(0, visibleCount).map((attempt) => {
            const isEditing = editingId === attempt.id;
            return (
              <div
                key={attempt.id}
                className="rounded-lg border border-[var(--ui-border)] bg-[var(--ui-surface-raised)] p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-[var(--ui-text)]">
                      {formatCookedAt(attempt.cookedAt)}
                    </p>
                    <div className="mt-1">
                      <RatingPill rating={attempt.rating} label="Ease" />
                      {attempt.dishRating && <div className="mt-1"><RatingPill rating={attempt.dishRating} label="Dish" /></div>}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {attempt.promotedVersionId ? (
                      <span className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                        Promoted to version
                      </span>
                    ) : (
                      <Button
                        size="sm"
                        variant="secondary"
                        iconEnd={<ArrowUpRight className="h-3.5 w-3.5" />}
                        loading={promotingId === attempt.id}
                        onClick={() => promoteAttempt(attempt.id)}
                      >
                        {attempt.nextTime ? "Promote next-time changes" : "Promote to version"}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="quiet"
                      iconStart={<Pencil className="h-3.5 w-3.5" />}
                      onClick={() => isEditing ? setEditingId(null) : startEdit(attempt)}
                    >
                      {isEditing ? "Cancel" : "Edit"}
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      iconStart={<Trash2 className="h-3.5 w-3.5" />}
                      loading={savingId === attempt.id && !isEditing}
                      onClick={() => deleteAttempt(attempt.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>

                {isEditing ? (
                  <div className="mt-3 space-y-2 rounded-lg border border-[var(--ui-border)] bg-white p-3">
                    <label className="block text-xs font-semibold text-[var(--ui-muted)]">
                      Cooking ease
                      <input
                        value={draftRating}
                        onChange={(event) => setDraftRating(event.target.value)}
                        type="number"
                        min="0.5"
                        max="5"
                        step="0.5"
                        className="mt-1 h-9 w-full rounded-md border border-[var(--ui-border)] px-2 text-sm text-[var(--ui-text)]"
                        placeholder="4.5"
                      />
                    </label>
                    <label className="block text-xs font-semibold text-[var(--ui-muted)]">
                      Attempt notes
                      <textarea
                        value={draftNotes}
                        onChange={(event) => setDraftNotes(event.target.value)}
                        rows={2}
                        className="mt-1 w-full resize-none rounded-md border border-[var(--ui-border)] px-2 py-2 text-sm text-[var(--ui-text)]"
                      />
                    </label>
                    <label className="block text-xs font-semibold text-[var(--ui-muted)]">
                      Next time
                      <textarea
                        value={draftNextTime}
                        onChange={(event) => setDraftNextTime(event.target.value)}
                        rows={2}
                        className="mt-1 w-full resize-none rounded-md border border-[var(--ui-border)] px-2 py-2 text-sm text-[var(--ui-text)]"
                      />
                    </label>
                    <Button
                      size="sm"
                      loading={savingId === attempt.id}
                      onClick={() => saveEdit(attempt.id)}
                    >
                      Save attempt
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="mt-3 rounded-lg border border-[#f0e5d8] bg-white px-3 py-3">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ui-muted)]">
                        How did the dish turn out?
                      </p>
                      <HalfStarRating
                        value={attempt.dishRating}
                        onChange={(rating) => saveDishRating(attempt.id, rating)}
                        ariaLabel="Dish rating"
                        disabled={savingId === attempt.id}
                        size="sm"
                        leftLabel="Needs work"
                        rightLabel="Cook again"
                      />
                    </div>
                    {attempt.changeNotes.length > 0 && (
                      <ul className="mt-3 space-y-1 text-sm text-[var(--ui-muted)]">
                        {attempt.changeNotes.slice(0, 3).map((note, index) => (
                          <li key={index}>{note}</li>
                        ))}
                      </ul>
                    )}
                    {attempt.nextTime && (
                      <div className="mt-3 rounded-lg border border-[#800020]/10 bg-[#800020]/5 p-3">
                        <p className="text-sm text-[var(--ui-muted)]">
                          Next time: {attempt.nextTime}
                        </p>
                        {!attempt.promotedVersionId && (
                          <button
                            type="button"
                            onClick={() => promoteAttempt(attempt.id)}
                            className="mt-2 inline-flex min-h-9 items-center gap-1.5 rounded-full bg-[#17131f] px-3 text-xs font-semibold text-white transition hover:bg-[#800020]"
                          >
                            Promote these changes to a version
                            <ArrowUpRight className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
          <div className="grid gap-2 sm:grid-cols-2">
            {remaining > 0 && (
              <Button
                variant="tertiary"
                size="sm"
                className="w-full"
                onClick={() => setVisibleCount((count) => Math.min(count + 5, attempts.length))}
              >
                Load more attempts ({nextBatch} more)
              </Button>
            )}
            {visibleCount > 5 && (
              <Button
                variant="quiet"
                size="sm"
                iconStart={<ChevronUp className="h-3.5 w-3.5" />}
                className="w-full"
                onClick={() => setVisibleCount(5)}
              >
                Collapse attempts
              </Button>
            )}
          </div>
        </div>
      )}
    </Panel>
  );
}
