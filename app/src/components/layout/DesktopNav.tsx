"use client";

import { cn } from "@/lib/utils";
import type { AppView } from "./BottomNav";

interface DesktopNavProps {
  current: AppView;
  onChange: (view: AppView) => void;
}

const tabs: { id: AppView; label: string; icon: string }[] = [
  { id: "recipes", label: "Recipes", icon: "🍳" },
  { id: "fridge", label: "Fridge", icon: "🧊" },
  { id: "shopping", label: "Shopping", icon: "🛒" },
  { id: "plan", label: "Meal Plan", icon: "📅" },
];

export function DesktopNav({ current, onChange }: DesktopNavProps) {
  return (
    <div className="hidden items-center gap-1 rounded-full border border-white/60 bg-white/35 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] md:flex">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            "flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-all",
            current === tab.id
              ? "bg-[#17131f] text-white shadow-[0_8px_22px_rgba(23,19,31,0.16)]"
              : "text-stone-600 hover:bg-white/55 hover:text-stone-950"
          )}
        >
          <span>{tab.icon}</span>
          {tab.label}
        </button>
      ))}
    </div>
  );
}
