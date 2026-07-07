"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@radix-ui/themes";
import { ArrowRight, CheckCircle2, ChevronDown, Circle, MessageSquare, RefreshCw } from "lucide-react";
import { PilotFeedbackPrompt } from "./PilotFeedbackPrompt";

interface PilotChecklistItem {
  id: string;
  label: string;
  completed: boolean;
  completedAt: string | null;
}

interface PilotStatus {
  checklist: PilotChecklistItem[];
  completedCount: number;
  totalCount: number;
  feedbackCount: number;
  latestFeedbackAt: string | null;
}

const ITEM_DETAILS: Record<string, string> = {
  onboarding: "Choose goals so Mychelin can tune rhythm, reminders, and first-run guidance.",
  capture: "Create one usable recipe from a prompt, paste, URL, conversation, or manual entry.",
  plan: "Put that recipe on the meal plan so cooking becomes a concrete commitment.",
  shopping: "Generate a shopping list from planned meals or a recipe.",
  cook: "Finish cook-with-me and save the result as an attempt, not a new version.",
  version: "Promote useful attempt notes into a version, then set it definitive only if it is the best one.",
};

function formatDate(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-SG", { day: "numeric", month: "short" });
}

export function PilotChecklistPanel() {
  const [status, setStatus] = useState<PilotStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const loadStatus = useCallback(async (mode: "initial" | "refresh" = "initial") => {
    if (mode === "initial") setLoading(true);
    if (mode === "refresh") setRefreshing(true);
    try {
      const response = await fetch("/api/pilot/status");
      setStatus(response.ok ? await response.json() : null);
    } catch {
      setStatus(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      try {
        const response = await fetch("/api/pilot/status");
        const data = response.ok ? await response.json() : null;
        if (!cancelled) setStatus(data);
      } catch {
        if (!cancelled) setStatus(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  const checklist = status?.checklist ?? [];
  const nextItem = checklist.find((item) => !item.completed) ?? null;
  const progress = status && status.totalCount > 0
    ? Math.round((status.completedCount / status.totalCount) * 100)
    : 0;
  const feedbackLabel = status?.feedbackCount
    ? String(status.feedbackCount) + " feedback note" + (status.feedbackCount === 1 ? "" : "s") + " sent."
    : "No pilot feedback sent yet.";

  const closeFeedback = () => {
    setShowFeedback(false);
    void loadStatus("refresh");
  };

  return (
    <div className="rounded-2xl border border-[#e7ded1] bg-[#fffaf3] shadow-sm">
      <div className="flex items-start justify-between gap-3 p-5">
        <button
          type="button"
          onClick={() => setIsOpen((open) => !open)}
          className="group flex min-w-0 flex-1 items-start gap-3 text-left"
          aria-expanded={isOpen}
        >
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#800020]">Pilot loop</p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight text-neutral-950">First Mychelin run-through</h2>
            <p className="mt-1 text-sm leading-6 text-neutral-600">
              Follow the core path once: capture, plan, shop, cook, record an attempt, then promote the useful changes.
            </p>
          </div>
          <ChevronDown className={"mt-1 h-5 w-5 shrink-0 text-neutral-400 transition group-hover:text-[#800020] " + (isOpen ? "rotate-180" : "")} />
        </button>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => void loadStatus("refresh")}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-[#eadfce] bg-white text-neutral-500 transition hover:border-[#800020]/30 hover:text-[#800020] disabled:opacity-50"
            disabled={loading || refreshing}
            aria-label="Refresh pilot checklist"
          >
            <RefreshCw className={"h-3.5 w-3.5 " + (refreshing ? "animate-spin" : "")} />
          </button>
          <div className="rounded-full border border-[#eadfce] bg-white px-3 py-1 text-xs font-semibold text-neutral-700">
            {loading ? "..." : String(status?.completedCount ?? 0) + "/" + String(status?.totalCount ?? checklist.length)}
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="border-t border-[#eadfce] px-5 pb-5 pt-4">
          <div className="h-2 rounded-full bg-[#eadfce]" aria-hidden="true">
            <div className="h-full rounded-full bg-[#800020] transition-all" style={{ width: progress + "%" }} />
          </div>

          {!loading && nextItem && (
            <div className="mt-4 flex items-start gap-3 rounded-xl border border-[#800020]/15 bg-white px-3 py-3">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#800020]/10 text-[#800020]">
                <ArrowRight className="h-3.5 w-3.5" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#800020]">Next pilot step</p>
                <p className="mt-1 text-sm font-semibold text-neutral-900">{nextItem.label}</p>
                <p className="mt-1 text-xs leading-5 text-neutral-500">{ITEM_DETAILS[nextItem.id]}</p>
              </div>
            </div>
          )}

          <div className="mt-4 space-y-2">
            {loading ? (
              <p className="rounded-xl border border-[#eadfce] bg-white px-3 py-3 text-sm text-neutral-500">Loading pilot checklist...</p>
            ) : checklist.length === 0 ? (
              <p className="rounded-xl border border-[#eadfce] bg-white px-3 py-3 text-sm text-neutral-500">No pilot activity yet.</p>
            ) : (
              checklist.map((item) => {
                const completedDate = formatDate(item.completedAt);
                return (
                  <div
                    key={item.id}
                    className={
                      "flex items-start gap-3 rounded-xl border bg-white px-3 py-3 " +
                      (item.completed ? "border-[#eadfce]" : "border-[#eadfce] opacity-85")
                    }
                  >
                    {item.completed ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#800020]" />
                    ) : (
                      <Circle className="mt-0.5 h-4 w-4 shrink-0 text-neutral-300" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className={"text-sm " + (item.completed ? "font-semibold text-neutral-900" : "font-medium text-neutral-600")}>{item.label}</span>
                        {completedDate && <span className="text-[11px] font-medium text-neutral-400">Done {completedDate}</span>}
                      </div>
                      <p className="mt-1 text-xs leading-5 text-neutral-500">{ITEM_DETAILS[item.id]}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="mt-4 flex flex-col gap-3 rounded-xl border border-[#eadfce] bg-white px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-2">
              <MessageSquare className="mt-0.5 h-4 w-4 text-[#800020]" />
              <p className="text-xs leading-5 text-neutral-500">{feedbackLabel}</p>
            </div>
            <Button type="button" size="2" variant="outline" onClick={() => setShowFeedback(true)}>
              Send feedback
            </Button>
          </div>
        </div>
      )}

      {showFeedback && (
        <PilotFeedbackPrompt
          stage="pilot_general"
          source="profile_pilot_checklist"
          onClose={closeFeedback}
        />
      )}
    </div>
  );
}
