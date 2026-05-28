"use client";

import { useState } from "react";

interface LanguageToggleProps {
  currentLang: string;
  onToggle: (lang: string) => void;
  availableLanguages?: string[];
}

const DEFAULT_LANGUAGES = ["English", "中文", "Bahasa Melayu", "தமிழ்"];

export function LanguageToggle({
  currentLang,
  onToggle,
  availableLanguages = DEFAULT_LANGUAGES,
}: LanguageToggleProps) {
  return (
    <div className="flex items-center gap-1 rounded-lg border border-neutral-200 bg-neutral-50 p-1">
      {availableLanguages.map((lang) => (
        <button
          key={lang}
          onClick={() => onToggle(lang)}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
            currentLang === lang
              ? "bg-[#17131f] text-white shadow-sm"
              : "text-neutral-600 hover:bg-neutral-100"
          }`}
        >
          {lang}
        </button>
      ))}
    </div>
  );
}
