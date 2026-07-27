"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, ChevronUp, History, Pencil, Star, Target, Trash2 } from "lucide-react";
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
  onNextTrySaved?: () => void;
}

function formatCookedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-SG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Singapore",
  });
}

function cookedAtParts(value: string): { day: string; month: string; time: string } {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { day: "–", month: "", time: "" };
  return {
    day: String(date.getDate()),
    month: date.toLocaleDateString("en-SG", { month: "short" }),
    time: date.toLocaleTimeString("en-SG", { hour: "numeric", minute: "2-digit" }),
  };
}

function RatingNote({ rating, label }: { rating: number | null; label: string }) {
  if (!rating) return null;
  return (
    <span className="inline-flex items-center gap-1 text-xs text-[var(--ui-muted)]">
      <Star className="h-3.5 w-3.5 fill-[#f7c86a] text-[#c68a18]" aria-hidden="true" />
      {label} {rating.toFixed(1).replace(".0", "")}
    </span>
  );
}

export function AttemptHistory({ recipeId, refreshKey, onPromoted, onNextTrySaved }: AttemptHistoryProps) {
  const [attempts, setAttempts] = useState<RecipeAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [promotingId, setPromotingId] = useState<number | null>(null);
  const [nextTrySavingId, setNextTrySavingId] = useState<number | null>(null);
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

  const saveAsNextTry = useCallback(async (attempt: RecipeAttempt) => {
    setNextTrySavingId(attempt.id);
    setError(null);
    try {
      const response = await fetch("/api/recipes/" + recipeId + "/next-try", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceAttemptId: attempt.id,
          notes: attempt.nextTime ?? attempt.notes ?? null,
        }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Failed to save next try");
      }
      onNextTrySaved?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save next try");
    } finally {
      setNextTrySavingId(null);
    }
  }, [onNextTrySaved, recipeId]);

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
            Every cook is saved here as an attempt. Keep a note for next time, then promote the ones worth keeping into a recipe version.
          </p>
        </div>
      </div>

      {error && (
        <p className="mt-3 rounded-md border border-[var(--ui-danger)]/20 bg-[var(--ui-danger-soft)] px-3 py-2 text-sm text-[var(--ui-danger)]">
          {error}
        </p>
      )}

      {loading ? (
        <div className="mt-4 space-y-2">
          <div className="h-16 animate-pulse rounded-lg bg-[var(--ui-surface-subtle)]" />
          <div className="h-16 animate-pulse rounded-lg bg-[var(--ui-surface-subtle)]" />
        </div>
      ) : attempts.length === 0 ? (
        <EmptyState
          className="mt-4"
          title="No attempts yet"
          description="Use Log cook or finish a cook-with-me session to record an attempt, changes, and next-time notes. Rate the dish here or from Activity after eating."
        />
      ) : (
        <div className="mt-4 space-y-3">
          {attempts.slice(0, visibleCount).map((attempt, index) => {
            const isEditing = editingId === attempt.id;
            const attemptNumber = attempts.length - index;
            const tile = cookedAtParts(attempt.cookedAt);
            return (
              <div
                key={attempt.id}
                className="rounded-xl border border-[var(--ui-border)] bg-[var(--ui-surface-raised)] p-3.5 shadow-sm"
              >
                <div className="flex items-start gap-3">
                  {/* Date tile — gives each attempt a distinct visual anchor */}
                  <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg bg-[var(--ui-accent-muted)] text-[var(--ui-accent)]">
                    <span className="text-base font-bold leading-none">{tile.day}</span>
                    <span className="mt-0.5 text-[9px] font-semibold uppercase tracking-wide">
                      {tile.month}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <p className="text-sm font-semibold text-[var(--ui-text)]">
                        Attempt {attemptNumber}
                      </p>
                      <span className="text-xs text-[var(--ui-muted)]">
                        {formatCookedAt(attempt.cookedAt)}{tile.time ? ` · ${tile.time}` : ""}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <RatingNote rating={attempt.rating} label="Difficulty" />
                      <RatingNote rating={attempt.dishRating} label="Dish" />
                      {attempt.promotedVersionId && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-[var(--ui-success)]">
                          <Check className="h-3.5 w-3.5" aria-hidden="true" />
                          Saved as a version
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  {!attempt.promotedVersionId && (attempt.nextTime || attempt.changeNotes.length > 0) && (
                    <Button
                      size="sm"
                      variant="secondary"
                      className="border-[var(--ui-accent)]/20 bg-ui-surface-raised text-[var(--ui-accent)] shadow-sm hover:bg-[var(--ui-accent)]/5"
                      iconEnd={<Target className="h-3.5 w-3.5" />}
                      loading={nextTrySavingId === attempt.id}
                      onClick={() => saveAsNextTry(attempt)}
                    >
                      Use next time
                    </Button>
                  )}
                  {!attempt.promotedVersionId && (
                    <Button
                      size="sm"
                      variant="primary"
                      loading={promotingId === attempt.id}
                      onClick={() => promoteAttempt(attempt.id)}
                    >
                      Promote to version
                    </Button>
                  )}
                  <span className="flex-1" />
                  <Button
                    size="sm"
                    variant="secondary"
                    iconStart={<Pencil className="h-3.5 w-3.5" />}
                    onClick={() => isEditing ? setEditingId(null) : startEdit(attempt)}
                    aria-label={isEditing ? "Cancel editing attempt" : "Edit attempt"}
                  >
                    {isEditing ? "Cancel" : "Edit"}
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    iconStart={<Trash2 className="h-3.5 w-3.5" />}
                    loading={savingId === attempt.id && !isEditing}
                    onClick={() => deleteAttempt(attempt.id)}
                    aria-label="Delete attempt"
                  >
                    Delete
                  </Button>
                </div>

                {isEditing ? (
                  <div className="mt-3 space-y-2 rounded-lg border border-[var(--ui-border)] bg-[var(--ui-surface-raised)] p-3">
                    <label className="block text-xs font-semibold text-[var(--ui-muted)]">
                      Cooking difficulty
                      <input
                        value={draftRating}
                        onChange={(event) => setDraftRating(event.target.value)}
                        type="number"
                        min="0.5"
                        max="5"
                        step="0.5"
                        className="mt-1 h-9 w-full rounded-md border border-[var(--ui-border)] px-2 text-sm text-[var(--ui-text)]"
                        placeholder="1 calm, 5 too much"
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
                    <div className="mt-3 rounded-lg border border-[var(--ui-border)] bg-[var(--ui-surface-subtle)] px-3 py-3">
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
                      <div className="mt-3 rounded-lg border border-[var(--ui-accent)]/10 bg-[var(--ui-accent)]/5 p-3">
                        <p className="text-sm text-[var(--ui-muted)]">
                          <span className="font-semibold text-[var(--ui-text)]">Next time:</span> {attempt.nextTime}
                        </p>
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
