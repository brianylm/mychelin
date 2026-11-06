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
    "border border-ui-action bg-ui-action text-ui-action-text hover:bg-ui-action-hover",
  secondary:
    "border border-ui-border-strong bg-ui-surface-raised text-ui-text hover:border-ui-border-strong hover:bg-ui-accent-muted",
  tertiary:
    "border border-transparent bg-transparent text-ui-accent hover:bg-ui-accent-muted",
  danger:
    "border border-transparent bg-transparent text-ui-danger hover:bg-ui-danger-soft",
  quiet:
    "border border-transparent bg-transparent text-ui-muted hover:bg-ui-surface-subtle hover:text-ui-text",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-8 gap-1.5 rounded-md px-3 text-xs",
  md: "h-10 gap-2 rounded-lg px-4 text-sm",
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
      className={cn(
        "inline-flex shrink-0 items-center justify-center font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-focus focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-55",
        sizes[size],
        variants[variant],
        className
      )}
      {...props}
    >
      {loading ? (
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        iconStart
      )}
      {children}
      {iconEnd}
    </button>
  );
}
