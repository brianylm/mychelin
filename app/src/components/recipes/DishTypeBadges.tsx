import { Bean, Drumstick, Egg, Fish, LeafyGreen, Soup, Wheat } from "lucide-react";
import { DISH_TYPE_LABELS, type DishType } from "@/lib/dish-type";

const ICONS = {
  meat: Drumstick,
  seafood: Fish,
  egg: Egg,
  tofu: Bean,
  vegetable: LeafyGreen,
  carb: Wheat,
  soup: Soup,
} satisfies Record<DishType, typeof Drumstick>;

export function DishTypeBadges({
  types,
  variant = "label",
}: {
  types: readonly DishType[];
  variant?: "label" | "icon";
}) {
  if (types.length === 0) return null;

  return (
    <ul aria-label="Dish type" className="flex flex-wrap gap-1">
      {types.map((type) => {
        const Icon = ICONS[type];
        const label = DISH_TYPE_LABELS[type];
        return (
          <li key={type}>
            {variant === "label" ? (
              <span className="inline-flex items-center gap-1 rounded-md border border-ui-border bg-ui-surface-subtle px-1.5 py-0.5 text-[11px] font-medium text-ui-muted">
                <Icon className="h-3 w-3" aria-hidden="true" />
                {label}
              </span>
            ) : (
              <span title={label}>
                <Icon className="h-3 w-3" aria-hidden="true" />
                <span className="sr-only">{label}</span>
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
