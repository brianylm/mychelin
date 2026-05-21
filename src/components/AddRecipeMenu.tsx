"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Plus, PenLine, Mic, ChevronDown } from "lucide-react";

export function AddRecipeMenu() {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-2 bg-terracotta text-white px-6 py-3 rounded-xl text-lg font-semibold hover:bg-terracotta-600 transition-colors"
      >
        <Plus className="w-5 h-5" />
        Add Recipe
        <ChevronDown className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-stone-200 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <Link
            href="/app/recipes/new"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-5 py-4 hover:bg-stone-50 transition-colors border-b border-stone-100"
          >
            <PenLine className="w-5 h-5 text-terracotta" />
            <div>
              <div className="font-semibold text-stone-800">Write Recipe</div>
              <div className="text-sm text-stone-500">Add a recipe manually</div>
            </div>
          </Link>
          <Link
            href="/app/capture"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-5 py-4 hover:bg-stone-50 transition-colors"
          >
            <Mic className="w-5 h-5 text-purple-500" />
            <div>
              <div className="font-semibold text-stone-800 flex items-center gap-2">
                AI Capture
                <span className="text-[10px] font-bold bg-purple-500 text-white px-1.5 py-0.5 rounded-full uppercase tracking-wider">Beta</span>
              </div>
              <div className="text-sm text-stone-500">Record a live conversation</div>
            </div>
          </Link>
        </div>
      )}
    </div>
  );
}
