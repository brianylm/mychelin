import type {
  AddFreshDishRequest,
  AddPreparedDishRequest,
  ApiErrorResponse,
  CreateMealGroupRequest,
  CreatePreparedBatchRequest,
  MealGroupResponse,
  MealGroupsResponse,
  MealReviewsResponse,
  PreparedBatchResponse,
  PreparedBatchesResponse,
  UpdateMealGroupRequest,
} from "./types";

export class MealPilotClientError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: ApiErrorResponse["code"]
  ) {
    super(message);
    this.name = "MealPilotClientError";
  }
}

async function requestJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });

  if (!response.ok) {
    let payload: ApiErrorResponse | null = null;
    try {
      payload = (await response.json()) as ApiErrorResponse;
    } catch {
      // Preserve a useful status-based fallback for non-JSON failures.
    }
    throw new MealPilotClientError(
      payload?.error || `Request failed (${response.status})`,
      response.status,
      payload?.code
    );
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export const mealPilotKeys = {
  groups: (startDate: string, endDate: string) =>
    ["meal-pilot", "groups", startDate, endDate] as const,
  preparedBatches: ["meal-pilot", "prepared-batches"] as const,
  reviews: (before: string) => ["meal-pilot", "reviews", before] as const,
};

export function listMealGroups(startDate: string, endDate: string) {
  const params = new URLSearchParams({ startDate, endDate });
  return requestJson<MealGroupsResponse>(`/api/meal-groups?${params}`);
}

export function getMealGroup(id: number) {
  return requestJson<MealGroupResponse>(`/api/meal-groups/${id}`);
}

export function createMealGroup(input: CreateMealGroupRequest) {
  return requestJson<MealGroupResponse>("/api/meal-groups", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateMealGroup(id: number, input: UpdateMealGroupRequest) {
  return requestJson<MealGroupResponse>(`/api/meal-groups/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deleteMealGroup(id: number, expectedRevision: number) {
  const params = new URLSearchParams({ expectedRevision: String(expectedRevision) });
  return requestJson<void>(`/api/meal-groups/${id}?${params}`, { method: "DELETE" });
}

export function addFreshDish(id: number, input: AddFreshDishRequest) {
  return requestJson<MealGroupResponse>(`/api/meal-groups/${id}/fresh-dishes`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function addPreparedDish(id: number, input: AddPreparedDishRequest) {
  return requestJson<MealGroupResponse>(`/api/meal-groups/${id}/prepared-dishes`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function listPreparedBatches() {
  return requestJson<PreparedBatchesResponse>("/api/prepared-batches");
}

export function createPreparedBatch(input: CreatePreparedBatchRequest) {
  return requestJson<PreparedBatchResponse>("/api/prepared-batches", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function listMealReviews(before: string) {
  const params = new URLSearchParams({ before });
  return requestJson<MealReviewsResponse>(`/api/meal-reviews?${params}`);
}
