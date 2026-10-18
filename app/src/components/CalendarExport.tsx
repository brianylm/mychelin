"use client";

import { useState } from "react";
import { X } from "lucide-react";
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
  // Only mounted after a user opens the export sheet, so navigator exists.
  const [platform] = useState<"ios" | "android" | "desktop">(() =>
    typeof navigator === "undefined" ? "desktop" : detectPlatform()
  );
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">📅</span>
            <h3 className="font-semibold text-neutral-800">Send to Calendar</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-neutral-100 text-ui-muted hover:text-neutral-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-2">
          {showHint && (
            <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-800">
              Calendar opened! Tap <strong>Save</strong> in each tab to confirm.
            </div>
          )}

          {platform === "ios" && (
            <p className="text-xs text-neutral-500 mb-2 px-1">
              📱 This will open your Calendar app. Tap <strong>Add</strong> to save your reminders.
            </p>
          )}

          <button
            onClick={handleGoogleCalendar}
            disabled={exporting !== null}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors ${
              isPrimary("google")
                ? "bg-ui-accent/5 text-ui-accent border-2 border-ui-accent/15"
                : "bg-neutral-50 hover:bg-neutral-100 text-neutral-700 border-2 border-transparent"
            }`}
          >
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${isPrimary("google") ? "bg-ui-action text-white" : "bg-white text-neutral-600"}`}>
              <span className="text-lg">🌐</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm">Google Calendar</div>
              <div className="text-xs text-neutral-500 truncate">Opens pre-filled event</div>
            </div>
            {exporting === "google" && <span className="text-xs text-ui-muted">Opening...</span>}
          </button>

          <button
            onClick={handleOutlook}
            disabled={exporting !== null}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors ${
              isPrimary("outlook")
                ? "bg-ui-accent/5 text-ui-accent border-2 border-ui-accent/15"
                : "bg-neutral-50 hover:bg-neutral-100 text-neutral-700 border-2 border-transparent"
            }`}
          >
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${isPrimary("outlook") ? "bg-ui-action text-white" : "bg-white text-neutral-600"}`}>
              <span className="text-lg">📧</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm">Outlook</div>
              <div className="text-xs text-neutral-500 truncate">Opens pre-filled event</div>
            </div>
            {exporting === "outlook" && <span className="text-xs text-ui-muted">Opening...</span>}
          </button>

          <button
            onClick={handleAppleCalendar}
            disabled={exporting !== null}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors ${
              isPrimary("apple")
                ? "bg-ui-accent/5 text-ui-accent border-2 border-ui-accent/15"
                : "bg-neutral-50 hover:bg-neutral-100 text-neutral-700 border-2 border-transparent"
            }`}
          >
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${isPrimary("apple") ? "bg-ui-action text-white" : "bg-white text-neutral-600"}`}>
              <span className="text-lg">📲</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm">Apple Calendar</div>
              <div className="text-xs text-neutral-500 truncate">Share or download .ics file</div>
            </div>
            {exporting === "apple" && <span className="text-xs text-ui-muted">Sharing...</span>}
          </button>

          <button
            onClick={handleDownloadICS}
            disabled={exporting !== null}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left bg-neutral-50 hover:bg-neutral-100 text-neutral-700 border-2 border-transparent transition-colors"
          >
            <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center flex-shrink-0 text-neutral-600">
              <span className="text-lg">💾</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm">Download .ics</div>
              <div className="text-xs text-neutral-500 truncate">For any other calendar app</div>
            </div>
            {exporting === "ics" && <span className="text-xs text-ui-muted">Downloading...</span>}
          </button>
        </div>

        <div className="px-5 py-3 bg-neutral-50 border-t border-neutral-100 text-xs text-neutral-500">
          💡 Reminders are set in your calendar app — you can edit or delete them there anytime.
        </div>
      </div>
    </div>
  );
}
