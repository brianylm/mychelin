import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("grid justify-items-center gap-2 py-8 text-center", className)}>
      <p className="text-sm font-semibold text-[var(--ui-text)]">{title}</p>
      {description && (
        <p className="max-w-sm text-xs leading-5 text-[var(--ui-muted)]">
          {description}
        </p>
      )}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
