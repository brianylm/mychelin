import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface PanelProps extends HTMLAttributes<HTMLDivElement> {
  raised?: boolean;
}

export function Panel({ raised = false, className, ...props }: PanelProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-[var(--ui-border)] bg-[var(--ui-surface)]",
        raised && "bg-[var(--ui-surface-raised)] shadow-sm",
        className
      )}
      {...props}
    />
  );
}
