import { Flame } from "lucide-react";
import { HEAT_CONFIG, type HeatLevel } from "@/lib/instruction-heat";

export function HeatChip({ heat, dark = false }: { heat: HeatLevel; dark?: boolean }) {
  if (!heat) return null;
  const config = HEAT_CONFIG[heat];

  return (
    <span
      className={
        dark
          ? "inline-flex items-center gap-1 text-sm font-medium text-ui-highlight"
          : "inline-flex items-center gap-1 text-sm font-medium " + config.className
      }
    >
      <Flame className="h-3.5 w-3.5" />
      {config.label}
    </span>
  );
}
