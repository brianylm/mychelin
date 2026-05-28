"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";

interface Tip {
  id: string;
  content: string;
  createdAt: number;
  addedBy: string;
  authorName: string | null;
}

interface CookingPrinciplesProps {
  bookId: number;
  canEdit: boolean;
  isOwner: boolean;
  onTipCountChange?: (count: number) => void;
}

export function CookingPrinciples({ bookId, canEdit, isOwner, onTipCountChange }: CookingPrinciplesProps) {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [tips, setTips] = useState<Tip[]>([]);
  const [loading, setLoading] = useState(true);
  const [newContent, setNewContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  // AI analysis state — "Analyze with AI" button reads all recipes in
  // the book and asks Gemini to surface shared patterns / house style
  // rules. Each suggested principle can be saved with one click.
  const [analyzing, setAnalyzing] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [savingIdx, setSavingIdx] = useState<number | null>(null);

  const fetchTips = useCallback(async () => {
    try {
      const res = await fetch(`/api/books/${bookId}/tips`);
      if (!res.ok) throw new Error("Failed to fetch tips");
      const data = await res.json();
      setTips(data);
      onTipCountChange?.(data.length);
    } catch {
      addToast("Failed to load cooking principles", "error");
    } finally {
      setLoading(false);
    }
  }, [bookId, addToast]);

  useEffect(() => {
    fetchTips();
  }, [fetchTips]);

  const handleAdd = async () => {
    if (!newContent.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/books/${bookId}/tips`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newContent.trim() }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to add tip");
      }
      const tip = await res.json();
      const updated = [tip, ...tips];
      setTips(updated);
      setNewContent("");
      onTipCountChange?.(updated.length);
      addToast("Cooking principle added!", "success");
    } catch (error: any) {
      addToast(error.message || "Failed to add principle", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (tipId: string) => {
    if (!confirm("Remove this cooking principle?")) return;
    try {
      const res = await fetch(`/api/books/${bookId}/tips/${tipId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete tip");
      const updated = tips.filter((t) => t.id !== tipId);
      setTips(updated);
      onTipCountChange?.(updated.length);
      addToast("Cooking principle removed", "success");
    } catch {
      addToast("Failed to remove principle", "error");
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const canDeleteTip = (tip: Tip) =>
    isOwner || (user && String(user.id) === tip.addedBy);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    setSuggestions([]);
    try {
      const res = await fetch(`/api/books/${bookId}/analyze-principles`, {
        method: "POST",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Analysis failed");
      }
      const data = (await res.json()) as { principles?: string[] };
      const list = data.principles ?? [];
      setSuggestions(list);
      if (list.length === 0) {
        addToast(
          "Not enough recipes in this book yet to find patterns",
          "error"
        );
      }
    } catch (err: any) {
      addToast(err?.message || "Failed to analyze recipes", "error");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSaveSuggestion = async (idx: number) => {
    const content = suggestions[idx];
    if (!content) return;
    setSavingIdx(idx);
    try {
      const res = await fetch(`/api/books/${bookId}/tips`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error("Failed to save principle");
      const tip = await res.json();
      const updated = [tip, ...tips];
      setTips(updated);
      onTipCountChange?.(updated.length);
      setSuggestions((prev) => prev.filter((_, i) => i !== idx));
      addToast("Principle saved", "success");
    } catch (err: any) {
      addToast(err?.message || "Failed to save", "error");
    } finally {
      setSavingIdx(null);
    }
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Cooking Principles</h2>
        <button
          onClick={handleAnalyze}
          disabled={analyzing}
          className="flex items-center gap-1.5 rounded-lg border border-[#800020]/30 bg-[#800020]/5 px-3 py-1.5 text-xs font-semibold text-[#521224] transition-colors hover:bg-[#800020]/10 disabled:opacity-60"
        >
          {analyzing ? (
            <>
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-[#800020] border-t-transparent" />
              Analyzing…
            </>
          ) : (
            <>✨ Analyze with AI</>
          )}
        </button>
      </div>

      {/* AI suggestions — shown after Analyze with AI returns results.
          Each card is a suggested principle the user can save with one
          click, which adds it to the tips list and removes it from the
          suggestions. */}
      {suggestions.length > 0 && (
        <div className="mb-6 space-y-2 rounded-xl border border-[#800020]/30 bg-gradient-to-br from-[#800020]/5 to-white p-4">
          <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-[#241017]">
            <span>✨</span>
            <span>AI-spotted patterns in this book</span>
          </div>
          <p className="mb-2 text-[11px] text-[#800020]">
            Click a card to save it as a principle. Anything you don&apos;t
            want is just discarded.
          </p>
          {suggestions.map((s, i) => (
            <button
              key={i}
              onClick={() => handleSaveSuggestion(i)}
              disabled={savingIdx !== null}
              className="flex w-full items-start gap-3 rounded-lg border border-[#800020]/15 bg-white p-3 text-left transition-all hover:border-[#800020]/45 hover:shadow-sm disabled:opacity-60"
            >
              <span className="mt-0.5 text-base">💡</span>
              <p className="flex-1 text-sm leading-relaxed text-neutral-800">
                {s}
              </p>
              <span className="shrink-0 rounded-full bg-[#800020]/10 px-2 py-0.5 text-[10px] font-semibold text-[#800020]">
                {savingIdx === i ? "Saving…" : "+ Save"}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Add new tip form */}
      {canEdit && (
        <div className="mb-6 rounded-xl border border-[#800020]/15 bg-[#800020]/5 p-4">
          <label className="mb-2 block text-sm font-medium text-[#521224]">
            Add a cooking principle or tip
          </label>
          <textarea
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="e.g. Always toast your spices before adding liquid, use cast iron for searing..."
            rows={3}
            className="w-full resize-none rounded-lg border border-[#800020]/15 bg-white px-3 py-2 text-sm placeholder-neutral-400 focus:border-[#800020]/45 focus:outline-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                handleAdd();
              }
            }}
          />
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs text-[#800020]">⌘↵ to submit</span>
            <button
              onClick={handleAdd}
              disabled={submitting || !newContent.trim()}
              className="rounded-lg bg-[#17131f] px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-[#800020] disabled:opacity-50"
            >
              {submitting ? "Adding…" : "Add Principle"}
            </button>
          </div>
        </div>
      )}

      {/* Tips list */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#800020] border-t-transparent" />
        </div>
      ) : tips.length === 0 ? (
        <div className="py-8 text-center">
          <div className="mb-2 text-4xl">💡</div>
          <p className="text-neutral-600">No cooking principles yet</p>
          {canEdit && (
            <p className="mt-1 text-sm text-neutral-400">
              Add tips and principles that guide this book's cooking style
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {tips.map((tip) => (
            <div
              key={tip.id}
              className="group flex items-start gap-3 rounded-xl border border-neutral-200 bg-white p-4 transition-all hover:border-[#800020]/15 hover:shadow-sm"
            >
              <div className="mt-0.5 text-lg">💡</div>
              <div className="flex-1">
                <p className="text-sm text-neutral-800 leading-relaxed">{tip.content}</p>
                <div className="mt-2 flex items-center gap-2 text-xs text-neutral-400">
                  {tip.authorName && <span>by {tip.authorName}</span>}
                  <span>·</span>
                  <span>{formatDate(tip.createdAt)}</span>
                </div>
              </div>
              {canDeleteTip(tip) && (
                <button
                  onClick={() => handleDelete(tip.id)}
                  className="opacity-0 group-hover:opacity-100 ml-1 shrink-0 text-red-500 transition-opacity hover:text-red-700"
                  title="Remove principle"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
