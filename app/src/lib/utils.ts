import { type ClassValue, clsx } from "clsx";

export function cn(...inputs: ClassValue[]) {
  // Lightweight cn — clsx without tailwind-merge for now
  return clsx(inputs);
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-SG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
