"use client";

import { cn } from "@/lib/utils";

export type AppView = "recipes" | "fridge" | "shopping" | "plan" | "discover" | "profile";

interface BottomNavProps {
  current: AppView;
  onChange: (view: AppView) => void;
}

const tabs: { id: AppView; label: string; icon: string }[] = [
  { id: "recipes", label: "Recipes", icon: "🍳" },
  { id: "fridge", label: "Fridge", icon: "🧊" },
  { id: "shopping", label: "Shopping", icon: "🛒" },
  { id: "plan", label: "Plan", icon: "📅" },
];

export function BottomNav({ current, onChange }: BottomNavProps) {
  return (
    <nav className="safe-bottom fixed bottom-0 left-0 right-0 z-30 flex h-16 items-center justify-around border-t border-white/60 bg-white/70 shadow-[0_-18px_45px_rgba(40,26,19,0.08)] backdrop-blur-2xl md:hidden">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            "flex flex-1 flex-col items-center gap-0.5 py-2 transition-colors",
            current === tab.id
              ? "text-[#800020]"
              : "text-stone-400 hover:text-stone-600"
          )}
        >
          <span className="text-xl leading-none">{tab.icon}</span>
          <span className="text-[10px] font-medium">{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}
