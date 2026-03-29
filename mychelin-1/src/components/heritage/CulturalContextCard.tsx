"use client";

import { useState, useCallback, useEffect } from "react";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import { SaveIndicator } from "@/components/ui/SaveIndicator";

interface CulturalContextCardProps {
  origin: string;
  dialect: string;
  occasion: string;
  familyMember: string;
  generation: string;
  onSave: (field: string, value: string) => Promise<void>;
}

const DIALECT_OPTIONS = [
  "",
  "Hokkien",
  "Teochew",
  "Cantonese",
  "Hakka",
  "Hainanese",
  "Mandarin",
  "Malay",
  "Tamil",
  "Punjabi",
  "English",
  "Other",
];

const OCCASION_OPTIONS = [
  "",
  "Everyday",
  "Chinese New Year",
  "Hari Raya",
  "Deepavali",
  "Mid-Autumn",
  "Qing Ming",
  "Wedding",
  "Funeral",
  "Birthday",
  "Family Reunion",
  "Mooncake Festival",
  "Christmas",
  "Other",
];

const GENERATION_OPTIONS = [
  "",
  "Great-grandparent",
  "Grandparent",
  "Parent",
  "Self",
  "Unknown / Passed down",
];

function FieldRow({
  label,
  children,
  savingField,
  currentField,
}: {
  label: string;
  children: React.ReactNode;
  savingField: string | null;
  currentField: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium uppercase tracking-wide text-neutral-500">
          {label}
        </label>
        <SaveIndicator isSaving={savingField === currentField} />
      </div>
      {children}
    </div>
  );
}

export function CulturalContextCard({
  origin,
  dialect,
  occasion,
  familyMember,
  generation,
  onSave,
}: CulturalContextCardProps) {
  const [savingField, setSavingField] = useState<string | null>(null);
  const [values, setValues] = useState({
    origin,
    dialect,
    occasion,
    familyMember,
    generation,
  });

  // Sync values when recipe changes (prop update)
  useEffect(() => {
    setValues({ origin, dialect, occasion, familyMember, generation });
  }, [origin, dialect, occasion, familyMember, generation]);

  const handleBlur = useCallback(
    async (field: string) => {
      const newVal = values[field as keyof typeof values];
      const originals = { origin, dialect, occasion, familyMember, generation };
      if (newVal === originals[field as keyof typeof originals]) return;

      setSavingField(field);
      try {
        await onSave(field, newVal);
      } finally {
        setSavingField(null);
      }
    },
    [values, origin, dialect, occasion, familyMember, generation, onSave]
  );

  const inputClass =
    "w-full rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm text-neutral-900 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100 focus:bg-white placeholder:text-neutral-400";
  const selectClass = (value: string) =>
    `w-full rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100 focus:bg-white ${!value ? "text-neutral-400" : "text-neutral-900"}`;

  const filledCount = Object.values(values).filter(Boolean).length;

  return (
    <CollapsibleSection
      title="Cultural Context"
      subtitle="Where this recipe comes from"
      badge={filledCount > 0 ? filledCount : undefined}
      defaultOpen={filledCount > 0}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <FieldRow label="Origin / Region" savingField={savingField} currentField="origin">
          <input
            value={values.origin}
            onChange={(e) => setValues((v) => ({ ...v, origin: e.target.value }))}
            onBlur={() => handleBlur("origin")}
            placeholder="e.g. Clarke Quay, Penang, Ipoh"
            className={inputClass}
          />
        </FieldRow>

        <FieldRow label="Dialect / Language" savingField={savingField} currentField="dialect">
          <select
            value={values.dialect}
            onChange={(e) => {
              setValues((v) => ({ ...v, dialect: e.target.value }));
              setTimeout(() => handleBlur("dialect"), 0);
            }}
            className={selectClass(values.dialect)}
          >
            {DIALECT_OPTIONS.map((d) => (
              <option key={d} value={d}>
                {d || "Select dialect..."}
              </option>
            ))}
          </select>
        </FieldRow>

        <FieldRow label="Occasion" savingField={savingField} currentField="occasion">
          <select
            value={values.occasion}
            onChange={(e) => {
              setValues((v) => ({ ...v, occasion: e.target.value }));
              setTimeout(() => handleBlur("occasion"), 0);
            }}
            className={selectClass(values.occasion)}
          >
            {OCCASION_OPTIONS.map((o) => (
              <option key={o} value={o}>
                {o || "Select occasion..."}
              </option>
            ))}
          </select>
        </FieldRow>

        <FieldRow label="Generation" savingField={savingField} currentField="generation">
          <select
            value={values.generation}
            onChange={(e) => {
              setValues((v) => ({ ...v, generation: e.target.value }));
              setTimeout(() => handleBlur("generation"), 0);
            }}
            className={selectClass(values.generation)}
          >
            {GENERATION_OPTIONS.map((g) => (
              <option key={g} value={g}>
                {g || "Who passed this down?"}
              </option>
            ))}
          </select>
        </FieldRow>

        <FieldRow
          label="Family Member"
          savingField={savingField}
          currentField="familyMember"
        >
          <input
            value={values.familyMember}
            onChange={(e) =>
              setValues((v) => ({ ...v, familyMember: e.target.value }))
            }
            onBlur={() => handleBlur("familyMember")}
            placeholder="e.g. Grandma Lim, Ah Ma, Nenek"
            className={inputClass}
          />
        </FieldRow>
      </div>
    </CollapsibleSection>
  );
}
