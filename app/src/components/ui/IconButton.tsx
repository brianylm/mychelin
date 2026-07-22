import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type IconButtonVariant = "secondary" | "tertiary" | "quiet" | "danger";
type IconButtonSize = "sm" | "md" | "lg";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  // Accessible name for the icon-only control. Required because there is no
  // visible label — enforced at the type level via `aria-label`.
  "aria-label": string;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  loading?: boolean;
  children: ReactNode;
}

const variants: Record<IconButtonVariant, string> = {
  secondary:
    "border border-ui-border-strong bg-ui-surface-raised text-ui-text hover:border-ui-accent/40 hover:bg-ui-accent-muted",
  tertiary:
    "border border-transparent bg-transparent text-ui-accent hover:bg-ui-accent-muted",
  quiet:
    "border border-transparent bg-transparent text-ui-muted hover:bg-ui-surface-subtle hover:text-ui-text",
  danger:
    "border border-ui-danger/20 bg-ui-danger-soft text-ui-danger hover:bg-ui-danger/15",
};

// sm/md keep 44px touch targets per the design system; xs is intentionally
// not offered — kitchen and senior use needs the full target.
const sizes: Record<IconButtonSize, string> = {
  sm: "h-11 w-11 rounded-md",
  md: "h-11 w-11 rounded-lg",
  lg: "h-12 w-12 rounded-lg",
};

export function IconButton({
  variant = "quiet",
  size = "md",
  loading = false,
  disabled,
  className,
  children,
  type = "button",
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cn(
        "inline-flex shrink-0 items-center justify-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-focus focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-55",
        sizes[size],
        variants[variant],
        className
      )}
      {...props}
    >
      {loading ? (
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        children
      )}
    </button>
  );
}
