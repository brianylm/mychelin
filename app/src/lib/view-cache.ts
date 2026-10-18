import { useEffect } from "react";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";

// Tab views (Inventory, Plan, Shopping, Activity) unmount when you switch
// away, so they used to start every visit with a spinner and a fresh
// fetch. They now keep their last GET response in the React Query cache:
// a view seeds its state from the cache (no spinner), still refetches on
// mount, and writes its own edits back so a return visit never flashes
// pre-edit data. RecipeWorkspace prefetches the same URLs on app load.
//
// Keys carry the user id so a different sign-in in the same tab never
// sees the previous user's cached data.

export function viewCacheKey(userId: number, url: string) {
  return ["view", userId, url] as const;
}

export function readViewCache<T>(qc: QueryClient, userId: number | undefined, url: string): T | undefined {
  if (!userId) return undefined;
  return qc.getQueryData<T>(viewCacheKey(userId, url));
}

export function writeViewCache<T>(qc: QueryClient, userId: number | undefined, url: string, data: T): void {
  if (!userId) return;
  qc.setQueryData(viewCacheKey(userId, url), data);
}

// Mirrors a view's current state into the cache once it has loaded, so
// local edits (add/remove/tick) survive the view unmounting.
export function useViewCacheMirror<T>(userId: number | undefined, url: string, data: T, ready: boolean): void {
  const qc = useQueryClient();
  useEffect(() => {
    if (ready) writeViewCache(qc, userId, url, data);
  }, [qc, userId, url, data, ready]);
}

function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return year + "-" + month + "-" + day;
}

// Same Monday-start week the planner (offset 0) and shopping list default to.
export function currentWeekRange(now = new Date()): { start: string; end: string } {
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  monday.setDate(monday.getDate() - monday.getDay() + 1);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { start: toDateKey(monday), end: toDateKey(sunday) };
}

export const viewUrls = {
  inventory: "/api/inventory",
  households: "/api/households",
  activity: "/api/activity",
  plannerRecipes: "/api/recipes?planner=1",
  mealPlans: (start: string, end: string) => `/api/meal-plans?startDate=${start}&endDate=${end}`,
  shoppingList: (start: string, end: string) => `/api/shopping-list?startDate=${start}&endDate=${end}`,
};

// Shared GET for the warm-up and for components that read a tab URL with
// useQuery (e.g. Profile's household status).
export async function fetchViewJson(url: string): Promise<unknown> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} ${res.status}`);
  return res.json();
}

// Warms the cache for every main tab. Failures are ignored: the view
// fetches for itself on mount anyway.
export function prefetchViewData(qc: QueryClient, userId: number, includeHousehold: boolean): void {
  const week = currentWeekRange();
  const urls = [
    viewUrls.inventory,
    viewUrls.activity,
    viewUrls.plannerRecipes,
    viewUrls.mealPlans(week.start, week.end),
    viewUrls.shoppingList(week.start, week.end),
    ...(includeHousehold ? [viewUrls.households] : []),
  ];
  for (const url of urls) {
    void qc.prefetchQuery({
      queryKey: viewCacheKey(userId, url),
      queryFn: () => fetchViewJson(url),
    });
  }
}
