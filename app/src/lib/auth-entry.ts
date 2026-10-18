import { safeReturnTo } from "@/lib/return-to";

const DEFAULT_AUTHENTICATED_ENTRY = "/app";

export function getAuthenticatedEntryPath(returnTo?: string): string {
  return safeReturnTo(returnTo) ?? DEFAULT_AUTHENTICATED_ENTRY;
}
