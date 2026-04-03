"use client";

import { useState } from "react";
import { Trash2, Lightbulb, Plus } from "lucide-react";

interface PrincipleAuthor {
  id: string;
  name: string;
  avatarUrl?: string | null;
}

interface Principle {
  id: string;
  content: string;
  addedBy: string;
  createdAt: string | Date;
  author?: PrincipleAuthor | null;
}

interface BookPrinciplesSectionProps {
  bookId: string;
  initialPrinciples: Principle[];
  currentUserId: string | null;
  isOwner: boolean;
}

export function BookPrinciplesSection({
  bookId,
  initialPrinciples,
  currentUserId,
  isOwner,
}: BookPrinciplesSectionProps) {
  const [principles, setPrinciples] = useState<Principle[]>(initialPrinciples);
  const [newPrinciple, setNewPrinciple] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAddPrinciple(e: React.FormEvent) {
    e.preventDefault();
    if (!newPrinciple.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/books/${bookId}/tips`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newPrinciple.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to add principle");
        return;
      }

      const principle = await res.json();
      setPrinciples([principle, ...principles]);
      setNewPrinciple("");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeletePrinciple(principleId: string) {
    try {
      const res = await fetch(`/api/books/${bookId}/tips/${principleId}`, {
        method: "DELETE",
      });

      if (!res.ok) return;

      setPrinciples(principles.filter((p) => p.id !== principleId));
    } catch {
      // silently fail
    }
  }

  return (
    <section className="bg-white rounded-3xl p-8 md:p-10 border border-stone-200">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-amber-50 rounded-2xl flex items-center justify-center flex-shrink-0">
          <Lightbulb className="w-5 h-5 text-amber-600" />
        </div>
        <h2 className="text-2xl font-bold text-stone-900 font-heading">Cooking Principles</h2>
        <span className="ml-auto text-stone-400 text-sm">{principles.length} {principles.length === 1 ? "principle" : "principles"}</span>
      </div>

      {/* Add principle form — visible to logged-in members */}
      {currentUserId && (
        <form onSubmit={handleAddPrinciple} className="mb-8">
          <div className="flex gap-3">
            <textarea
              value={newPrinciple}
              onChange={(e) => setNewPrinciple(e.target.value)}
              placeholder="Share a family cooking principle or secret for this book…"
              rows={2}
              className="flex-1 px-4 py-3 bg-stone-50 border border-stone-200 rounded-2xl text-base text-stone-800 placeholder:text-stone-400 resize-none focus:outline-none focus:ring-2 focus:ring-terracotta focus:border-transparent transition"
            />
            <button
              type="submit"
              disabled={isSubmitting || !newPrinciple.trim()}
              className="self-end px-5 py-3 bg-terracotta text-white rounded-2xl font-semibold flex items-center gap-2 hover:bg-terracotta-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
          </div>
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        </form>
      )}

      {/* Principles list */}
      {principles.length === 0 ? (
        <div className="text-center py-10 text-stone-400">
          <Lightbulb className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-base">No principles yet. Share the first one!</p>
        </div>
      ) : (
        <ul className="space-y-4">
          {principles.map((principle) => {
            const canDelete =
              currentUserId &&
              (principle.addedBy === currentUserId || isOwner);

            return (
              <li
                key={principle.id}
                className="flex items-start gap-4 p-5 bg-stone-50 rounded-2xl border border-stone-100 group"
              >
                <span className="w-2 h-2 bg-terracotta rounded-full flex-shrink-0 mt-2.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-stone-800 text-base leading-relaxed">{principle.content}</p>
                  <p className="text-stone-400 text-sm mt-2">
                    {principle.author?.name || "Unknown"}
                    {" · "}
                    {new Date(principle.createdAt).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>
                {canDelete && (
                  <button
                    onClick={() => handleDeletePrinciple(principle.id)}
                    className="flex-shrink-0 p-2 text-stone-300 hover:text-red-500 rounded-xl opacity-0 group-hover:opacity-100 transition-all"
                    title="Delete principle"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
