export const HEAT_LEVELS = [null, "low", "medium", "high"] as const;

export type HeatLevel = (typeof HEAT_LEVELS)[number];

export const HEAT_CONFIG: Record<Exclude<HeatLevel, null>, {
  label: string;
  shortLabel: string;
  className: string;
}> = {
  low: {
    label: "Low heat",
    shortLabel: "Low",
    className: "border-blue-200 bg-blue-50 text-blue-700",
  },
  medium: {
    label: "Medium heat",
    shortLabel: "Medium",
    className: "border-amber-200 bg-amber-50 text-amber-800",
  },
  high: {
    label: "High heat",
    shortLabel: "High",
    className: "border-red-200 bg-red-50 text-red-700",
  },
};

export function parseHeatFromTip(tip: string | null | undefined): {
  heat: HeatLevel;
  cleanTip: string;
} {
  if (!tip) return { heat: null, cleanTip: "" };
  const match = tip.match(/^\[heat:(low|medium|high)\]\s*/);
  if (!match) return { heat: null, cleanTip: tip };

  return {
    heat: match[1] as Exclude<HeatLevel, null>,
    cleanTip: tip.slice(match[0].length),
  };
}

export function encodeHeatInTip(heat: HeatLevel, cleanTip: string): string | null {
  const trimmedTip = cleanTip.trim();
  if (!heat && !trimmedTip) return null;
  if (!heat) return trimmedTip;
  return `[heat:${heat}]${trimmedTip ? " " + trimmedTip : ""}`;
}
