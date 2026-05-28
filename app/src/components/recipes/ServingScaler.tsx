"use client";

import { useState, useMemo } from "react";

interface ServingScalerProps {
  baseYield: string; // e.g. "4 servings", "2 portions", "6"
  onScaleChange: (scale: number) => void;
}

function parseBaseServings(yieldStr: string): number | null {
  if (!yieldStr) return null;
  // Extract first number from yield string
  const match = yieldStr.match(/(\d+\.?\d*)/);
  return match ? parseFloat(match[1]) : null;
}

function getYieldLabel(yieldStr: string): string {
  // Extract the label part (e.g. "servings", "portions", "pax")
  const match = yieldStr.match(/\d+\.?\d*\s*(.*)/);
  const label = match?.[1]?.trim();
  return label || "servings";
}

export function ServingScaler({ baseYield, onScaleChange }: ServingScalerProps) {
  const baseServings = useMemo(() => parseBaseServings(baseYield), [baseYield]);
  const yieldLabel = useMemo(() => getYieldLabel(baseYield), [baseYield]);
  const [currentServings, setCurrentServings] = useState<number>(baseServings ?? 1);

  if (baseServings === null || baseServings <= 0) return null;

  const handleChange = (newServings: number) => {
    if (newServings < 1) return;
    setCurrentServings(newServings);
    onScaleChange(newServings / baseServings);
  };

  const isScaled = currentServings !== baseServings;

  return (
    <div className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white px-4 py-3">
      <div className="flex items-center gap-2 text-sm">
        <span className="text-neutral-500">Yield</span>
        {isScaled && (
          <button
            onClick={() => handleChange(baseServings)}
            className="text-[10px] font-medium text-[#800020] hover:text-[#800020] transition-colors"
          >
            Reset
          </button>
        )}
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => handleChange(currentServings - 1)}
          disabled={currentServings <= 1}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 text-neutral-600 transition-colors hover:bg-neutral-50 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          −
        </button>
        <span className={`min-w-[4rem] text-center text-sm font-semibold tabular-nums ${isScaled ? "text-[#800020]" : "text-neutral-800"}`}>
          {currentServings} {yieldLabel}
        </span>
        <button
          onClick={() => handleChange(currentServings + 1)}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 text-neutral-600 transition-colors hover:bg-neutral-50"
        >
          +
        </button>
      </div>
    </div>
  );
}

// Format a scaled quantity with cooking-friendly fractions
export function formatScaledQuantity(quantity: number | null, scale: number): string {
  if (quantity === null || quantity === 0) return "";

  const scaled = quantity * scale;

  // Round to avoid floating point noise
  const rounded = Math.round(scaled * 100) / 100;

  // If it's a whole number
  if (Math.abs(rounded - Math.round(rounded)) < 0.01) {
    return String(Math.round(rounded));
  }

  // Try common cooking fractions
  const wholePart = Math.floor(rounded);
  const fractional = rounded - wholePart;

  const fractions: [number, string][] = [
    [0.125, "⅛"],
    [0.25, "¼"],
    [0.333, "⅓"],
    [0.375, "⅜"],
    [0.5, "½"],
    [0.625, "⅝"],
    [0.667, "⅔"],
    [0.75, "¾"],
    [0.875, "⅞"],
  ];

  for (const [value, symbol] of fractions) {
    if (Math.abs(fractional - value) < 0.05) {
      return wholePart > 0 ? `${wholePart}${symbol}` : symbol;
    }
  }

  // Fallback: 1 decimal place
  return rounded.toFixed(1);
}
