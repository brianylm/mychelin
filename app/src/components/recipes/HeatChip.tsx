import { Flame } from "lucide-react";
import { HEAT_CONFIG, type HeatLevel } from "@/lib/instruction-heat";

export function HeatChip({ heat, dark = false }: { heat: HeatLevel; dark?: boolean }) {
  if (!heat) return null;
  const config = HEAT_CONFIG[heat];

  return (
    <span
      className={
        dark
          ? "inline-flex items-center gap-1 rounded-full border border-[#f7c86a]/30 bg-[#f7c86a]/10 px-2.5 py-1 text-xs font-semibold text-[#f7c86a]"
          : "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold " + config.className
      }
    >
      <Flame className="h-3.5 w-3.5" />
      {config.label}
    </span>
  );
}
