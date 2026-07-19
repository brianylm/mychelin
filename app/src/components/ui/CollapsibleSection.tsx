"use client";

import { useId, useState, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface CollapsibleSectionProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  defaultOpen?: boolean;
  badge?: number | string;
  className?: string;
}

export function CollapsibleSection({
  title,
  subtitle,
  children,
  defaultOpen = false,
  badge,
  className,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const contentId = useId();

  return (
    <section
      className={cn(
        "border-y border-[var(--ui-border)] bg-transparent",
        className
      )}
    >
      <button
        type="button"
        onClick={() => setIsOpen((value) => !value)}
        className="flex min-h-14 w-full items-center justify-between gap-4 px-1 py-3 text-left transition-colors duration-200 hover:bg-[var(--ui-surface-subtle)]"
        aria-expanded={isOpen}
        aria-controls={contentId}
      >
        <span className="flex min-w-0 items-center gap-3">
          <ChevronRight
            className={cn(
              "h-4 w-4 shrink-0 text-[var(--ui-muted)] transition-transform duration-200",
              isOpen && "rotate-90"
            )}
            aria-hidden="true"
          />
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-[var(--ui-text)]">
              {title}
            </span>
            {subtitle && (
              <span className="mt-0.5 block text-xs leading-5 text-[var(--ui-muted)]">
                {subtitle}
              </span>
            )}
          </span>
        </span>
        {badge !== undefined && (
          <span className="flex min-h-6 min-w-6 shrink-0 items-center justify-center rounded-md bg-[var(--ui-accent-muted)] px-1.5 text-xs font-semibold text-[var(--ui-accent)]">
            {badge}
          </span>
        )}
      </button>
      {isOpen && (
        <div
          id={contentId}
          className="border-t border-[var(--ui-border)] px-1 py-4"
        >
          {children}
        </div>
      )}
    </section>
  );
}
