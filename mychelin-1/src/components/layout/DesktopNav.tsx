"use client";

import { cn } from "@/lib/utils";
import type { AppView } from "./BottomNav";

interface DesktopNavProps {
  current: AppView;
  onChange: (view: AppView) => void;
}

const tabs: { id: AppView; label: string; icon: string }[] = [
  { id: "recipes", label: "Recipes", icon: "🍳" },
  { id: "discover", label: "Discover", icon: "🎲" },
  { id: "plan", label: "Meal Plan", icon: "📅" },
  { id: "fridge", label: "Fridge", icon: "🧊" },
  { id: "shop", label: "Shopping", icon: "🛒" },
];

export function DesktopNav({ current, onChange }: DesktopNavProps) {
  return (
    <div className="hidden md:flex items-center gap-1 rounded-lg border border-neutral-200 bg-neutral-50 p-1">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all",
            current === tab.id
              ? "bg-amber-600 text-white shadow-sm"
              : "text-neutral-600 hover:bg-neutral-100"
          )}
        >
          <span>{tab.icon}</span>
          {tab.label}
        </button>
      ))}
    </div>
  );
}
