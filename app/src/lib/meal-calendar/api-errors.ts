const SAFE_MESSAGES = new Set([
  "Calendar sync is not configured",
  "Calendar sharing is available for households",
  "Connect the household calendar first",
  "Invalid household member",
  "Only a household admin can connect the shared Mychelin calendar",
  "Only a household admin can disconnect the shared calendar",
  "Only an admin can revoke another member",
]);

export function publicCalendarError(
  error: unknown,
  fallback = "Google Calendar could not be updated. Try again."
): string {
  if (error instanceof Error && SAFE_MESSAGES.has(error.message)) return error.message;
  return fallback;
}
