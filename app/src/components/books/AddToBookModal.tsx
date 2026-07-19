"use client";

import { useCallback, useEffect, useState } from "react";
import { BookOpen, X } from "lucide-react";
import { useToast } from "@/context/ToastContext";

interface Book {
  id: number;
  title: string;
  coverEmoji: string;
  coverColor: string;
  userRole: "owner" | "editor" | "viewer";
}

interface AddToBookModalProps {
  recipeId: number;
  recipeName: string;
  onClose: () => void;
}

export function AddToBookModal({ recipeId, recipeName, onClose }: AddToBookModalProps) {
  const { addToast } = useToast();
  const [books, setBooks] = useState<Book[]>([]);
  const [selectedBooks, setSelectedBooks] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchUserBooks = useCallback(async () => {
    try {
      const response = await fetch("/api/books");
      if (!response.ok) throw new Error("Failed to fetch books");

      const allBooks = await response.json();
      const editableBooks = allBooks.filter(
        (book: Book) => book.userRole === "owner" || book.userRole === "editor"
      );
      setBooks(editableBooks);
    } catch (error) {
      console.error("Error fetching books:", error);
      addToast("Failed to load your books", "error");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    void fetchUserBooks();
  }, [fetchUserBooks]);

  const handleBookToggle = (bookId: number) => {
    setSelectedBooks(prev => {
      const next = new Set(prev);
      if (next.has(bookId)) {
        next.delete(bookId);
      } else {
        next.add(bookId);
      }
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedBooks.size === 0 || submitting) return;

    setSubmitting(true);
    const results = [];

    try {
      for (const bookId of selectedBooks) {
        try {
          const response = await fetch(`/api/books/${bookId}/recipes`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ recipeId }),
          });

          if (response.ok) {
            results.push({ bookId, success: true });
          } else if (response.status === 409) {
            results.push({ bookId, success: false, reason: "already_exists" });
          } else {
            results.push({ bookId, success: false, reason: "error" });
          }
        } catch {
          results.push({ bookId, success: false, reason: "network_error" });
        }
      }

      const successCount = results.filter(r => r.success).length;
      const duplicateCount = results.filter(r => !r.success && r.reason === "already_exists").length;
      
      if (successCount > 0) {
        addToast(`Recipe added to ${successCount} book${successCount > 1 ? 's' : ''}!`, "success");
      }
      
      if (duplicateCount > 0) {
        addToast(`Recipe was already in ${duplicateCount} book${duplicateCount > 1 ? 's' : ''}`, "info");
      }

      onClose();
    } catch (error) {
      console.error("Error adding recipe to books:", error);
      addToast("Failed to add recipe to books", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const getColorClass = (color: string) => {
    const colorMap: Record<string, string> = {
      amber: "bg-[#800020]/10 border-[#800020]/15",
      rose: "bg-rose-100 border-rose-200",
      emerald: "bg-emerald-100 border-emerald-200",
      sky: "bg-sky-100 border-sky-200",
      violet: "bg-violet-100 border-violet-200",
      slate: "bg-slate-100 border-slate-200",
    };
    return colorMap[color] || "bg-[#800020]/10 border-[#800020]/15";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/45 p-4">
      <div className="w-full max-w-md rounded-lg border border-[var(--ui-border-strong)] bg-[var(--ui-surface-raised)] p-5 shadow-xl" role="dialog" aria-modal="true" aria-labelledby="add-to-book-title">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 id="add-to-book-title" className="text-xl font-semibold text-[var(--ui-text)]">Add to book</h2>
            <p className="text-sm text-neutral-600">Add &quot;{recipeName}&quot; to your books</p>
          </div>
          <button
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-lg text-[var(--ui-muted)] transition-colors hover:bg-[var(--ui-surface-subtle)] hover:text-[var(--ui-text)]"
            aria-label="Close add to book dialog"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {loading ? (
          <div className="flex h-32 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#800020] border-t-transparent"></div>
          </div>
        ) : books.length === 0 ? (
          <div className="py-8 text-center">
            <BookOpen className="mx-auto mb-3 h-8 w-8 text-[var(--ui-accent)]" aria-hidden="true" />
            <p className="text-neutral-600">No books where you can add recipes</p>
            <p className="text-sm text-neutral-500">You need owner or editor permissions to add recipes</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="max-h-64 divide-y divide-[var(--ui-border)] overflow-y-auto border-y border-[var(--ui-border)]">
              {books.map((book) => (
                <label
                  key={book.id}
                  className="flex min-h-16 cursor-pointer items-center gap-3 px-1 py-3 transition-colors hover:bg-[var(--ui-surface-subtle)]"
                >
                  <input
                    type="checkbox"
                    checked={selectedBooks.has(book.id)}
                    onChange={() => handleBookToggle(book.id)}
                    className="h-5 w-5 rounded border-[var(--ui-border-strong)] text-[var(--ui-accent)] focus:ring-[var(--ui-focus)]"
                  />
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-lg text-lg ${getColorClass(book.coverColor)}`}
                  >
                    {book.coverEmoji}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-neutral-900">{book.title}</div>
                    <div className="text-xs text-neutral-500 capitalize">{book.userRole}</div>
                  </div>
                </label>
              ))}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="h-11 flex-1 rounded-lg border border-[var(--ui-border-strong)] bg-[var(--ui-surface-raised)] px-4 text-sm font-semibold text-[var(--ui-text)] transition-colors hover:bg-[var(--ui-surface-subtle)]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={selectedBooks.size === 0 || submitting}
                className="h-11 flex-1 rounded-lg bg-[var(--ui-action)] px-3 text-sm font-semibold text-[var(--ui-action-text)] transition-colors hover:bg-[var(--ui-action-hover)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting 
                  ? "Adding..." 
                  : selectedBooks.size === 0 
                  ? "Select books"
                  : `Add to ${selectedBooks.size} book${selectedBooks.size > 1 ? 's' : ''}`
                }
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}