"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface Suggestion {
  name: string;
  unit: string | null;
  source: "catalog" | "history";
}

interface IngredientTypeaheadProps {
  value: string;
  onChange: (value: string) => void;
  /**
   * Called when the user picks a suggestion. Receives the full suggestion
   * so the caller can pre-fill an associated unit field.
   */
  onSelectSuggestion?: (suggestion: Suggestion) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  /** Called on Enter when no suggestion is highlighted. */
  onSubmit?: () => void;
  /** Called on Escape. */
  onCancel?: () => void;
}

// How long to wait after the last keystroke before firing a request.
// Short enough to feel responsive, long enough to avoid firing on every
// keystroke mid-word.
const DEBOUNCE_MS = 150;

/**
 * A lightweight ingredient name input with inline typeahead.
 *
 * - Shows recently-used ingredients on focus (0 chars)
 * - Fires /api/ingredients/suggest on 1+ chars with debounce
 * - Arrow keys navigate; Enter selects; Esc closes
 * - Source badges ("recent" / "catalog") help the user spot personal
 *   ingredients before generic catalog matches
 */
export function IngredientTypeahead({
  value,
  onChange,
  onSelectSuggestion,
  placeholder = "Ingredient name",
  className = "",
  autoFocus = false,
  onSubmit,
  onCancel,
}: IngredientTypeaheadProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const [loading, setLoading] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchSuggestions = useCallback(async (q: string) => {
    // Cancel any in-flight request so out-of-order responses don't clobber
    // the latest query's results.
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    try {
      const res = await fetch(
        `/api/ingredients/suggest?q=${encodeURIComponent(q)}`,
        { signal: controller.signal }
      );
      if (!res.ok) {
        setSuggestions([]);
        return;
      }
      const data = await res.json();
      setSuggestions(data.suggestions || []);
      setHighlightIdx(-1);
    } catch (err) {
      // Aborted fetches throw AbortError — ignore.
      if ((err as Error)?.name !== "AbortError") {
        setSuggestions([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced fetch on value changes.
  useEffect(() => {
    if (!isOpen) return;
    const handle = setTimeout(() => {
      fetchSuggestions(value.trim());
    }, DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [value, isOpen, fetchSuggestions]);

  // Close on click outside.
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Scroll highlighted item into view on keyboard nav.
  useEffect(() => {
    if (highlightIdx < 0 || !listRef.current) return;
    const buttons = listRef.current.querySelectorAll<HTMLElement>(
      "button[data-suggestion]"
    );
    buttons[highlightIdx]?.scrollIntoView({ block: "nearest" });
  }, [highlightIdx]);

  const pickSuggestion = useCallback(
    (s: Suggestion) => {
      onChange(s.name);
      onSelectSuggestion?.(s);
      setIsOpen(false);
      setHighlightIdx(-1);
    },
    [onChange, onSelectSuggestion]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        return;
      }
      setHighlightIdx((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIdx((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter") {
      if (isOpen && highlightIdx >= 0 && suggestions[highlightIdx]) {
        e.preventDefault();
        pickSuggestion(suggestions[highlightIdx]);
        return;
      }
      // No suggestion selected — fall through to the parent's submit handler.
      onSubmit?.();
    } else if (e.key === "Escape") {
      if (isOpen) {
        e.preventDefault();
        setIsOpen(false);
        setHighlightIdx(-1);
        return;
      }
      onCancel?.();
    } else if (e.key === "Tab") {
      // Let Tab close the dropdown but not consume the event.
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={className}
        autoFocus={autoFocus}
        autoComplete="off"
      />

      {isOpen && (suggestions.length > 0 || loading) && (
        <ul
          ref={listRef}
          className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 max-h-60 overflow-y-auto rounded-lg border border-neutral-200 bg-white py-1 shadow-lg"
        >
          {loading && suggestions.length === 0 ? (
            <li className="px-3 py-2 text-xs text-neutral-400">Searching…</li>
          ) : (
            suggestions.map((s, idx) => (
              <li key={`${s.source}-${s.name}`}>
                <button
                  type="button"
                  data-suggestion
                  onMouseDown={(e) => {
                    // Use mousedown so the dropdown click fires before the
                    // input's blur/outside-click handlers close it.
                    e.preventDefault();
                    pickSuggestion(s);
                  }}
                  onMouseEnter={() => setHighlightIdx(idx)}
                  className={`flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-sm transition-colors ${
                    idx === highlightIdx
                      ? "bg-[#800020]/5 text-[#521224]"
                      : "text-neutral-700 hover:bg-neutral-50"
                  }`}
                >
                  <span className="truncate">
                    {s.name}
                    {s.unit && (
                      <span className="ml-2 text-xs text-neutral-400">
                        {s.unit}
                      </span>
                    )}
                  </span>
                  <span
                    className={`flex-shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider ${
                      s.source === "history"
                        ? "bg-[#800020]/10 text-[#800020]"
                        : "bg-neutral-100 text-neutral-500"
                    }`}
                  >
                    {s.source === "history" ? "recent" : "catalog"}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
