"use client";

import { useState } from "react";
import { Apple, CalendarDays, Download, Globe2, Info, Mail, X } from "lucide-react";
import {
  CalendarEvent,
  generateICS,
  buildGoogleCalendarUrl,
  buildOutlookUrl,
  detectPlatform,
  downloadICS,
  shareICS,
} from "@/lib/calendar";

interface CalendarExportProps {
  events: CalendarEvent[];
  onClose: () => void;
  title?: string;
}

export function CalendarExport({ events, onClose, title }: CalendarExportProps) {
  const [platform] = useState<"ios" | "android" | "desktop">(() => typeof window === "undefined" ? "desktop" : detectPlatform());
  const [exporting, setExporting] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);


  if (events.length === 0) {
    return null;
  }

  const mainTitle = title || (events.length === 1 ? events[0].title : `${events.length} meals`);

  const handleGoogleCalendar = () => {
    setExporting("google");
    events.forEach((event, i) => {
      setTimeout(() => {
        window.open(buildGoogleCalendarUrl(event), "_blank", "noopener,noreferrer");
      }, i * 300);
    });
    setTimeout(() => {
      setExporting(null);
      setShowHint(true);
    }, 500);
  };

  const handleOutlook = () => {
    setExporting("outlook");
    events.forEach((event, i) => {
      setTimeout(() => {
        window.open(buildOutlookUrl(event), "_blank", "noopener,noreferrer");
      }, i * 300);
    });
    setTimeout(() => {
      setExporting(null);
      setShowHint(true);
    }, 500);
  };

  const handleAppleCalendar = async () => {
    setExporting("apple");
    const blob = generateICS(events);
    const shared = await shareICS(blob, "mychelin-meals.ics", mainTitle);
    if (!shared) {
      downloadICS(blob, "mychelin-meals.ics");
    }
    setExporting(null);
    onClose();
  };

  const handleDownloadICS = () => {
    setExporting("ics");
    const blob = generateICS(events);
    downloadICS(blob, "mychelin-meals.ics");
    setExporting(null);
    onClose();
  };

  const isPrimary = (type: string) => {
    if (platform === "ios" && type === "apple") return true;
    if (platform === "android" && type === "google") return true;
    if (platform === "desktop" && type === "google") return true;
    return false;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/45 p-4" onClick={onClose}>
      <div
        className="w-full max-w-sm overflow-hidden rounded-lg border border-[var(--ui-border-strong)] bg-[var(--ui-surface-raised)] shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="calendar-export-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-[var(--ui-accent)]" aria-hidden="true" />
            <h3 id="calendar-export-title" className="font-semibold text-[var(--ui-text)]">Send to calendar</h3>
          </div>
          <button onClick={onClose} className="flex h-11 w-11 items-center justify-center rounded-lg text-[var(--ui-muted)] transition-colors hover:bg-[var(--ui-surface-subtle)] hover:text-[var(--ui-text)]" aria-label="Close calendar export">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="p-4 space-y-2">
          {showHint && (
            <div className="mb-3 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800" role="status">
              Calendar opened! Tap <strong>Save</strong> in each tab to confirm.
            </div>
          )}

          {platform === "ios" && (
            <p className="mb-2 flex items-start gap-2 px-1 text-xs text-[var(--ui-muted)]">
              <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> This will open your Calendar app. Tap <strong>Add</strong> to save your reminders.
            </p>
          )}

          <button
            onClick={handleGoogleCalendar}
            disabled={exporting !== null}
            className={`flex min-h-16 w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors ${
              isPrimary("google")
                ? "border-[var(--ui-accent)]/30 bg-[var(--ui-accent-muted)] text-[var(--ui-accent)]"
                : "border-[var(--ui-border)] bg-[var(--ui-surface-raised)] text-[var(--ui-text)] hover:bg-[var(--ui-surface-subtle)]"
            }`}
          >
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${isPrimary("google") ? "bg-[var(--ui-action)] text-[var(--ui-action-text)]" : "bg-[var(--ui-surface-subtle)] text-[var(--ui-muted)]"}`}>
              <Globe2 className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm">Google Calendar</div>
              <div className="text-xs text-neutral-500 truncate">Opens pre-filled event</div>
            </div>
            {exporting === "google" && <span className="text-xs text-neutral-400">Opening...</span>}
          </button>

          <button
            onClick={handleOutlook}
            disabled={exporting !== null}
            className={`flex min-h-16 w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors ${
              isPrimary("outlook")
                ? "border-[var(--ui-accent)]/30 bg-[var(--ui-accent-muted)] text-[var(--ui-accent)]"
                : "border-[var(--ui-border)] bg-[var(--ui-surface-raised)] text-[var(--ui-text)] hover:bg-[var(--ui-surface-subtle)]"
            }`}
          >
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${isPrimary("outlook") ? "bg-[var(--ui-action)] text-[var(--ui-action-text)]" : "bg-[var(--ui-surface-subtle)] text-[var(--ui-muted)]"}`}>
              <Mail className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm">Outlook</div>
              <div className="text-xs text-neutral-500 truncate">Opens pre-filled event</div>
            </div>
            {exporting === "outlook" && <span className="text-xs text-neutral-400">Opening...</span>}
          </button>

          <button
            onClick={handleAppleCalendar}
            disabled={exporting !== null}
            className={`flex min-h-16 w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors ${
              isPrimary("apple")
                ? "border-[var(--ui-accent)]/30 bg-[var(--ui-accent-muted)] text-[var(--ui-accent)]"
                : "border-[var(--ui-border)] bg-[var(--ui-surface-raised)] text-[var(--ui-text)] hover:bg-[var(--ui-surface-subtle)]"
            }`}
          >
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${isPrimary("apple") ? "bg-[var(--ui-action)] text-[var(--ui-action-text)]" : "bg-[var(--ui-surface-subtle)] text-[var(--ui-muted)]"}`}>
              <Apple className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm">Apple Calendar</div>
              <div className="text-xs text-neutral-500 truncate">Share or download .ics file</div>
            </div>
            {exporting === "apple" && <span className="text-xs text-neutral-400">Sharing...</span>}
          </button>

          <button
            onClick={handleDownloadICS}
            disabled={exporting !== null}
            className="flex min-h-16 w-full items-center gap-3 rounded-lg border border-[var(--ui-border)] bg-[var(--ui-surface-raised)] px-3 py-2 text-left text-[var(--ui-text)] transition-colors hover:bg-[var(--ui-surface-subtle)]"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--ui-surface-subtle)] text-[var(--ui-muted)]">
              <Download className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm">Download .ics</div>
              <div className="text-xs text-neutral-500 truncate">For any other calendar app</div>
            </div>
            {exporting === "ics" && <span className="text-xs text-neutral-400">Downloading...</span>}
          </button>
        </div>

        <div className="flex items-start gap-2 border-t border-[var(--ui-border)] bg-[var(--ui-surface-subtle)] px-5 py-3 text-xs leading-5 text-[var(--ui-muted)]">
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> Reminders are managed in your calendar app, where you can edit or delete them anytime.
        </div>
      </div>
    </div>
  );
}
