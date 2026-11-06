"use client";

import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  CalendarDays,
  Refrigerator,
  ShoppingBasket,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type AppView =
  | "recipes"
  | "activity"
  | "fridge"
  | "shopping"
  | "plan"
  | "household"
  | "discover"
  | "profile";

interface BottomNavProps {
  current: AppView;
  onChange: (view: AppView) => void;
}

// Daily loop only: plan → shop → stock. Activity (cooking log) and the
// household settings live in Profile; shared household recipes in Library.
const tabs: { id: AppView; label: string; icon: LucideIcon }[] = [
  { id: "recipes", label: "Library", icon: BookOpen },
  { id: "plan", label: "Plan", icon: CalendarDays },
  { id: "shopping", label: "Shopping", icon: ShoppingBasket },
  { id: "fridge", label: "Inventory", icon: Refrigerator },
];

export function BottomNav({ current, onChange }: BottomNavProps) {
  return (
    <nav
      className="safe-bottom fixed inset-x-0 bottom-0 z-30 flex h-16 items-center justify-around border-t border-ui-border bg-ui-surface-raised shadow-ui-raised md:hidden"
      aria-label="Primary"
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const active = current === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex h-full min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 transition-colors duration-150",
              active
                ? "text-ui-accent"
                : "text-ui-muted hover:text-ui-text"
            )}
          >
            <Icon className="h-5 w-5" aria-hidden="true" />
            <span className="max-w-full truncate text-[11px] font-medium">
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
