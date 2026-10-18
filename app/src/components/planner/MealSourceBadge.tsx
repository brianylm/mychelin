import { CookingPot, Refrigerator, Snowflake, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const SOURCE_STYLES: Record<
  "fresh" | "fridge" | "frozen",
  { label: string; icon: LucideIcon; styles: string }
> = {
  fresh: {
    label: "Cook fresh",
    icon: CookingPot,
    styles: "border-ui-accent/20 bg-ui-accent-muted text-ui-accent",
  },
  fridge: {
    label: "Ready — fridge",
    icon: Refrigerator,
    styles: "border-ui-info/20 bg-ui-info-soft text-ui-info",
  },
  frozen: {
    label: "Ready — frozen",
    icon: Snowflake,
    styles: "border-ui-border bg-ui-surface-subtle text-ui-muted",
  },
};

export function MealSourceBadge({
  source,
  className,
}: {
  source: "fresh" | "fridge" | "frozen";
  className?: string;
}) {
  const { label, icon: Icon, styles } = SOURCE_STYLES[source];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium",
        styles,
        className
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      {label}
    </span>
  );
}
