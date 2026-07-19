import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "tertiary" | "danger" | "quiet";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  iconStart?: ReactNode;
  iconEnd?: ReactNode;
  loading?: boolean;
}

const variants: Record<ButtonVariant, string> = {
  primary:
    "border border-[var(--ui-action)] bg-[var(--ui-action)] text-[var(--ui-action-text)] hover:bg-[var(--ui-action-hover)]",
  secondary:
    "border border-[var(--ui-border-strong)] bg-[var(--ui-surface-raised)] text-[var(--ui-text)] hover:border-[var(--ui-accent)]/40 hover:bg-[var(--ui-accent-muted)]",
  tertiary:
    "border border-transparent bg-transparent text-[var(--ui-accent)] hover:bg-[var(--ui-accent-muted)]",
  danger:
    "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100",
  quiet:
    "border border-transparent bg-transparent text-[var(--ui-muted)] hover:bg-[var(--ui-surface-subtle)] hover:text-[var(--ui-text)]",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-11 gap-1.5 rounded-lg px-3 text-xs",
  md: "h-11 gap-2 rounded-lg px-4 text-sm",
  lg: "h-12 gap-2.5 rounded-lg px-5 text-base",
};

export function Button({
  variant = "primary",
  size = "md",
  iconStart,
  iconEnd,
  loading = false,
  disabled,
  className,
  children,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        "inline-flex shrink-0 items-center justify-center whitespace-nowrap font-semibold transition-[background-color,border-color,color,transform] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-focus)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-55 active:translate-y-px",
        sizes[size],
        variants[variant],
        className
      )}
      {...props}
    >
      {loading ? (
        <span
          className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-hidden="true"
        />
      ) : (
        iconStart
      )}
      {children}
      {iconEnd}
    </button>
  );
}
