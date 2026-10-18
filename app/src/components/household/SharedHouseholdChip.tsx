"use client";

import { House } from "lucide-react";

// Marks a tab (Plan, Shopping, Inventory) as showing the household's shared
// data, and links to the household settings in Profile.
export function SharedHouseholdChip({ name, onOpen }: { name?: string | null; onOpen?: () => void }) {
  const label = name ? `Shared with ${name}` : "Shared with household";
  const className =
    "ml-2 inline-flex items-center gap-1 rounded-full bg-ui-accent/10 px-2 py-0.5 text-[10px] font-semibold text-ui-accent";
  if (!onOpen) return <span className={className}>{label}</span>;
  return (
    <button
      type="button"
      onClick={onOpen}
      title="Household settings"
      className={`${className} transition-colors hover:bg-ui-accent/20`}
    >
      <House className="h-3 w-3" aria-hidden="true" />
      {label}
    </button>
  );
}
