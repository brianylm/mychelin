"use client";

import { useState } from "react";

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
  { name: "amber", label: "Amber", class: "bg-ui-accent-muted border-ui-border" },
  { name: "rose", label: "Blush", class: "bg-ui-accent-muted border-ui-border" },
  { name: "emerald", label: "Sage", class: "bg-ui-surface-subtle border-ui-border" },
  { name: "sky", label: "Parchment", class: "bg-ui-bg border-ui-border" },
  { name: "violet", label: "Mulberry", class: "bg-ui-accent-muted border-ui-border" },
  { name: "slate", label: "Ink", class: "bg-ui-action border-ui-action" },
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
      className="fixed inset-0 z-50 overflow-y-auto bg-ui-scrim"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="flex min-h-full items-start justify-center p-4 pb-48 md:items-center md:pb-4">
        <div className="w-full max-w-md rounded-2xl bg-ui-surface-raised p-6 shadow-ui-overlay">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-ui-text">Create Recipe Book</h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-ui-muted hover:bg-ui-surface-subtle hover:text-ui-muted"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Preview */}
          <div className="flex items-center gap-3">
            <div
              className={`flex h-16 w-16 items-center justify-center rounded-xl text-2xl border-2 ${
                COLORS.find(c => c.name === coverColor)?.class || "bg-ui-accent-muted border-ui-border"
              }`}
            >
              {coverEmoji}
            </div>
            <div className="flex-1">
              <div className="font-medium text-ui-text">
                {title || "Untitled Book"}
              </div>
              <div className="text-sm text-ui-muted">
                {description || "No description"}
              </div>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-medium text-ui-muted mb-2">
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="My Recipe Collection"
              className="w-full rounded-xl border border-ui-border-strong bg-ui-surface-subtle px-4 py-3 text-ui-text placeholder-ui-muted transition-colors focus:border-ui-accent focus:bg-ui-surface-raised focus:outline-none focus:ring-2 focus:ring-ui-focus-soft"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-ui-muted mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A collection of my favorite family recipes..."
              rows={3}
              className="w-full rounded-xl border border-ui-border-strong bg-ui-surface-subtle px-4 py-3 text-ui-text placeholder-ui-muted transition-colors focus:border-ui-accent focus:bg-ui-surface-raised focus:outline-none focus:ring-2 focus:ring-ui-focus-soft resize-none"
            />
          </div>

          {/* Emoji Picker */}
          <div>
            <label className="block text-xs font-medium text-ui-muted mb-2">
              Cover Emoji
            </label>
            <div className="grid grid-cols-8 gap-2">
              {FOOD_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setCoverEmoji(emoji)}
                  className={`flex h-12 w-12 items-center justify-center rounded-lg text-xl transition ${
                    coverEmoji === emoji
                      ? "bg-ui-accent-muted ring-2 ring-ui-focus"
                      : "hover:bg-ui-surface-subtle"
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Color Picker */}
          <div>
            <label className="block text-xs font-medium text-ui-muted mb-2">
              Cover Color
            </label>
            <div className="grid grid-cols-3 gap-2">
              {COLORS.map((color) => (
                <button
                  key={color.name}
                  type="button"
                  onClick={() => setCoverColor(color.name)}
                  className={`flex items-center gap-2 rounded-lg border-2 p-3 transition ${
                    coverColor === color.name
                      ? "ring-2 ring-ui-focus"
                      : "border-ui-border hover:border-ui-border-strong"
                  } ${color.class}`}
                >
                  <div className="font-medium text-ui-text text-sm">
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
              className="flex-1 rounded-xl border border-ui-border-strong bg-ui-surface-raised px-4 py-3 font-medium text-ui-text transition-colors hover:bg-ui-surface-subtle"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim() || submitting}
              className="flex-1 rounded-xl bg-ui-action px-4 py-3 font-medium text-ui-action-text transition-colors hover:bg-ui-accent disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "Creating..." : "Create Book"}
            </button>
          </div>
        </form>
        </div>
      </div>
    </div>
  );
}