export interface CalendarEvent {
  id: string;
  title: string;
  startDate: Date;
  endDate: Date;
  description?: string;
  location?: string;
}

const MYCHELIN_APP_URL = "https://mychelin-sg.vercel.app/app";

const MEAL_TIMES: Record<string, { hour: number; minute: number }> = {
  breakfast: { hour: 8, minute: 0 },
  lunch: { hour: 12, minute: 30 },
  dinner: { hour: 18, minute: 30 },
  snack: { hour: 15, minute: 0 },
};

export function getMealDateTime(dateStr: string, meal: string): Date {
  const time = MEAL_TIMES[meal] || { hour: 12, minute: 0 };
  const d = new Date(dateStr + "T00:00:00");
  d.setHours(time.hour, time.minute, 0, 0);
  return d;
}

function formatICSDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

function withMychelinBacklink(description?: string): string {
  return [description?.trim(), "Open in Mychelin: " + MYCHELIN_APP_URL]
    .filter(Boolean)
    .join("\n\n");
}

function escapeICS(str: string): string {
  return str
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

export function generateICS(events: CalendarEvent[]): Blob {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "METHOD:PUBLISH",
    "PRODID:-//Mychelin//Family Recipe Keeper//EN",
    "CALSCALE:GREGORIAN",
  ];

  for (const event of events) {
    const uid = event.id.includes("@") ? event.id : `mychelin-${event.id}@mychelin.app`;
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${uid}`);
    lines.push(`DTSTAMP:${formatICSDate(new Date())}`);
    lines.push(`DTSTART:${formatICSDate(event.startDate)}`);
    lines.push(`DTEND:${formatICSDate(event.endDate)}`);
    lines.push(`SUMMARY:${escapeICS(event.title)}`);
    lines.push(`DESCRIPTION:${escapeICS(withMychelinBacklink(event.description))}`);
    if (event.location) {
      lines.push(`LOCATION:${escapeICS(event.location)}`);
    }

    // 24-hour defrost reminder
    lines.push("BEGIN:VALARM");
    lines.push("ACTION:DISPLAY");
    lines.push(`DESCRIPTION:${escapeICS("Defrost reminder: " + event.title)}`);
    lines.push("TRIGGER:-PT24H");
    lines.push("END:VALARM");

    // 6-hour prep reminder
    lines.push("BEGIN:VALARM");
    lines.push("ACTION:DISPLAY");
    lines.push(`DESCRIPTION:${escapeICS("Start prepping: " + event.title)}`);
    lines.push("TRIGGER:-PT6H");
    lines.push("END:VALARM");

    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");

  return new Blob([lines.join("\r\n")], { type: "text/calendar;charset=utf-8" });
}

export function buildGoogleCalendarUrl(event: CalendarEvent): string {
  const formatDate = (d: Date) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${formatDate(event.startDate)}/${formatDate(event.endDate)}`,
  });
  params.set("details", withMychelinBacklink(event.description));
  if (event.location) {
    params.set("location", event.location);
  }
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function buildOutlookUrl(event: CalendarEvent): string {
  const formatDate = (d: Date) => {
    const iso = d.toISOString();
    return iso.slice(0, 19);
  };
  const params = new URLSearchParams({
    subject: event.title,
    startdt: formatDate(event.startDate),
    enddt: formatDate(event.endDate),
  });
  params.set("body", withMychelinBacklink(event.description));
  if (event.location) {
    params.set("location", event.location);
  }
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}

export function detectPlatform(): "ios" | "android" | "desktop" {
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return "ios";
  if (/Android/.test(ua)) return "android";
  return "desktop";
}

export function downloadICS(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function shareICS(blob: Blob, filename: string, title?: string): Promise<boolean> {
  const file = new File([blob], filename, { type: "text/calendar" });

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        title: title || "Mychelin Meal Plan",
        text: "Meal reminder from Mychelin",
        files: [file],
      });
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

export function getDefaultMealEndTime(startDate: Date): Date {
  const end = new Date(startDate);
  end.setHours(end.getHours() + 1);
  return end;
}
