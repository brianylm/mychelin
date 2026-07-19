import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: ReactNode;
  eyebrow?: string;
  actions?: ReactNode;
  meta?: ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  eyebrow,
  actions,
  meta,
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "grid min-w-0 gap-4 border-b border-[var(--ui-border)] pb-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end",
        className
      )}
    >
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ui-accent)]">
            {eyebrow}
          </p>
        )}
        <h1 className="min-w-0 text-2xl font-semibold leading-tight text-[var(--ui-text)] [overflow-wrap:anywhere] sm:text-[1.75rem]">
          {title}
        </h1>
        {description && (
          <div className="mt-2 max-w-2xl text-sm leading-6 text-[var(--ui-muted)]">
            {description}
          </div>
        )}
        {meta && <div className="mt-3">{meta}</div>}
      </div>
      {actions && (
        <div className="flex min-w-0 flex-wrap items-center gap-2 sm:justify-end">
          {actions}
        </div>
      )}
    </header>
  );
}

interface SectionHeaderProps {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function SectionHeader({
  title,
  description,
  actions,
  className,
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between",
        className
      )}
    >
      <div className="min-w-0">
        <h2 className="text-lg font-semibold leading-tight text-[var(--ui-text)]">
          {title}
        </h2>
        {description && (
          <div className="mt-1 max-w-2xl text-sm leading-5 text-[var(--ui-muted)]">
            {description}
          </div>
        )}
      </div>
      {actions && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {actions}
        </div>
      )}
    </div>
  );
}
