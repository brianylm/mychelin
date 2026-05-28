"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { SaveIndicator } from "./SaveIndicator";

interface ComboboxOption {
  label: string;
  value: string;
  group?: string;
}

interface ComboboxProps {
  label: string;
  value: string;
  options: ComboboxOption[];
  placeholder?: string;
  onChange: (value: string) => void;
  isSaving?: boolean;
}

export function Combobox({
  label,
  value,
  options,
  placeholder = "Search or select...",
  onChange,
  isSaving = false,
}: ComboboxProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  // Track whether the most recent highlight change came from the keyboard,
  // so we only auto-scroll for arrow-key nav — not for mouse hover, which
  // would fight the user's own scroll position.
  const keyboardHighlightRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Filter options by query
  const filtered = query
    ? options.filter(
        (o) =>
          o.label.toLowerCase().includes(query.toLowerCase()) ||
          (o.group && o.group.toLowerCase().includes(query.toLowerCase()))
      )
    : options;

  // Group filtered options
  const grouped = filtered.reduce<Record<string, ComboboxOption[]>>(
    (acc, opt) => {
      const g = opt.group || "";
      if (!acc[g]) acc[g] = [];
      acc[g].push(opt);
      return acc;
    },
    {}
  );

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        // If query doesn't match value, reset
        if (query && query !== value) {
          setQuery("");
        }
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [query, value]);

  // Scroll highlighted item into view — only for keyboard nav, and find
  // the actual option button. listRef.children[idx] would return a <li>
  // group container, not the button at that flat index.
  useEffect(() => {
    if (
      keyboardHighlightRef.current &&
      highlightIdx >= 0 &&
      listRef.current
    ) {
      const buttons = listRef.current.querySelectorAll<HTMLElement>(
        "button[data-combobox-option]"
      );
      buttons[highlightIdx]?.scrollIntoView({ block: "nearest" });
    }
    keyboardHighlightRef.current = false;
  }, [highlightIdx]);

  const flatFiltered = filtered;

  const selectOption = useCallback(
    (opt: ComboboxOption) => {
      onChange(opt.value);
      setQuery("");
      setIsOpen(false);
      setHighlightIdx(-1);
      inputRef.current?.blur();
    },
    [onChange]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen && (e.key === "ArrowDown" || e.key === "Enter")) {
      setIsOpen(true);
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      keyboardHighlightRef.current = true;
      setHighlightIdx((i) => Math.min(i + 1, flatFiltered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      keyboardHighlightRef.current = true;
      setHighlightIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && highlightIdx >= 0) {
      e.preventDefault();
      selectOption(flatFiltered[highlightIdx]);
    } else if (e.key === "Escape") {
      setIsOpen(false);
      setQuery("");
      inputRef.current?.blur();
    }
  };

  const displayValue = isOpen ? query : value || "";

  return (
    <div ref={containerRef} className="relative flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium uppercase tracking-wide text-neutral-500">
          {label}
        </label>
        <SaveIndicator isSaving={isSaving} />
      </div>

      <div className="relative">
        <input
          ref={inputRef}
          value={displayValue}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            setHighlightIdx(-1);
          }}
          onFocus={() => {
            setIsOpen(true);
            setQuery("");
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`w-full rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2 pr-8 text-sm outline-none transition focus:border-[#800020]/45 focus:ring-2 focus:ring-[#800020]/10 focus:bg-white placeholder:text-neutral-400 ${
            !value && !isOpen ? "text-neutral-400" : "text-neutral-900"
          }`}
        />
        {/* Chevron */}
        <svg
          className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>

        {/* Clear button */}
        {value && !isOpen && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange("");
              setQuery("");
              inputRef.current?.focus();
            }}
            className="absolute right-7 top-1/2 -translate-y-1/2 rounded p-0.5 text-neutral-400 hover:text-neutral-600"
          >
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (
        <ul
          ref={listRef}
          className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 max-h-60 overflow-y-auto rounded-lg border border-neutral-200 bg-white py-1 shadow-lg"
        >
          {flatFiltered.length === 0 ? (
            <li className="px-3 py-2 text-sm text-neutral-400">
              {query ? (
                <button
                  type="button"
                  className="w-full text-left text-[#800020] hover:underline"
                  onClick={() => selectOption({ label: query, value: query })}
                >
                  Use &ldquo;{query}&rdquo;
                </button>
              ) : (
                "No options"
              )}
            </li>
          ) : (
            Object.entries(grouped).map(([group, opts]) => (
              <li key={group}>
                {group && (
                  <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                    {group}
                  </div>
                )}
                {opts.map((opt) => {
                  const idx = flatFiltered.indexOf(opt);
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      data-combobox-option
                      className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors ${
                        idx === highlightIdx
                          ? "bg-[#800020]/5 text-[#521224]"
                          : value === opt.value
                            ? "bg-neutral-50 font-medium text-neutral-900"
                            : "text-neutral-700 hover:bg-neutral-50"
                      }`}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        selectOption(opt);
                      }}
                    >
                      {opt.label}
                      {value === opt.value && (
                        <svg className="ml-auto h-3.5 w-3.5 text-[#800020]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
