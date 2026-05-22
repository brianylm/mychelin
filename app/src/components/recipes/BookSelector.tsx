"use client";

import { useState, useEffect, useCallback } from "react";
import { SaveIndicator } from "@/components/ui/SaveIndicator";

interface Book {
  id: number;
  title: string;
  coverEmoji: string;
}

interface BookSelectorProps {
  currentBookId: number | null;
  onSave: (bookId: number | null) => Promise<void>;
}

export function BookSelector({ currentBookId, onSave }: BookSelectorProps) {
  const [books, setBooks] = useState<Book[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(currentBookId);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setSelectedId(currentBookId);
  }, [currentBookId]);

  useEffect(() => {
    fetch("/api/books")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setBooks(data))
      .catch(() => {});
  }, []);

  const handleChange = useCallback(
    async (e: React.ChangeEvent<HTMLSelectElement>) => {
      const val = e.target.value;
      const newId = val === "" ? null : Number(val);
      setSelectedId(newId);
      setIsSaving(true);
      try {
        await onSave(newId);
      } finally {
        setIsSaving(false);
      }
    },
    [onSave]
  );

  return (
    <div className="flex items-center gap-3">
      <label className="shrink-0 text-xs font-medium uppercase tracking-wide text-neutral-500">
        📚 Book
      </label>
      <select
        value={selectedId ?? ""}
        onChange={handleChange}
        className="flex-1 rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm text-neutral-900 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100 focus:bg-white"
      >
        <option value="">No book</option>
        {books.map((book) => (
          <option key={book.id} value={book.id}>
            {book.coverEmoji} {book.title}
          </option>
        ))}
      </select>
      <SaveIndicator isSaving={isSaving} />
    </div>
  );
}
