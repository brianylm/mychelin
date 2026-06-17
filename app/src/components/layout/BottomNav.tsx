"use client";

import type { LucideIcon } from "lucide-react";
import { BookOpen, CalendarDays, ClipboardList, Refrigerator, ShoppingBasket } from "lucide-react";
import { cn } from "@/lib/utils";

export type AppView = "recipes" | "activity" | "fridge" | "shopping" | "plan" | "discover" | "profile";

interface BottomNavProps {
  current: AppView;
  onChange: (view: AppView) => void;
}

const tabs: { id: AppView; label: string; icon: LucideIcon }[] = [
  { id: "recipes", label: "Recipes", icon: BookOpen },
  { id: "activity", label: "Activity", icon: ClipboardList },
  { id: "fridge", label: "Fridge", icon: Refrigerator },
  { id: "shopping", label: "Shopping", icon: ShoppingBasket },
  { id: "plan", label: "Plan", icon: CalendarDays },
];

export function BottomNav({ current, onChange }: BottomNavProps) {
  return (
    <nav className="safe-bottom fixed bottom-0 left-0 right-0 z-30 flex h-16 items-center justify-around border-t border-white/60 bg-white/70 shadow-[0_-18px_45px_rgba(40,26,19,0.08)] backdrop-blur-2xl md:hidden">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 py-2 transition-colors",
              current === tab.id
                ? "text-[#800020]"
                : "text-stone-400 hover:text-stone-600"
            )}
          >
            <Icon className="h-5 w-5" />
            <span className="text-[10px] font-medium">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
