// Where login/signup may send the user afterwards. Only same-site paths
// under these prefixes are allowed, so a crafted ?returnTo= cannot redirect
// to another site (no protocol-relative "//", no backslashes).
const ALLOWED_PREFIXES = ["/shared/", "/join/"];

export function safeReturnTo(value: string | null | undefined): string | null {
  if (!value || value.startsWith("//") || value.includes("\\")) return null;
  return ALLOWED_PREFIXES.some((prefix) => value.startsWith(prefix)) ? value : null;
}
