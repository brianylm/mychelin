"use client";

import { useEffect, useState } from "react";
import { Button } from "@radix-ui/themes";
import { CheckCircle2, Circle, MessageSquare } from "lucide-react";
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

export function PilotChecklistPanel() {
  const [status, setStatus] = useState<PilotStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [showFeedback, setShowFeedback] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/pilot/status")
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        if (!cancelled) setStatus(data);
      })
      .catch(() => {
        if (!cancelled) setStatus(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const checklist = status?.checklist ?? [];
  const progress = status && status.totalCount > 0
    ? Math.round((status.completedCount / status.totalCount) * 100)
    : 0;
  const feedbackLabel = status?.feedbackCount
    ? String(status.feedbackCount) + " feedback note" + (status.feedbackCount === 1 ? "" : "s") + " sent."
    : "No pilot feedback sent yet.";

  return (
    <div className="rounded-2xl border border-[#e7ded1] bg-[#fffaf3] p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#800020]">Pilot loop</p>
          <h2 className="mt-2 text-base font-semibold text-neutral-900">First Mychelin run-through</h2>
          <p className="mt-1 text-xs leading-5 text-neutral-600">
            This checklist tracks the core MVP loop without storing recipe text or private family details.
          </p>
        </div>
        <div className="rounded-full border border-[#eadfce] bg-white px-3 py-1 text-xs font-semibold text-neutral-700">
          {loading ? "..." : String(status?.completedCount ?? 0) + "/" + String(status?.totalCount ?? checklist.length)}
        </div>
      </div>

      <div className="mt-4 h-2 rounded-full bg-[#eadfce]">
        <div className="h-full rounded-full bg-[#800020] transition-all" style={{ width: progress + "%" }} />
      </div>

      <div className="mt-4 space-y-2">
        {loading ? (
          <p className="rounded-xl border border-[#eadfce] bg-white px-3 py-3 text-sm text-neutral-500">Loading pilot checklist...</p>
        ) : checklist.length === 0 ? (
          <p className="rounded-xl border border-[#eadfce] bg-white px-3 py-3 text-sm text-neutral-500">No pilot activity yet.</p>
        ) : (
          checklist.map((item) => (
            <div key={item.id} className="flex items-center gap-3 rounded-xl border border-[#eadfce] bg-white px-3 py-2.5">
              {item.completed ? <CheckCircle2 className="h-4 w-4 text-[#800020]" /> : <Circle className="h-4 w-4 text-neutral-300" />}
              <span className={"text-sm " + (item.completed ? "font-medium text-neutral-800" : "text-neutral-500")}>{item.label}</span>
            </div>
          ))
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

      {showFeedback && (
        <PilotFeedbackPrompt
          stage="pilot_general"
          source="profile_pilot_checklist"
          onClose={() => setShowFeedback(false)}
        />
      )}
    </div>
  );
}
