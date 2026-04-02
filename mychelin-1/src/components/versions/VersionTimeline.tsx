"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock,
  GitBranch,
  Star,
  Check,
  MoreVertical,
  RotateCcw,
  ArrowLeftRight,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface Version {
  id: number;
  versionNumber: number;
  captureMethod: string;
  closenessRating: number | null;
  closenessNotes: string | null;
  changeNote: string | null;
  notes: string | null;
  createdAt: string;
  ingredients: any[];
  instructions: any[];
  sourceVersionId: number | null;
}

interface VersionTimelineProps {
  recipeId: number;
  onCompare?: (baseId: number, compareId: number) => void;
  onVersionSelect?: (version: Version) => void;
}

const METHOD_ICONS: Record<string, { icon: string; label: string }> = {
  ai_capture: { icon: "🎙️", label: "AI Capture" },
  cook_along: { icon: "👨‍🍳", label: "Cook Along" },
  manual: { icon: "✏️", label: "Manual Edit" },
  refinement: { icon: "🔄", label: "Refinement" },
};

function ClosenessStars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={12}
          className={
            star <= rating
              ? "fill-amber-400 text-amber-400"
              : "text-neutral-300"
          }
        />
      ))}
    </div>
  );
}

export function VersionTimeline({
  recipeId,
  onCompare,
  onVersionSelect,
}: VersionTimelineProps) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [activeVersionId, setActiveVersionId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [menuOpen, setMenuOpen] = useState<number | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [compareSelection, setCompareSelection] = useState<number[]>([]);

  const fetchVersions = useCallback(async () => {
    try {
      const res = await fetch(`/api/recipes/${recipeId}/versions`);
      if (res.ok) {
        const data = await res.json();
        setVersions(data.versions);
        setActiveVersionId(data.activeVersionId);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [recipeId]);

  useEffect(() => {
    fetchVersions();
  }, [fetchVersions]);

  const handleRollback = async (versionId: number) => {
    try {
      const res = await fetch(
        `/api/recipes/${recipeId}/versions/${versionId}/rollback`,
        { method: "POST" }
      );
      if (res.ok) {
        setActiveVersionId(versionId);
        setMenuOpen(null);
      }
    } catch {
      // silent
    }
  };

  const handleCompareToggle = (versionId: number) => {
    setCompareSelection((prev) => {
      if (prev.includes(versionId)) {
        return prev.filter((id) => id !== versionId);
      }
      if (prev.length >= 2) {
        return [prev[1], versionId];
      }
      return [...prev, versionId];
    });
  };

  useEffect(() => {
    if (compareSelection.length === 2 && onCompare) {
      onCompare(compareSelection[0], compareSelection[1]);
      setCompareSelection([]);
      setCompareMode(false);
    }
  }, [compareSelection, onCompare]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-neutral-200 bg-white p-4">
        <div className="flex items-center gap-2 text-sm text-neutral-400">
          <Clock size={16} />
          Loading versions…
        </div>
      </div>
    );
  }

  if (versions.length === 0) {
    return null; // Don't show timeline if no versions
  }

  const displayVersions = expanded ? versions : versions.slice(0, 3);

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <GitBranch size={16} className="text-amber-600" />
          <h3 className="text-sm font-semibold text-neutral-800">
            Version History
          </h3>
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
            {versions.length}
          </span>
        </div>
        {versions.length >= 2 && (
          <button
            onClick={() => {
              setCompareMode(!compareMode);
              setCompareSelection([]);
            }}
            className={`flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium transition-colors ${
              compareMode
                ? "bg-amber-100 text-amber-700"
                : "text-neutral-500 hover:bg-neutral-100"
            }`}
          >
            <ArrowLeftRight size={12} />
            Compare
          </button>
        )}
      </div>

      {compareMode && (
        <div className="border-b border-amber-100 bg-amber-50/50 px-4 py-2 text-xs text-amber-700">
          Select two versions to compare ({compareSelection.length}/2)
        </div>
      )}

      {/* Timeline */}
      <div className="divide-y divide-neutral-100">
        <AnimatePresence>
          {displayVersions.map((version, index) => {
            const method = METHOD_ICONS[version.captureMethod] ?? METHOD_ICONS.manual;
            const isActive = version.id === activeVersionId;

            return (
              <motion.div
                key={version.id}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ delay: index * 0.05 }}
                className={`relative px-4 py-3 transition-colors ${
                  isActive ? "bg-amber-50/50" : "hover:bg-neutral-50"
                } ${compareMode ? "cursor-pointer" : ""} ${
                  compareSelection.includes(version.id)
                    ? "ring-2 ring-inset ring-amber-400"
                    : ""
                }`}
                onClick={() => {
                  if (compareMode) {
                    handleCompareToggle(version.id);
                  } else if (onVersionSelect) {
                    onVersionSelect(version);
                  }
                }}
              >
                <div className="flex items-start gap-3">
                  {/* Version dot */}
                  <div className="mt-1 flex flex-col items-center">
                    <div
                      className={`flex h-7 w-7 items-center justify-center rounded-full text-sm ${
                        isActive
                          ? "bg-amber-500 text-white"
                          : "bg-neutral-100 text-neutral-500"
                      }`}
                    >
                      {isActive ? <Check size={14} /> : version.versionNumber}
                    </div>
                    {index < displayVersions.length - 1 && (
                      <div className="mt-1 h-4 w-px bg-neutral-200" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm" title={method.label}>
                        {method.icon}
                      </span>
                      <span className="text-sm font-medium text-neutral-800">
                        v{version.versionNumber}
                      </span>
                      {isActive && (
                        <span className="rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                          ACTIVE
                        </span>
                      )}
                      {version.closenessRating && (
                        <ClosenessStars rating={version.closenessRating} />
                      )}
                    </div>

                    {version.changeNote && (
                      <p className="mt-0.5 text-xs text-neutral-500 line-clamp-1">
                        {version.changeNote}
                      </p>
                    )}

                    <p className="mt-0.5 text-[11px] text-neutral-400">
                      {new Date(version.createdAt).toLocaleDateString("en-SG", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                      {version.sourceVersionId && (
                        <span className="ml-1">
                          · forked from v
                          {versions.find(
                            (v) => v.id === version.sourceVersionId
                          )?.versionNumber ?? "?"}
                        </span>
                      )}
                    </p>
                  </div>

                  {/* Actions menu */}
                  {!compareMode && (
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuOpen(menuOpen === version.id ? null : version.id);
                        }}
                        className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
                      >
                        <MoreVertical size={14} />
                      </button>

                      {menuOpen === version.id && (
                        <div className="absolute right-0 top-8 z-10 w-40 rounded-xl border border-neutral-200 bg-white py-1 shadow-lg">
                          {!isActive && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRollback(version.id);
                              }}
                              className="flex w-full items-center gap-2 px-3 py-2 text-xs text-neutral-700 hover:bg-neutral-50"
                            >
                              <RotateCcw size={12} />
                              Set as Active
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onVersionSelect?.(version);
                              setMenuOpen(null);
                            }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-xs text-neutral-700 hover:bg-neutral-50"
                          >
                            <Clock size={12} />
                            View Details
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Show more/less */}
      {versions.length > 3 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex w-full items-center justify-center gap-1 border-t border-neutral-100 py-2 text-xs font-medium text-neutral-500 hover:bg-neutral-50"
        >
          {expanded ? (
            <>
              <ChevronUp size={12} /> Show less
            </>
          ) : (
            <>
              <ChevronDown size={12} /> Show all {versions.length} versions
            </>
          )}
        </button>
      )}
    </div>
  );
}
