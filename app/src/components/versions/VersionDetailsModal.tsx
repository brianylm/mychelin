"use client";

import { StarIcon, StarFilledIcon } from "@radix-ui/react-icons";
import { GitBranch, Lightbulb, WandSparkles, X } from "lucide-react";

interface Ingredient {
  name: string;
  quantity?: number;
  unit?: string;
  notes?: string;
}

interface Instruction {
  content?: string;
  text?: string;
  step?: number;
  tip?: string;
  imageUrl?: string;
}

interface Version {
  id: number;
  versionNumber: number;
  versionLabel: string | null;
  captureMethod: string;
  closenessRating: number | null;
  closenessNotes: string | null;
  changeNote: string | null;
  notes: string | null;
  createdAt: string;
  ingredients: Ingredient[];
  instructions: Instruction[];
  sourceVersionId: number | null;
}

interface VersionDetailsModalProps {
  version: Version;
  onClose: () => void;
  onRefine?: () => void;
}

const METHOD_LABELS: Record<string, { label: string }> = {
  ai_capture: { label: "AI capture" },
  cook_along: { label: "Logged cook" },
  manual: { label: "Manual edit" },
  refinement: { label: "Refinement" },
};

export function VersionDetailsModal({ version, onClose, onRefine }: VersionDetailsModalProps) {
  const label = version.versionLabel ?? String(version.versionNumber);
  const method = METHOD_LABELS[version.captureMethod] ?? METHOD_LABELS.manual;
  const canRefine =
    version.captureMethod === "cook_along" &&
    version.closenessRating !== null &&
    version.closenessRating < 5;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-stone-950/45 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-lg border border-[var(--ui-border-strong)] bg-[var(--ui-surface-raised)] shadow-xl sm:rounded-lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="version-details-title"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex min-h-16 items-center justify-between border-b border-[var(--ui-border)] bg-[var(--ui-surface-raised)] px-4 py-2">
          <div className="flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-[var(--ui-accent)]" aria-hidden="true" />
            <div>
              <h3 id="version-details-title" className="text-sm font-semibold text-[var(--ui-text)]">Version {label}</h3>
              <p className="text-[11px] text-neutral-400">
                {method.label} ·{" "}
                {new Date(version.createdAt).toLocaleDateString("en-SG", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-lg text-[var(--ui-muted)] transition-colors hover:bg-[var(--ui-surface-subtle)] hover:text-[var(--ui-text)]"
            aria-label="Close version details"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="space-y-5 px-4 py-4">
          {/* Meta */}
          {(version.changeNote || version.closenessRating !== null) && (
            <div className="border-l-2 border-[var(--ui-accent)] bg-[var(--ui-accent-muted)] px-3 py-2 text-xs text-[#521224]">
              {version.changeNote && (
                <p className="font-medium">{version.changeNote}</p>
              )}
              {version.closenessRating !== null && (
                <div className="mt-1 flex items-center gap-1.5">
                  <span>Closeness:</span>
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) =>
                      star <= (version.closenessRating ?? 0) ? (
                        <StarFilledIcon
                          key={star}
                          className="h-3 w-3 text-amber-500"
                        />
                      ) : (
                        <StarIcon key={star} className="h-3 w-3 text-amber-300" />
                      )
                    )}
                  </div>
                </div>
              )}
              {version.closenessNotes && (
                <p className="mt-1 italic">&quot;{version.closenessNotes}&quot;</p>
              )}
            </div>
          )}

          {/* Ingredients */}
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
              Ingredients
            </h4>
            {version.ingredients.length === 0 ? (
              <p className="text-xs italic text-neutral-400">No ingredients recorded</p>
            ) : (
              <ul className="space-y-1">
                {version.ingredients.map((ing, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-neutral-700">
                    <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-amber-400" />
                    <span className="flex-1">
                      <span className="font-medium">{ing.name}</span>
                      {(ing.quantity !== undefined || ing.unit) && (
                        <span className="text-neutral-500">
                          {" "}
                          — {ing.quantity ?? ""} {ing.unit ?? ""}
                        </span>
                      )}
                      {ing.notes && (
                        <span className="block text-xs text-neutral-400">{ing.notes}</span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Instructions */}
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
              Instructions
            </h4>
            {version.instructions.length === 0 ? (
              <p className="text-xs italic text-neutral-400">No instructions recorded</p>
            ) : (
              <ol className="space-y-2">
                {version.instructions.map((inst, i) => (
                  <li key={i} className="text-sm leading-relaxed text-neutral-700">
                    <span className="mr-1.5 font-semibold text-[#800020]">
                      {inst.step ?? i + 1}.
                    </span>
                    {inst.content ?? inst.text}
                    {inst.tip && (
                      <div className="mt-2 flex items-start gap-2 border-l-2 border-[var(--ui-accent)] bg-[var(--ui-accent-muted)] px-2 py-1.5 text-xs text-[var(--ui-accent)]">
                        <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" /> {inst.tip}
                      </div>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </div>

          {/* Notes */}
          {version.notes && (
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
                Notes
              </h4>
              <p className="text-sm leading-relaxed text-neutral-600">{version.notes}</p>
            </div>
          )}

          {/* Refine CTA */}
          {canRefine && onRefine && (
            <button
              onClick={onRefine}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[var(--ui-action)] px-4 text-sm font-semibold text-[var(--ui-action-text)] transition-colors hover:bg-[var(--ui-action-hover)]"
            >
              <WandSparkles className="h-4 w-4" aria-hidden="true" /> Refine suggestions
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
