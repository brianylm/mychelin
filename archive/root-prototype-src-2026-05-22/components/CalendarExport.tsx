"use client";

import { useState, useEffect } from "react";
import { Calendar, X, Smartphone, Monitor, ExternalLink, Download, Share2 } from "lucide-react";
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
  const [platform, setPlatform] = useState<"ios" | "android" | "desktop">("desktop");
  const [exporting, setExporting] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    setPlatform(detectPlatform());
  }, []);

  if (events.length === 0) {
    return null;
  }

  const mainTitle = title || (events.length === 1 ? events[0].title : `${events.length} meals`);

  const handleGoogleCalendar = () => {
    setExporting("google");
    // For multiple events, open them in separate tabs (Google doesn't support bulk)
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
        <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-terracotta" />
            <h3 className="font-semibold text-stone-800">Send to Calendar</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-stone-100 text-stone-400 hover:text-stone-600">
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
            <p className="text-xs text-stone-500 mb-2 px-1">
              <Smartphone className="w-3 h-3 inline mr-1" />
              This will open your Calendar app. Tap <strong>Add</strong> to save your reminders.
            </p>
          )}

          <button
            onClick={handleGoogleCalendar}
            disabled={exporting !== null}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors ${
              isPrimary("google")
                ? "bg-terracotta/10 text-terracotta border-2 border-terracotta/30"
                : "bg-stone-50 hover:bg-stone-100 text-stone-700 border-2 border-transparent"
            }`}
          >
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${isPrimary("google") ? "bg-terracotta text-white" : "bg-white text-stone-600"}`}>
              <ExternalLink className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm">Google Calendar</div>
              <div className="text-xs text-stone-500 truncate">Opens pre-filled event</div>
            </div>
            {exporting === "google" && <span className="text-xs text-stone-400">Opening...</span>}
          </button>

          <button
            onClick={handleOutlook}
            disabled={exporting !== null}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors ${
              isPrimary("outlook")
                ? "bg-terracotta/10 text-terracotta border-2 border-terracotta/30"
                : "bg-stone-50 hover:bg-stone-100 text-stone-700 border-2 border-transparent"
            }`}
          >
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${isPrimary("outlook") ? "bg-terracotta text-white" : "bg-white text-stone-600"}`}>
              <ExternalLink className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm">Outlook</div>
              <div className="text-xs text-stone-500 truncate">Opens pre-filled event</div>
            </div>
            {exporting === "outlook" && <span className="text-xs text-stone-400">Opening...</span>}
          </button>

          <button
            onClick={handleAppleCalendar}
            disabled={exporting !== null}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors ${
              isPrimary("apple")
                ? "bg-terracotta/10 text-terracotta border-2 border-terracotta/30"
                : "bg-stone-50 hover:bg-stone-100 text-stone-700 border-2 border-transparent"
            }`}
          >
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${isPrimary("apple") ? "bg-terracotta text-white" : "bg-white text-stone-600"}`}>
              <Share2 className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm">Apple Calendar</div>
              <div className="text-xs text-stone-500 truncate">Share or download .ics file</div>
            </div>
            {exporting === "apple" && <span className="text-xs text-stone-400">Sharing...</span>}
          </button>

          <button
            onClick={handleDownloadICS}
            disabled={exporting !== null}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left bg-stone-50 hover:bg-stone-100 text-stone-700 border-2 border-transparent transition-colors"
          >
            <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center flex-shrink-0 text-stone-600">
              <Download className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm">Download .ics</div>
              <div className="text-xs text-stone-500 truncate">For any other calendar app</div>
            </div>
            {exporting === "ics" && <span className="text-xs text-stone-400">Downloading...</span>}
          </button>
        </div>

        <div className="px-5 py-3 bg-stone-50 border-t border-stone-100 text-xs text-stone-500 flex items-center gap-1.5">
          <Monitor className="w-3.5 h-3.5" />
          Reminders are set in your calendar app — you can edit or delete them there anytime.
        </div>
      </div>
    </div>
  );
}
