"use client";

import { Cross2Icon, StarIcon, StarFilledIcon } from "@radix-ui/react-icons";

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
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
      onClick={onClose}
    >
      <div
        className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-neutral-100 bg-white px-4 py-3 rounded-t-2xl">
          <div className="flex items-center gap-2">
            <span>{method.icon}</span>
            <div>
              <h3 className="text-sm font-semibold text-neutral-800">Version v{label}</h3>
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
            className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100"
          >
            <Cross2Icon className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-5 px-4 py-4">
          {/* Meta */}
          {(version.changeNote || version.closenessRating !== null) && (
            <div className="rounded-xl bg-[#800020]/5 p-3 text-xs text-[#521224]">
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
                      <div className="mt-1 rounded-lg bg-[#800020]/5 px-2 py-1 text-xs text-[#800020]">
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
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#17131f] px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-[#800020]"
            >
              ✨ Refine with AI
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
