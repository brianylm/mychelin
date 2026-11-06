"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, ChevronUp, Pencil, Star, Target, Trash2 } from "lucide-react";
import { Button, EmptyState } from "@/components/ui";
import { HalfStarRating } from "./HalfStarRating";

interface RecipeAttempt {
  id: number;
  cookedAt: string;
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

function cookedAtTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("en-SG", { hour: "numeric", minute: "2-digit" });
}

function RatingNote({ rating, label }: { rating: number | null; label: string }) {
  if (!rating) return null;
  return (
    <span className="inline-flex items-center gap-1 text-xs text-ui-muted">
      <Star className="h-3.5 w-3.5 fill-ui-highlight text-ui-warning" aria-hidden="true" />
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
  }, [draftNextTime, draftNotes, loadAttempts, recipeId]);

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
    <div>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-ui-text">Attempts</h3>
        </div>
      </div>

      {error && (
        <p className="mt-3 text-sm text-ui-danger">
          {error}
        </p>
      )}

      {loading ? (
        <div className="mt-4 space-y-2">
          <div className="h-16 animate-pulse rounded-lg bg-ui-surface-subtle" />
          <div className="h-16 animate-pulse rounded-lg bg-ui-surface-subtle" />
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
            const time = cookedAtTime(attempt.cookedAt);
            return (
              <div
                key={attempt.id}
                className="rounded-xl border border-ui-border bg-ui-surface-raised p-3.5"
              >
                <div className="min-w-0">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <p className="text-sm font-semibold text-ui-text">
                        Attempt {attemptNumber}
                      </p>
                      <span className="text-xs text-ui-muted">
                        {formatCookedAt(attempt.cookedAt)}{time ? ` · ${time}` : ""}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <RatingNote rating={attempt.dishRating} label="Dish" />
                      {attempt.promotedVersionId && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-ui-success">
                          <Check className="h-3.5 w-3.5" aria-hidden="true" />
                          Saved as a version
                        </span>
                      )}
                    </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  {!attempt.promotedVersionId && (attempt.nextTime || attempt.changeNotes.length > 0) && (
                    <Button
                      size="sm"
                      variant="secondary"
                      className="min-h-11 border-ui-border bg-ui-surface-raised text-ui-accent shadow-sm hover:bg-ui-accent-muted"
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
                      className="min-h-11"
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
                    className="min-h-11"
                    iconStart={<Pencil className="h-3.5 w-3.5" />}
                    onClick={() => isEditing ? setEditingId(null) : startEdit(attempt)}
                    aria-label={isEditing ? "Cancel editing attempt" : "Edit attempt"}
                  >
                    {isEditing ? "Cancel" : "Edit"}
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    className="min-h-11"
                    iconStart={<Trash2 className="h-3.5 w-3.5" />}
                    loading={savingId === attempt.id && !isEditing}
                    onClick={() => deleteAttempt(attempt.id)}
                    aria-label="Delete attempt"
                  >
                    Delete
                  </Button>
                </div>

                {isEditing ? (
                <div className="mt-6 space-y-4">
                    <label className="block text-xs font-semibold text-ui-muted">
                      Attempt notes
                      <textarea
                        value={draftNotes}
                        onChange={(event) => setDraftNotes(event.target.value)}
                        rows={2}
                        className="mt-1 w-full resize-none rounded-md border border-ui-border px-2 py-2 text-sm text-ui-text"
                      />
                    </label>
                    <label className="block text-xs font-semibold text-ui-muted">
                      Next time
                      <textarea
                        value={draftNextTime}
                        onChange={(event) => setDraftNextTime(event.target.value)}
                        rows={2}
                        className="mt-1 w-full resize-none rounded-md border border-ui-border px-2 py-2 text-sm text-ui-text"
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
                    <div className="mt-6">
                      <p className="mb-2 text-xs font-semibold text-ui-muted">
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
                      <ul className="mt-3 space-y-1 text-sm text-ui-muted">
                        {attempt.changeNotes.slice(0, 3).map((note, index) => (
                          <li key={index}>{note}</li>
                        ))}
                      </ul>
                    )}
                    {attempt.nextTime && (
                      <div className="mt-6">
                        <p className="text-sm text-ui-muted">
                          <span className="font-semibold text-ui-text">Next time:</span> {attempt.nextTime}
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
    </div>
  );
}
