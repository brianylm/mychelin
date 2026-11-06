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
    className: "text-ui-info",
  },
  medium: {
    label: "Medium heat",
    shortLabel: "Medium",
    className: "text-ui-warning-text",
  },
  high: {
    label: "High heat",
    shortLabel: "High",
    className: "text-ui-danger",
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
