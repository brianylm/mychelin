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
      className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/55 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="flex min-h-full items-start justify-center p-4 pb-48 md:items-center md:pb-4">
        <div className="w-full max-w-md rounded-[2rem] border border-white/70 bg-[#fffdfb] p-6 shadow-[0_24px_80px_rgba(60,43,25,0.18)]">
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
            <label className="block text-xs font-medium uppercase tracking-wide text-neutral-500 mb-2">
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="My Recipe Collection"
              className="w-full rounded-xl border border-neutral-300 bg-neutral-50 px-4 py-3 text-neutral-900 placeholder-neutral-500 transition-colors focus:border-[#800020]/45 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#800020]/10"
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
              className="w-full rounded-xl border border-neutral-300 bg-neutral-50 px-4 py-3 text-neutral-900 placeholder-neutral-500 transition-colors focus:border-[#800020]/45 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#800020]/10 resize-none"
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
                  className={`flex items-center gap-2 rounded-lg border-2 p-3 transition-all ${
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
              className="flex-1 rounded-xl border border-neutral-300 bg-white px-4 py-3 font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim() || submitting}
              className="flex-1 rounded-xl bg-[#17131f] px-4 py-3 font-medium text-white transition-colors hover:bg-[#800020] disabled:opacity-50 disabled:cursor-not-allowed"
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