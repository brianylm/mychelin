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
import type { AppView } from "./BottomNav";

interface DesktopNavProps {
  current: AppView;
  onChange: (view: AppView) => void;
}

const tabs: { id: AppView; label: string; icon: LucideIcon }[] = [
  { id: "recipes", label: "Library", icon: BookOpen },
  { id: "activity", label: "Activity", icon: ClipboardList },
  { id: "fridge", label: "Fridge", icon: Refrigerator },
  { id: "shopping", label: "Shopping", icon: ShoppingBasket },
  { id: "plan", label: "Meal Plan", icon: CalendarDays },
];

export function DesktopNav({ current, onChange }: DesktopNavProps) {
  return (
    <nav
      className="hidden min-w-0 items-center gap-1 rounded-full border border-[var(--ui-border)] bg-[var(--ui-surface-subtle)] p-0.5 md:flex"
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
            aria-label={tab.label}
            aria-current={active ? "page" : undefined}
            title={tab.label}
            className={cn(
              "flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-full px-2 text-sm font-medium transition-colors duration-150 lg:px-3",
              active
                ? "bg-[var(--ui-action)] text-[var(--ui-action-text)] shadow-[0_4px_12px_rgba(23,19,31,0.14)]"
                : "text-[var(--ui-muted)] hover:bg-[var(--ui-surface-raised)] hover:text-[var(--ui-text)]"
            )}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {tab.id === "plan" ? (
              <>
                <span className="whitespace-nowrap lg:hidden">Plan</span>
                <span className="hidden whitespace-nowrap lg:inline">Meal Plan</span>
              </>
            ) : (
              <span className="whitespace-nowrap">{tab.label}</span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
