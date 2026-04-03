"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, BookOpen } from "lucide-react";

export function CreateBookButton() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/books", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description: description.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to create book");
        return;
      }

      const { id } = await res.json();
      setOpen(false);
      router.push(`/books/${id}`);
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 bg-terracotta text-white px-6 py-3 rounded-2xl text-base font-semibold hover:bg-terracotta-600 transition-colors"
      >
        <BookOpen className="w-4 h-4" />
        Create Book
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-stone-900 font-heading">New Recipe Book</h2>
              <button
                onClick={() => setOpen(false)}
                className="p-2 text-stone-400 hover:text-stone-700 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Book name <span className="text-terracotta">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Grandma's Peranakan Recipes"
                  className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-2xl text-base text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-terracotta focus:border-transparent"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Description <span className="text-stone-400 font-normal">(optional)</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What's this book about?"
                  rows={3}
                  className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-2xl text-base text-stone-800 placeholder:text-stone-400 resize-none focus:outline-none focus:ring-2 focus:ring-terracotta focus:border-transparent"
                />
              </div>

              {error && <p className="text-red-500 text-sm">{error}</p>}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex-1 px-6 py-3 bg-stone-100 text-stone-700 rounded-2xl font-semibold hover:bg-stone-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !name.trim()}
                  className="flex-1 px-6 py-3 bg-terracotta text-white rounded-2xl font-semibold hover:bg-terracotta-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? "Creating…" : "Create Book"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
