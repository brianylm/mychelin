"use client";

import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  CalendarDays,
  ClipboardList,
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
  | "discover"
  | "profile";

interface BottomNavProps {
  current: AppView;
  onChange: (view: AppView) => void;
}

const tabs: { id: AppView; label: string; icon: LucideIcon }[] = [
  { id: "recipes", label: "Library", icon: BookOpen },
  { id: "plan", label: "Plan", icon: CalendarDays },
  { id: "shopping", label: "Shop", icon: ShoppingBasket },
  { id: "fridge", label: "Fridge", icon: Refrigerator },
  { id: "activity", label: "Activity", icon: ClipboardList },
];

export function BottomNav({ current, onChange }: BottomNavProps) {
  return (
    <nav
      className="safe-bottom fixed inset-x-0 bottom-0 z-30 grid min-h-16 grid-cols-5 border-t border-[var(--ui-border-strong)] bg-[var(--ui-surface)] md:hidden"
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
              "flex min-h-16 min-w-0 flex-col items-center justify-center gap-1 px-1 text-[var(--ui-muted)] transition-colors duration-200",
              active
                ? "bg-[var(--ui-accent-muted)] text-[var(--ui-accent)]"
                : "hover:bg-[var(--ui-surface-subtle)] hover:text-[var(--ui-text)]"
            )}
          >
            <Icon className="h-5 w-5" aria-hidden="true" />
            <span className="max-w-full truncate text-[11px] font-semibold">
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
