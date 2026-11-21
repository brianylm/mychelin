import type { AppView } from "@/components/layout/BottomNav";

// Tabs that may be addressed by ?view=. "recipes" is the default and is
// never written to the URL.
export const URL_VIEWS: readonly AppView[] = [
  "activity",
  "fridge",
  "shopping",
  "plan",
  "household",
  "discover",
  "profile",
];

/** Reads ?view= from a query string. Unknown values give "recipes". A
 * selected recipe wins over the view param. */
export function parseView(search: string): AppView {
  const params = new URLSearchParams(search);
  if (params.get("recipe")) return "recipes";
  const value = params.get("view");
  return URL_VIEWS.find((view) => view === value) ?? "recipes";
}

/** Returns "pathname?search#hash" with ?view= set for the view. Other
 * params and the hash are kept. "recipes" removes the param. */
export function serializeView(
  view: AppView,
  location: { pathname: string; search: string; hash: string },
): string {
  const params = new URLSearchParams(location.search);
  if (view === "recipes") params.delete("view");
  else params.set("view", view);
  const query = params.toString();
  return `${location.pathname}${query ? `?${query}` : ""}${location.hash}`;
}
