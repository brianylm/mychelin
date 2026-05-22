"use client";

import { useState, type ReactNode } from "react";
import { ChevronRightIcon } from "@radix-ui/react-icons";
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

  return (
    <section
      className={cn("rounded-2xl border border-neutral-200 bg-white", className)}
    >
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between p-4 text-left transition hover:bg-neutral-50"
      >
        <div className="flex items-center gap-3">
          <ChevronRightIcon
            className={cn(
              "h-4 w-4 transition-transform",
              isOpen ? "rotate-90" : "rotate-0"
            )}
          />
          <div>
            <h3 className="text-sm font-semibold text-neutral-800">{title}</h3>
            {subtitle && (
              <p className="text-xs text-neutral-500">{subtitle}</p>
            )}
          </div>
        </div>
        {badge !== undefined && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-100 px-1.5 text-xs font-medium text-amber-700">
            {badge}
          </span>
        )}
      </button>
      {isOpen && (
        <div className="border-t border-neutral-200 p-4">{children}</div>
      )}
    </section>
  );
}
