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
  { name: "amber", label: "Amber", class: "bg-amber-100 border-amber-200" },
  { name: "rose", label: "Rose", class: "bg-rose-100 border-rose-200" },
  { name: "emerald", label: "Emerald", class: "bg-emerald-100 border-emerald-200" },
  { name: "sky", label: "Sky", class: "bg-sky-100 border-sky-200" },
  { name: "violet", label: "Violet", class: "bg-violet-100 border-violet-200" },
  { name: "slate", label: "Slate", class: "bg-slate-100 border-slate-200" },
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-neutral-900">Create Recipe Book</h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Preview */}
          <div className="flex items-center gap-3">
            <div
              className={`flex h-16 w-16 items-center justify-center rounded-xl text-2xl border-2 ${
                COLORS.find(c => c.name === coverColor)?.class || "bg-amber-100 border-amber-200"
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
            <label className="block text-xs font-medium uppercase tracking-wide text-neutral-500 mb-2">
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="My Recipe Collection"
              className="w-full rounded-xl border border-neutral-300 bg-neutral-50 px-4 py-3 text-neutral-900 placeholder-neutral-500 transition-colors focus:border-amber-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-100"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium uppercase tracking-wide text-neutral-500 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A collection of my favorite family recipes..."
              rows={3}
              className="w-full rounded-xl border border-neutral-300 bg-neutral-50 px-4 py-3 text-neutral-900 placeholder-neutral-500 transition-colors focus:border-amber-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-100 resize-none"
            />
          </div>

          {/* Emoji Picker */}
          <div>
            <label className="block text-xs font-medium uppercase tracking-wide text-neutral-500 mb-2">
              Cover Emoji
            </label>
            <div className="grid grid-cols-8 gap-2">
              {FOOD_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setCoverEmoji(emoji)}
                  className={`flex h-12 w-12 items-center justify-center rounded-lg text-xl transition-all ${
                    coverEmoji === emoji
                      ? "bg-amber-100 ring-2 ring-amber-400"
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
                  className={`flex items-center gap-2 rounded-lg border-2 p-3 transition-all ${
                    coverColor === color.name
                      ? "ring-2 ring-amber-400"
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
              className="flex-1 rounded-xl border border-neutral-300 bg-white px-4 py-3 font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim() || submitting}
              className="flex-1 rounded-xl bg-amber-600 px-4 py-3 font-medium text-white transition-colors hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "Creating..." : "Create Book"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}