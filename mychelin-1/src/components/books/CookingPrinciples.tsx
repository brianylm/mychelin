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

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Cooking Principles</h2>
      </div>

      {/* Add new tip form */}
      {canEdit && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <label className="mb-2 block text-sm font-medium text-amber-800">
            Add a cooking principle or tip
          </label>
          <textarea
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="e.g. Always toast your spices before adding liquid, use cast iron for searing..."
            rows={3}
            className="w-full resize-none rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm placeholder-neutral-400 focus:border-amber-400 focus:outline-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                handleAdd();
              }
            }}
          />
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs text-amber-600">⌘↵ to submit</span>
            <button
              onClick={handleAdd}
              disabled={submitting || !newContent.trim()}
              className="rounded-lg bg-amber-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-amber-700 disabled:opacity-50"
            >
              {submitting ? "Adding…" : "Add Principle"}
            </button>
          </div>
        </div>
      )}

      {/* Tips list */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-amber-600 border-t-transparent" />
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
              className="group flex items-start gap-3 rounded-xl border border-neutral-200 bg-white p-4 transition-all hover:border-amber-200 hover:shadow-sm"
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
