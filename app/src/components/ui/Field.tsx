import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface FieldProps {
  id: string;
  label: string;
  help?: ReactNode;
  error?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function Field({ id, label, help, error, children, className }: FieldProps) {
  return (
    <div className={cn("grid gap-1.5", className)}>
      <label htmlFor={id} className="text-xs font-semibold text-[var(--ui-muted)]">
        {label}
      </label>
      {children}
      {help && !error && (
        <p id={id + "-help"} className="text-xs leading-5 text-[var(--ui-muted)]">
          {help}
        </p>
      )}
      {error && (
        <p id={id + "-error"} className="text-xs leading-5 text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

export function fieldDescriptionIds(id: string, hasHelp?: boolean, hasError?: boolean) {
  return [hasHelp ? id + "-help" : null, hasError ? id + "-error" : null]
    .filter(Boolean)
    .join(" ") || undefined;
}
