import type { DishType } from "@/lib/dish-type";

export type MealSource = "fresh" | "fridge" | "frozen";
export type MealType = "breakfast" | "lunch" | "dinner" | "snack";
export type MealStatus = "planned" | "confirmed" | "skipped";
export type PreparedStorage = "fridge" | "freezer";
export type PreparedReservationStatus = "reserved" | "consumed" | "released";
export type MealSyncState = "disabled" | "pending" | "synced" | "conflict" | "paused";

export type DishKey = `fresh:${number}` | `prepared:${number}`;

export interface StationAssignmentView {
  id: number;
  dishKey: DishKey;
  instructionId: number | null;
  stationName: string;
  startOffsetMinutes: number | null;
  durationMinutes: number | null;
}

export type MealConflictKind =
  | "timing_too_short"
  | "station_overlap"
  | "batch_unavailable"
  | "storage_changed"
  | "household_context_changed"
  | "calendar_deleted"
  | "calendar_concurrent_edit"
  | "calendar_unsupported_change";

export interface MealConflictView {
  id: number;
  kind: MealConflictKind;
  message: string;
  details: Record<string, unknown> | null;
  detectedAt: string;
}

export interface PlannedPreparedOutput {
  fridge: number;
  freezer: number;
}

export interface FreshMealDish {
  source: "fresh";
  mealPlanId: number;
  recipeId: number;
  title: string;
  yieldText: string | null;
  prepTime: number | null;
  cookTime: number | null;
  servingsMultiplier: number;
  targetPortions: number;
  plannedOutput: PlannedPreparedOutput | null;
  cookedAt: string | null;
  stations: StationAssignmentView[];
  // Meat, veg, egg… for skimming a meal's balance (see lib/dish-type).
  dishTypes: DishType[];
}

export interface PreparedMealDish {
  source: "fridge" | "frozen";
  reservationId: number;
  batchId: number;
  lotId: number;
  title: string;
  recipeId: number | null;
  plannedPortions: number;
  consumedPortions: number;
  reservationStatus: PreparedReservationStatus;
  reheatNotes: string | null;
  useByDate: string | null;
  stations: StationAssignmentView[];
  // Meat, veg, egg… for skimming a meal's balance (see lib/dish-type).
  dishTypes: DishType[];
}

export type MealDishView = FreshMealDish | PreparedMealDish;

export interface MealTimingView {
  durationMinutes: number | null;
  missingTiming: boolean;
  startAt: string | null;
}

export interface MealGroupView {
  id: number;
  revision: number;
  date: string;
  mealType: MealType;
  serveAt: string;
  timezone: string;
  dinerCount: number;
  durationOverrideMinutes: number | null;
  defrostAtOverride: string | null;
  status: MealStatus;
  confirmedAt: string | null;
  dishes: MealDishView[];
  timing: MealTimingView;
  conflicts: MealConflictView[];
  syncState: MealSyncState;
}

export interface PreparedLotView {
  id: number;
  storage: PreparedStorage;
  physicalPortions: number;
  reservedPortions: number;
  unallocatedPortions: number;
  useByDate: string | null;
  revision: number;
}

export interface PreparedBatchView {
  id: number;
  revision: number;
  title: string;
  recipeId: number | null;
  cookedAt: string | null;
  notes: string | null;
  lots: PreparedLotView[];
  totalPhysicalPortions: number;
  totalReservedPortions: number;
  totalUnallocatedPortions: number;
  createdAt: string;
  updatedAt: string;
}

export interface CalendarStatusView {
  enabled: boolean;
  state: MealSyncState;
  connectionId: number | null;
  calendarId: string | null;
  calendarName: string | null;
  googleAccountEmail: string | null;
  lastSyncedAt: string | null;
  lastError: string | null;
}

export interface CreateMealGroupRequest {
  date: string;
  mealType: MealType;
  serveAt: string;
  timezone: string;
  dinerCount: number;
  durationOverrideMinutes?: number | null;
  defrostAtOverride?: string | null;
  adoptLegacySlot?: boolean;
}

export interface UpdateMealGroupRequest {
  expectedRevision: number;
  date?: string;
  mealType?: MealType;
  serveAt?: string;
  timezone?: string;
  dinerCount?: number;
  durationOverrideMinutes?: number | null;
  defrostAtOverride?: string | null;
}

export interface AddFreshDishRequest {
  expectedRevision: number;
  recipeId: number;
  targetPortions: number;
  plannedOutput?: PlannedPreparedOutput | null;
  notes?: string | null;
}

export interface AddPreparedDishRequest {
  lotId: number;
  portions: number;
  reheatNotes?: string | null;
  idempotencyKey: string;
  expectedRevision: number;
}

export interface UpdateFreshDishRequest {
  expectedRevision: number;
  targetPortions?: number;
  plannedOutput?: PlannedPreparedOutput | null;
  notes?: string | null;
}

export interface UpdatePreparedDishRequest {
  expectedRevision: number;
  portions?: number;
  reheatNotes?: string | null;
}

export interface PreparedLotInput {
  storage: PreparedStorage;
  portions: number;
  useByDate?: string | null;
}

export interface CreatePreparedBatchRequest {
  title: string;
  recipeId?: number | null;
  cookedAt?: string | null;
  notes?: string | null;
  lots: PreparedLotInput[];
}

export interface UpdatePreparedBatchRequest {
  expectedRevision: number;
  title?: string;
  cookedAt?: string | null;
  notes?: string | null;
}

export interface TransferPreparedPortionsRequest {
  expectedBatchRevision: number;
  expectedLotRevision: number;
  fromLotId: number;
  storage: PreparedStorage;
  portions: number;
  useByDate?: string | null;
}

export interface StationAssignmentInput {
  dishKey: DishKey;
  instructionId?: number | null;
  stationName: string;
  startOffsetMinutes?: number | null;
  durationMinutes?: number | null;
}

export interface ReplaceStationAssignmentsRequest {
  expectedRevision: number;
  assignments: StationAssignmentInput[];
}

export interface ConfirmPreparedDishInput {
  reservationId: number;
  consumedPortions: number;
}

export interface ConfirmFreshDishInput {
  mealPlanId: number;
  cooked: boolean;
  output?: PlannedPreparedOutput | null;
}

export interface ConfirmMealRequest {
  idempotencyKey: string;
  expectedRevision: number;
  outcome: "as_planned" | "adjusted" | "skipped";
  actualDiners?: number;
  prepared?: ConfirmPreparedDishInput[];
  fresh?: ConfirmFreshDishInput[];
}

export interface UndoMealConfirmationRequest {
  idempotencyKey: string;
  expectedRevision: number;
}

export interface MealGroupsResponse {
  mealGroups: MealGroupView[];
  calendar: CalendarStatusView;
}

export interface MealGroupResponse {
  mealGroup: MealGroupView;
}

export interface PreparedBatchesResponse {
  batches: PreparedBatchView[];
}

export interface PreparedBatchResponse {
  batch: PreparedBatchView;
}

export interface MealReviewItem {
  mealGroup: MealGroupView;
  elapsedAt: string;
}

export interface MealReviewsResponse {
  reviews: MealReviewItem[];
}

export interface ApiErrorResponse {
  error: string;
  code?:
    | "INVALID_REQUEST"
    | "NOT_FOUND"
    | "REVISION_CONFLICT"
    | "INSUFFICIENT_PORTIONS"
    | "ALREADY_CONFIRMED";
}
