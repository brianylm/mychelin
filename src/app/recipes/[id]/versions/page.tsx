"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface Ingredient {
  name: string;
  amount: string;
  unit: string;
  notes?: string;
}

interface Step {
  step: number;
  text: string;
}

interface RecipeVersion {
  id: string;
  versionNumber: number;
  ingredients: Ingredient[] | null;
  instructions: Step[] | null;
  notes: string | null;
  changeNote: string | null;
  changedBy: string | null;
  createdAt: string | number;
}

export default function RecipeVersionsPage() {
  const params = useParams();
  const router = useRouter();
  const recipeId = params.id as string;

  const [versions, setVersions] = useState<RecipeVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    fetchVersions();
  }, [recipeId]);

  async function fetchVersions() {
    setLoading(true);
    try {
      const res = await fetch(`/api/recipes/${recipeId}/versions`);
      const data = await res.json();
      setVersions(data.versions || []);
    } catch {
      console.error("Failed to load versions");
    } finally {
      setLoading(false);
    }
  }

  async function handleRestore(version: RecipeVersion) {
    setRestoringId(version.id);
    try {
      const res = await fetch(
        `/api/recipes/${recipeId}/versions/${version.id}/restore`,
        { method: "POST" }
      );
      if (!res.ok) throw new Error("Restore failed");
      showToast(`Restored to version ${version.versionNumber} ✓`);
      await fetchVersions();
      // Redirect back to recipe after a short delay
      setTimeout(() => router.push(`/recipes/${recipeId}`), 1200);
    } catch {
      showToast("Failed to restore version");
    } finally {
      setRestoringId(null);
    }
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  function formatDate(createdAt: string | number) {
    const d = typeof createdAt === "number" ? new Date(createdAt * 1000) : new Date(createdAt);
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Toast */}
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-stone-900 text-white px-6 py-3 rounded-2xl text-sm shadow-xl">
          {toast}
        </div>
      )}

      {/* Back */}
      <Link
        href={`/recipes/${recipeId}`}
        className="inline-flex items-center gap-2 text-stone-500 hover:text-stone-800 mb-8 text-base font-medium transition-colors"
      >
        ← Back to Recipe
      </Link>

      <h1 className="text-3xl font-bold text-stone-900 font-heading mb-2">Version History</h1>
      <p className="text-stone-500 mb-8 text-base">All saved versions of this recipe, newest first.</p>

      {loading ? (
        <div className="text-center py-20 text-stone-400">Loading versions…</div>
      ) : versions.length === 0 ? (
        <div className="text-center py-20 text-stone-400">No versions found.</div>
      ) : (
        <div className="space-y-4">
          {versions.map((version, idx) => {
            const isExpanded = expandedId === version.id;
            const isLatest = idx === 0;
            const ingredients = version.ingredients || [];
            const instructions = version.instructions || [];

            return (
              <div
                key={version.id}
                className="bg-white rounded-3xl border border-stone-200 overflow-hidden"
              >
                {/* Version header */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : version.id)}
                  className="w-full text-left px-8 py-6 flex items-center justify-between hover:bg-stone-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-stone-100 rounded-full flex items-center justify-center font-bold text-stone-700 text-sm flex-shrink-0">
                      v{version.versionNumber}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-stone-800">
                          {version.changeNote || "Updated recipe"}
                        </span>
                        {isLatest && (
                          <span className="bg-green-100 text-green-700 text-xs font-medium px-2 py-0.5 rounded-full">
                            Latest
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-stone-400 mt-0.5">
                        {formatDate(version.createdAt)}
                      </div>
                    </div>
                  </div>
                  <span className="text-stone-400 text-lg">{isExpanded ? "↑" : "↓"}</span>
                </button>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="px-8 pb-8 border-t border-stone-100">
                    {/* Ingredients */}
                    {ingredients.length > 0 && (
                      <div className="mt-6">
                        <h3 className="text-base font-semibold text-stone-700 mb-3">Ingredients</h3>
                        <ul className="space-y-2">
                          {ingredients.map((ing, i) => (
                            <li key={i} className="flex items-start gap-3 text-sm text-stone-600">
                              <span className="w-1.5 h-1.5 bg-amber-500 rounded-full flex-shrink-0 mt-1.5" />
                              <span>
                                {ing.amount && <span className="font-medium">{ing.amount} </span>}
                                {ing.unit && <span className="text-stone-500">{ing.unit} </span>}
                                {ing.name}
                                {ing.notes && <span className="text-stone-400"> ({ing.notes})</span>}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Instructions */}
                    {instructions.length > 0 && (
                      <div className="mt-6">
                        <h3 className="text-base font-semibold text-stone-700 mb-3">Instructions</h3>
                        <ol className="space-y-3">
                          {instructions.map((step) => (
                            <li key={step.step} className="flex gap-3 text-sm text-stone-600">
                              <span className="w-6 h-6 bg-stone-100 text-stone-700 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0">
                                {step.step}
                              </span>
                              <p className="pt-0.5 leading-relaxed">{step.text}</p>
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}

                    {/* Notes */}
                    {version.notes && (
                      <div className="mt-6">
                        <h3 className="text-base font-semibold text-stone-700 mb-2">Notes</h3>
                        <p className="text-sm text-stone-500 italic">{version.notes}</p>
                      </div>
                    )}

                    {/* Restore button (not shown for latest) */}
                    {!isLatest && (
                      <div className="mt-6 pt-4 border-t border-stone-100">
                        <button
                          onClick={() => handleRestore(version)}
                          disabled={restoringId === version.id}
                          className="px-5 py-2.5 bg-stone-800 text-white rounded-xl text-sm font-medium hover:bg-stone-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {restoringId === version.id ? "Restoring…" : `Restore version ${version.versionNumber}`}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
