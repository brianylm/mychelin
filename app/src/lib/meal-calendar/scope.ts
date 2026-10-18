import { getUserHousehold } from "@/lib/households";
import type { CalendarScope } from "./types";

export interface ResolvedCalendarScope {
  scope: CalendarScope;
  canManage: boolean;
  householdId: number | null;
  displayName: string;
}

export async function resolveCalendarScope(userId: number): Promise<ResolvedCalendarScope> {
  const membership = await getUserHousehold(userId);
  if (!membership) {
    return {
      scope: { type: "solo", id: userId },
      canManage: true,
      householdId: null,
      displayName: "Mychelin",
    };
  }
  return {
    scope: { type: "household", id: membership.household.id },
    canManage: membership.role === "admin",
    householdId: membership.household.id,
    displayName: `Mychelin — ${membership.household.name}`,
  };
}
