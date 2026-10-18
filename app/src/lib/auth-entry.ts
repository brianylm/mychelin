const DEFAULT_AUTHENTICATED_ENTRY = "/app";

export function getAuthenticatedEntryPath(returnTo?: string): string {
  if (returnTo?.startsWith("/shared/")) {
    return returnTo;
  }

  return DEFAULT_AUTHENTICATED_ENTRY;
}
