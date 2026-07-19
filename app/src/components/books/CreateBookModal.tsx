"use client";

import { useState } from "react";
import { X } from "lucide-react";

interface CreateBookModalProps {
  onClose: () => void;
  onCreateBook: (data: {
    title: string;
    description?: string;
    coverEmoji?: string;
    coverColor?: string;
  }) => void;
}

const FOOD_EMOJIS = [
  "📚", "🍳", "👨‍🍳", "👩‍🍳", "🍽️", "🥄", "🍴", "🥢", 
  "🍕", "🍝", "🍜", "🍲", "🥘", "🍛", "🍱", "🍙",
  "🥗", "🍰", "🧁", "🍪", "🥖", "🍞"
];

const COLORS = [
  { name: "amber", label: "Amber", class: "bg-[#800020]/10 border-[#800020]/15" },
  { name: "rose", label: "Blush", class: "bg-[#800020]/10 border-[#800020]/15" },
  { name: "emerald", label: "Sage", class: "bg-[#f6f2eb] border-[#800020]/15" },
  { name: "sky", label: "Parchment", class: "bg-[#fafaf8] border-[#800020]/15" },
  { name: "violet", label: "Mulberry", class: "bg-[#800020]/15 border-[#800020]/20" },
  { name: "slate", label: "Ink", class: "bg-[#17131f]/10 border-[#17131f]/15" },
];

export function CreateBookModal({ onClose, onCreateBook }: CreateBookModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [coverEmoji, setCoverEmoji] = useState("📚");
  const [coverColor, setCoverColor] = useState("amber");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || submitting) return;

    setSubmitting(true);
    try {
      await onCreateBook({
        title: title.trim(),
        description: description.trim() || undefined,
        coverEmoji,
        coverColor,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/45"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="flex min-h-full items-start justify-center p-4 pb-48 md:items-center md:pb-4">
        <div className="w-full max-w-md rounded-lg border border-[var(--ui-border-strong)] bg-[var(--ui-surface-raised)] p-5 shadow-xl" role="dialog" aria-modal="true" aria-labelledby="create-book-title">
        <div className="mb-6 flex items-center justify-between">
          <h2 id="create-book-title" className="text-xl font-semibold text-[var(--ui-text)]">Create recipe book</h2>
          <button
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-lg text-[var(--ui-muted)] transition-colors hover:bg-[var(--ui-surface-subtle)] hover:text-[var(--ui-text)]"
            aria-label="Close create book dialog"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Preview */}
          <div className="flex items-center gap-3">
            <div
              className={`flex h-16 w-16 items-center justify-center rounded-xl text-2xl border-2 ${
                COLORS.find(c => c.name === coverColor)?.class || "bg-[#800020]/10 border-[#800020]/15"
              }`}
            >
              {coverEmoji}
            </div>
            <div className="flex-1">
              <div className="font-medium text-neutral-900">
                {title || "Untitled Book"}
              </div>
              <div className="text-sm text-neutral-600">
                {description || "No description"}
              </div>
            </div>
          </div>

          {/* Title */}
          <div>
            <label htmlFor="book-title" className="mb-2 block text-xs font-medium uppercase tracking-wide text-neutral-500">
              Title *
            </label>
            <input
              id="book-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="My Recipe Collection"
              className="h-11 w-full rounded-lg border border-[var(--ui-border-strong)] bg-[var(--ui-surface-raised)] px-3 text-sm text-[var(--ui-text)] placeholder:text-[var(--ui-muted)] focus:border-[var(--ui-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--ui-focus)]"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="book-description" className="mb-2 block text-xs font-medium uppercase tracking-wide text-neutral-500">
              Description
            </label>
            <textarea
              id="book-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A collection of my favorite family recipes..."
              rows={3}
              className="w-full resize-none rounded-lg border border-[var(--ui-border-strong)] bg-[var(--ui-surface-raised)] px-3 py-2 text-sm text-[var(--ui-text)] placeholder:text-[var(--ui-muted)] focus:border-[var(--ui-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--ui-focus)]"
            />
          </div>

          {/* Emoji Picker */}
          <div>
            <label className="block text-xs font-medium uppercase tracking-wide text-neutral-500 mb-2">
              Cover Emoji
            </label>
            <div className="grid grid-cols-6 gap-2 sm:grid-cols-8">
              {FOOD_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setCoverEmoji(emoji)}
                  aria-label={"Use " + emoji + " as cover symbol"}
                  aria-pressed={coverEmoji === emoji}
                  className={`flex aspect-square min-h-11 w-full items-center justify-center rounded-lg text-xl transition-colors ${
                    coverEmoji === emoji
                      ? "bg-[#800020]/10 ring-2 ring-[#800020]/35"
                      : "hover:bg-neutral-100"
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Color Picker */}
          <div>
            <label className="block text-xs font-medium uppercase tracking-wide text-neutral-500 mb-2">
              Cover Color
            </label>
            <div className="grid grid-cols-3 gap-2">
              {COLORS.map((color) => (
                <button
                  key={color.name}
                  type="button"
                  onClick={() => setCoverColor(color.name)}
                  aria-pressed={coverColor === color.name}
                  className={`flex min-h-11 items-center gap-2 rounded-lg border-2 p-3 transition-colors ${
                    coverColor === color.name
                      ? "ring-2 ring-[#800020]/35"
                      : "border-neutral-200 hover:border-neutral-300"
                  } ${color.class}`}
                >
                  <div className="font-medium text-neutral-900 text-sm">
                    {color.label}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
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
              disabled={!title.trim() || submitting}
              className="h-11 flex-1 rounded-lg bg-[var(--ui-action)] px-4 text-sm font-semibold text-[var(--ui-action-text)] transition-colors hover:bg-[var(--ui-action-hover)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Creating..." : "Create book"}
            </button>
          </div>
        </form>
        </div>
      </div>
    </div>
  );
}