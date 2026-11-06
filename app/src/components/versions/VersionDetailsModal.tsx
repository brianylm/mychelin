"use client";

import { Star, X } from "lucide-react";

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

const METHOD_LABELS: Record<string, { icon: string; label: string }> = {
  ai_capture: { icon: "🎙️", label: "AI Capture" },
  cook_along: { icon: "👨‍🍳", label: "Logged Cook" },
  manual: { icon: "✏️", label: "Manual Edit" },
  refinement: { icon: "🔄", label: "Refinement" },
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
      className="fixed inset-0 z-50 flex items-end justify-center bg-ui-scrim sm:items-center"
      onClick={onClose}
    >
      <div
        className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-ui-surface-raised sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-ui-border bg-ui-surface-raised px-4 py-3 rounded-t-2xl">
          <div className="flex items-center gap-2">
            <span>{method.icon}</span>
            <div>
              <h3 className="text-sm font-semibold text-ui-text">Version v{label}</h3>
              <p className="text-[11px] text-ui-muted">
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
            className="rounded-lg p-1 text-ui-muted hover:bg-ui-surface-subtle"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-5 px-4 py-4">
          {/* Meta */}
          {(version.changeNote || version.closenessRating !== null) && (
            <div className="rounded-xl bg-ui-accent-muted p-3 text-xs text-ui-text">
              {version.changeNote && (
                <p className="font-medium">{version.changeNote}</p>
              )}
              {version.closenessRating !== null && (
                <div className="mt-1 flex items-center gap-1.5">
                  <span>Closeness:</span>
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) =>
                      star <= (version.closenessRating ?? 0) ? (
                        <Star
                          key={star}
                          className="h-3 w-3 text-ui-warning"
                          fill="currentColor"
                          aria-hidden="true"
                        />
                      ) : (
                        <Star key={star} className="h-3 w-3 text-ui-warning" aria-hidden="true" />
                      )
                    )}
                  </div>
                </div>
              )}
              {version.closenessNotes && (
                <p className="mt-1">&quot;{version.closenessNotes}&quot;</p>
              )}
            </div>
          )}

          {/* Ingredients */}
          <div>
            <h4 className="mb-2 text-xs font-semibold text-ui-muted">
              Ingredients
            </h4>
            {version.ingredients.length === 0 ? (
              <p className="text-xs text-ui-muted">No ingredients recorded</p>
            ) : (
              <ul className="space-y-1">
                {version.ingredients.map((ing, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-ui-text">
                    <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-ui-warning" />
                    <span className="flex-1">
                      <span className="font-medium">{ing.name}</span>
                      {(ing.quantity !== undefined || ing.unit) && (
                        <span className="text-ui-muted">
                          {" "}
                          — {ing.quantity ?? ""} {ing.unit ?? ""}
                        </span>
                      )}
                      {ing.notes && (
                        <span className="block text-xs text-ui-muted">{ing.notes}</span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Instructions */}
          <div>
            <h4 className="mb-2 text-xs font-semibold text-ui-muted">
              Instructions
            </h4>
            {version.instructions.length === 0 ? (
              <p className="text-xs text-ui-muted">No instructions recorded</p>
            ) : (
              <ol className="space-y-2">
                {version.instructions.map((inst, i) => (
                  <li key={i} className="text-sm leading-relaxed text-ui-text">
                    <span className="mr-1.5 font-semibold text-ui-accent">
                      {inst.step ?? i + 1}.
                    </span>
                    {inst.content ?? inst.text}
                    {inst.tip && (
                      <div className="mt-1 rounded-lg bg-ui-accent-muted px-2 py-1 text-xs text-ui-accent">
                        💡 {inst.tip}
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
              <h4 className="mb-2 text-xs font-semibold text-ui-muted">
                Notes
              </h4>
              <p className="text-sm leading-relaxed text-ui-muted">{version.notes}</p>
            </div>
          )}

          {/* Refine CTA */}
          {canRefine && onRefine && (
            <button
              onClick={onRefine}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-ui-action px-4 py-3 text-sm font-medium text-ui-action-text transition-colors hover:bg-ui-accent"
            >
              ✨ Refine with AI
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
