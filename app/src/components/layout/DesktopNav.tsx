"use client";

import type { LucideIcon } from "lucide-react";
import { BookOpen, CalendarDays, Refrigerator, ShoppingBasket } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AppView } from "./BottomNav";

interface DesktopNavProps {
  current: AppView;
  onChange: (view: AppView) => void;
}

const tabs: { id: AppView; label: string; icon: LucideIcon }[] = [
  { id: "recipes", label: "Recipes", icon: BookOpen },
  { id: "fridge", label: "Fridge", icon: Refrigerator },
  { id: "shopping", label: "Shopping", icon: ShoppingBasket },
  { id: "plan", label: "Meal Plan", icon: CalendarDays },
];

export function DesktopNav({ current, onChange }: DesktopNavProps) {
  return (
    <div className="hidden items-center gap-1 rounded-full border border-white/45 bg-white/[0.22] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] md:flex">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-all",
              current === tab.id
                ? "bg-[#17131f] text-white shadow-[0_8px_22px_rgba(23,19,31,0.16)]"
                : "text-stone-700/75 hover:bg-white/30 hover:text-stone-950"
            )}
          >
            <Icon className="h-4 w-4" />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
