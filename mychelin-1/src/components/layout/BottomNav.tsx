"use client";

import { cn } from "@/lib/utils";

export type AppView = "recipes" | "plan" | "books" | "discover" | "profile";

interface BottomNavProps {
  current: AppView;
  onChange: (view: AppView) => void;
}

const tabs: { id: AppView; label: string; icon: string }[] = [
  { id: "recipes", label: "Recipes", icon: "🍳" },
  { id: "discover", label: "Discover", icon: "🎲" },
  { id: "books", label: "Books", icon: "📚" },
  { id: "plan", label: "Plan", icon: "📅" },
];

export function BottomNav({ current, onChange }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 flex h-16 items-center justify-around border-t border-neutral-200 bg-white/90 backdrop-blur-sm safe-bottom md:hidden">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            "flex flex-1 flex-col items-center gap-0.5 py-2 transition-colors",
            current === tab.id
              ? "text-amber-700"
              : "text-neutral-400 hover:text-neutral-600"
          )}
        >
          <span className="text-xl leading-none">{tab.icon}</span>
          <span className="text-[10px] font-medium">{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}
