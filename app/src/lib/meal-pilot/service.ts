import { and, desc, eq, gte, inArray, isNull, lt, lte, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  calendarActivities,
  calendarConnections,
  householdMemberBlocks,
  householdMembers,
  ingredients,
  inventory,
  mealConfirmationCommands,
  mealConflicts,
  mealFreshEffects,
  mealGroups,
  mealPlans,
  mealStationAssignments,
  preparedBatches,
  preparedLots,
  preparedReservations,
  recipes,
  type MealGroup,
} from "@/db/schema";
import { canUserAccessRecipe } from "@/lib/recipe-access";
import { getUserHousehold, isHouseholdMember } from "@/lib/households";
import { blockedMembersForSlot, type HouseholdBlockScope } from "@/lib/household-blocking";
import { computeDeductionItems, matchInventoryRow } from "@/lib/household-inventory";
import { blockingScaleFactor, parseYieldServings } from "@/lib/household-portions";
import { getMealCookingDuration } from "@/lib/meal-cooking-duration";
import {
  isDateKey,
  isIanaTimezone,
  isIsoInstant,
  isMealType,
  isPreparedStorage,
  localDateKey,
  parseJsonObject,
  positiveInteger,
  positiveNumber,
  preparedLotBalance,
  servingsMultiplierForTarget,
} from "./domain";
import type {
  AddFreshDishRequest,
  AddPreparedDishRequest,
  CalendarStatusView,
  ConfirmMealRequest,
  CreateMealGroupRequest,
  CreatePreparedBatchRequest,
  FreshMealDish,
  MealConflictKind,
  MealConflictView,
  MealDishView,
  MealGroupView,
  MealSyncState,
  PreparedBatchView,
  PreparedMealDish,
  ReplaceStationAssignmentsRequest,
  StationAssignmentView,
  TransferPreparedPortionsRequest,
  UpdateFreshDishRequest,
  UpdateMealGroupRequest,
  UpdatePreparedDishRequest,
  UpdatePreparedBatchRequest,
  UndoMealConfirmationRequest,
} from "./types";

export type MealPilotErrorCode =
  | "INVALID_REQUEST"
  | "NOT_FOUND"
  | "REVISION_CONFLICT"
  | "INSUFFICIENT_PORTIONS"
  | "ALREADY_CONFIRMED";

export class MealPilotError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: MealPilotErrorCode
  ) {
    super(message);
  }
}

type MealScope = { userId: number; householdId: number | null };

export async function currentMealScope(userId: number): Promise<MealScope> {
  const membership = await getUserHousehold(userId);
  return { userId, householdId: membership?.household.id ?? null };
}

async function authorizedMealGroup(mealGroupId: number, userId: number): Promise<MealGroup | null> {
  const group = await db.query.mealGroups.findFirst({
    where: eq(mealGroups.id, mealGroupId),
  });
  if (!group) return null;
  if (group.householdId == null) return group.userId === userId ? group : null;
  return (await isHouseholdMember(userId, group.householdId)) ? group : null;
}

async function requireMealGroup(mealGroupId: number, userId: number): Promise<MealGroup> {
  const group = await authorizedMealGroup(mealGroupId, userId);
  if (!group) throw new MealPilotError("Meal not found", 404, "NOT_FOUND");
  return group;
}

async function findPreparedBatch(batchId: number, userId: number) {
  const batch = await db.query.preparedBatches.findFirst({
    where: eq(preparedBatches.id, batchId),
  });
  if (!batch) return null;
  if (batch.householdId == null) return batch.userId === userId ? batch : null;
  return (await isHouseholdMember(userId, batch.householdId)) ? batch : null;
}

function scopeMatches(a: { userId: number; householdId: number | null }, b: MealScope): boolean {
  return a.householdId != null
    ? a.householdId === b.householdId
    : b.householdId == null && a.userId === b.userId;
}

function validateMealSchedule(input: {
  date: unknown;
  mealType: unknown;
  serveAt: unknown;
  timezone: unknown;
  dinerCount: unknown;
  durationOverrideMinutes?: unknown;
  defrostAtOverride?: unknown;
}) {
  if (!isDateKey(input.date)) {
    throw new MealPilotError("Date must use YYYY-MM-DD", 400, "INVALID_REQUEST");
  }
  if (!isMealType(input.mealType)) {
    throw new MealPilotError("Invalid meal type", 400, "INVALID_REQUEST");
  }
  if (!isIsoInstant(input.serveAt)) {
    throw new MealPilotError("Serving time must be a valid instant", 400, "INVALID_REQUEST");
  }
  if (!isIanaTimezone(input.timezone)) {
    throw new MealPilotError("Invalid timezone", 400, "INVALID_REQUEST");
  }
  if (localDateKey(input.serveAt, input.timezone) !== input.date) {
    throw new MealPilotError(
      "Serving time does not fall on the selected local date",
      400,
      "INVALID_REQUEST"
    );
  }
  const dinerCount = positiveInteger(input.dinerCount);
  if (dinerCount == null) {
    throw new MealPilotError("Diner count must be a positive whole number", 400, "INVALID_REQUEST");
  }
  const duration = input.durationOverrideMinutes;
  if (duration !== undefined && duration !== null && positiveInteger(duration) == null) {
    throw new MealPilotError(
      "Cooking time override must be a positive whole number",
      400,
      "INVALID_REQUEST"
    );
  }
  if (
    input.defrostAtOverride !== undefined &&
    input.defrostAtOverride !== null &&
    !isIsoInstant(input.defrostAtOverride)
  ) {
    throw new MealPilotError("Defrost reminder must be a valid instant", 400, "INVALID_REQUEST");
  }
  return { dinerCount, durationOverrideMinutes: duration == null ? null : Number(duration) };
}

function syncStateFor(
  connection: typeof calendarConnections.$inferSelect | null,
  activities: Array<typeof calendarActivities.$inferSelect>
): MealSyncState {
  if (!connection) return "disabled";
  if (connection.status !== "connected" || connection.disconnectedAt) return "paused";
  if (activities.some((activity) => activity.state === "conflict")) return "conflict";
  if (activities.some((activity) => activity.state !== "synced")) return "pending";
  return activities.length > 0 ? "synced" : "pending";
}

function calendarStatus(
  connection: typeof calendarConnections.$inferSelect | null,
  syncState: MealSyncState
): CalendarStatusView {
  return {
    enabled: Boolean(connection && !connection.disconnectedAt),
    state: syncState,
    connectionId: connection?.id ?? null,
    calendarId: connection?.calendarId ?? null,
    calendarName: connection?.calendarName ?? null,
    googleAccountEmail: connection?.googleAccountEmail ?? null,
    lastSyncedAt: connection?.lastSyncedAt ?? null,
    lastError: connection?.lastError ?? null,
  };
}

async function activeConnectionForGroup(group: MealGroup) {
  return db.query.calendarConnections.findFirst({
    where:
      group.householdId != null
        ? and(
            eq(calendarConnections.householdId, group.householdId),
            isNull(calendarConnections.disconnectedAt)
          )
        : and(
            eq(calendarConnections.userId, group.userId),
            isNull(calendarConnections.householdId),
            isNull(calendarConnections.disconnectedAt)
          ),
  });
}

async function buildMealGroupViews(groups: MealGroup[]): Promise<MealGroupView[]> {
  if (groups.length === 0) return [];
  const ids = groups.map((group) => group.id);
  const [freshRows, preparedRows, stationRows, conflictRows, activityRows] = await Promise.all([
    db
      .select({
        id: mealPlans.id,
        mealGroupId: mealPlans.mealGroupId,
        recipeId: mealPlans.recipeId,
        servings: mealPlans.servings,
        targetPortions: mealPlans.targetPortions,
        plannedOutputFridge: mealPlans.plannedOutputFridge,
        plannedOutputFreezer: mealPlans.plannedOutputFreezer,
        cookedAt: mealPlans.cookedAt,
        title: recipes.title,
        yieldText: recipes.yield,
        prepTime: recipes.prepTime,
        cookTime: recipes.cookTime,
      })
      .from(mealPlans)
      .innerJoin(recipes, eq(mealPlans.recipeId, recipes.id))
      .where(inArray(mealPlans.mealGroupId, ids)),
    db
      .select({
        id: preparedReservations.id,
        mealGroupId: preparedReservations.mealGroupId,
        lotId: preparedReservations.lotId,
        sourceStorage: preparedReservations.sourceStorage,
        plannedPortions: preparedReservations.plannedPortions,
        consumedPortions: preparedReservations.consumedPortions,
        status: preparedReservations.status,
        reheatNotes: preparedReservations.reheatNotes,
        useByDate: preparedLots.useByDate,
        batchId: preparedBatches.id,
        title: preparedBatches.title,
        recipeId: preparedBatches.recipeId,
      })
      .from(preparedReservations)
      .innerJoin(preparedLots, eq(preparedReservations.lotId, preparedLots.id))
      .innerJoin(preparedBatches, eq(preparedLots.batchId, preparedBatches.id))
      .where(
        and(
          inArray(preparedReservations.mealGroupId, ids),
          ne(preparedReservations.status, "released")
        )
      ),
    db
      .select()
      .from(mealStationAssignments)
      .where(inArray(mealStationAssignments.mealGroupId, ids)),
    db
      .select()
      .from(mealConflicts)
      .where(and(inArray(mealConflicts.mealGroupId, ids), isNull(mealConflicts.resolvedAt))),
    db
      .select()
      .from(calendarActivities)
      .where(inArray(calendarActivities.mealGroupId, ids)),
  ]);

  const connectionCache = new Map<
    string,
    Awaited<ReturnType<typeof activeConnectionForGroup>> | null
  >();
  const result: MealGroupView[] = [];
  for (const group of groups) {
    const stationView = (row: (typeof stationRows)[number], dishKey: StationAssignmentView["dishKey"]): StationAssignmentView => ({
      id: row.id,
      dishKey,
      instructionId: row.instructionId,
      stationName: row.stationName,
      startOffsetMinutes: row.startOffsetMinutes,
      durationMinutes: row.durationMinutes,
    });

    const fresh: FreshMealDish[] = freshRows
      .filter((row) => row.mealGroupId === group.id)
      .map((row) => {
        const parsedYield = parseYieldServings(row.yieldText);
        const targetPortions =
          row.targetPortions ?? (parsedYield != null ? parsedYield * row.servings : 0);
        const output =
          row.plannedOutputFridge == null && row.plannedOutputFreezer == null
            ? null
            : {
                fridge: row.plannedOutputFridge ?? 0,
                freezer: row.plannedOutputFreezer ?? 0,
              };
        return {
          source: "fresh",
          mealPlanId: row.id,
          recipeId: row.recipeId,
          title: row.title,
          yieldText: row.yieldText,
          prepTime: row.prepTime,
          cookTime: row.cookTime,
          servingsMultiplier: row.servings,
          targetPortions,
          plannedOutput: output,
          cookedAt: row.cookedAt,
          stations: stationRows
            .filter((station) => station.mealPlanId === row.id)
            .map((station) => stationView(station, `fresh:${row.id}`)),
        };
      });

    const prepared: PreparedMealDish[] = preparedRows
      .filter((row) => row.mealGroupId === group.id)
      .map((row) => ({
        source: row.sourceStorage === "freezer" ? "frozen" : "fridge",
        reservationId: row.id,
        batchId: row.batchId,
        lotId: row.lotId,
        title: row.title,
        recipeId: row.recipeId,
        plannedPortions: row.plannedPortions,
        consumedPortions: row.consumedPortions,
        reservationStatus: row.status as PreparedMealDish["reservationStatus"],
        reheatNotes: row.reheatNotes,
        useByDate: row.useByDate,
        stations: stationRows
          .filter((station) => station.reservationId === row.id)
          .map((station) => stationView(station, `prepared:${row.id}`)),
      }));
    const dishes: MealDishView[] = [...fresh, ...prepared];
    const timingResult = getMealCookingDuration(
      dishes.map((dish) => ({
        source: dish.source,
        prepTime: dish.source === "fresh" ? dish.prepTime : null,
        cookTime: dish.source === "fresh" ? dish.cookTime : null,
      })),
      group.durationOverrideMinutes
    );
    const startAt =
      timingResult.durationMinutes == null
        ? null
        : new Date(Date.parse(group.serveAt) - timingResult.durationMinutes * 60_000).toISOString();
    const groupActivities = activityRows.filter((activity) => activity.mealGroupId === group.id);
    const connectionKey = group.householdId != null ? `h:${group.householdId}` : `u:${group.userId}`;
    let connection = connectionCache.get(connectionKey);
    if (connection === undefined) {
      connection = (await activeConnectionForGroup(group)) ?? null;
      connectionCache.set(connectionKey, connection);
    }
    result.push({
      id: group.id,
      revision: group.revision,
      date: group.date,
      mealType: group.mealType as MealGroupView["mealType"],
      serveAt: group.serveAt,
      timezone: group.timezone,
      dinerCount: group.dinerCount,
      durationOverrideMinutes: group.durationOverrideMinutes,
      defrostAtOverride: group.defrostAtOverride,
      status: group.status as MealGroupView["status"],
      confirmedAt: group.confirmedAt,
      dishes,
      timing: { ...timingResult, startAt },
      conflicts: conflictRows
        .filter((conflict) => conflict.mealGroupId === group.id)
        .map(
          (conflict): MealConflictView => ({
            id: conflict.id,
            kind: conflict.kind as MealConflictKind,
            message: conflict.message,
            details: parseJsonObject(conflict.details),
            detectedAt: conflict.detectedAt,
          })
        ),
      syncState: syncStateFor(connection ?? null, groupActivities),
    });
  }
  return result;
}

export async function listMealGroups(input: {
  userId: number;
  startDate?: string | null;
  endDate?: string | null;
}): Promise<{ mealGroups: MealGroupView[]; calendar: CalendarStatusView }> {
  const scope = await currentMealScope(input.userId);
  const conditions = [
    scope.householdId != null
      ? eq(mealGroups.householdId, scope.householdId)
      : and(eq(mealGroups.userId, scope.userId), isNull(mealGroups.householdId)),
  ];
  if (input.startDate) conditions.push(gte(mealGroups.date, input.startDate));
  if (input.endDate) conditions.push(lte(mealGroups.date, input.endDate));
  const groups = await db
    .select()
    .from(mealGroups)
    .where(and(...conditions))
    .orderBy(mealGroups.date, mealGroups.serveAt);
  const views = await buildMealGroupViews(groups);
  const connection = groups[0]
    ? (await activeConnectionForGroup(groups[0])) ?? null
    : await db.query.calendarConnections.findFirst({
        where:
          scope.householdId != null
            ? and(
                eq(calendarConnections.householdId, scope.householdId),
                isNull(calendarConnections.disconnectedAt)
              )
            : and(
                eq(calendarConnections.userId, scope.userId),
                isNull(calendarConnections.householdId),
                isNull(calendarConnections.disconnectedAt)
              ),
      });
  const state = connection
    ? views.some((view) => view.syncState === "conflict")
      ? "conflict"
      : views.some((view) => view.syncState === "pending")
        ? "pending"
        : connection.status === "connected"
          ? "synced"
          : "paused"
    : "disabled";
  return { mealGroups: views, calendar: calendarStatus(connection ?? null, state) };
}

export async function getMealGroup(userId: number, mealGroupId: number): Promise<MealGroupView> {
  const group = await requireMealGroup(mealGroupId, userId);
  const [view] = await buildMealGroupViews([group]);
  return view;
}

export async function getMealGroupCalendarSource(mealGroupId: number) {
  const group = await db.query.mealGroups.findFirst({ where: eq(mealGroups.id, mealGroupId) });
  if (!group) return null;
  const [mealGroup] = await buildMealGroupViews([group]);
  return { mealGroup, dishes: mealGroup.dishes };
}

export async function createMealGroup(
  userId: number,
  input: CreateMealGroupRequest
): Promise<MealGroupView> {
  const validated = validateMealSchedule(input);
  const scope = await currentMealScope(userId);
  const now = new Date().toISOString();
  const created = await db.transaction(async (tx) => {
    const [group] = await tx
      .insert(mealGroups)
      .values({
        userId,
        householdId: scope.householdId,
        date: input.date,
        mealType: input.mealType,
        serveAt: new Date(input.serveAt).toISOString(),
        timezone: input.timezone,
        dinerCount: validated.dinerCount,
        durationOverrideMinutes: validated.durationOverrideMinutes,
        defrostAtOverride: input.defrostAtOverride
          ? new Date(input.defrostAtOverride).toISOString()
          : null,
        status: "planned",
        revision: 1,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    if (input.adoptLegacySlot) {
      await tx
        .update(mealPlans)
        .set({ mealGroupId: group.id })
        .where(
          and(
            scope.householdId != null
              ? eq(mealPlans.householdId, scope.householdId)
              : and(eq(mealPlans.userId, userId), isNull(mealPlans.householdId)),
            eq(mealPlans.date, input.date),
            eq(mealPlans.mealType, input.mealType),
            isNull(mealPlans.mealGroupId)
          )
        );
    }
    return group;
  });
  const [view] = await buildMealGroupViews([created]);
  return view;
}

export async function updateMealGroup(
  userId: number,
  mealGroupId: number,
  input: UpdateMealGroupRequest
): Promise<MealGroupView> {
  const existing = await requireMealGroup(mealGroupId, userId);
  if (existing.status !== "planned") {
    throw new MealPilotError("Completed meals cannot be rescheduled", 409, "ALREADY_CONFIRMED");
  }
  const candidate = {
    date: input.date ?? existing.date,
    mealType: input.mealType ?? existing.mealType,
    serveAt: input.serveAt ?? existing.serveAt,
    timezone: input.timezone ?? existing.timezone,
    dinerCount: input.dinerCount ?? existing.dinerCount,
    durationOverrideMinutes:
      input.durationOverrideMinutes === undefined
        ? existing.durationOverrideMinutes
        : input.durationOverrideMinutes,
    defrostAtOverride:
      input.defrostAtOverride === undefined
        ? existing.defrostAtOverride
        : input.defrostAtOverride,
  };
  const validated = validateMealSchedule(candidate);
  const now = new Date().toISOString();
  await db.transaction(async (tx) => {
    const updated = await tx
      .update(mealGroups)
      .set({
        date: candidate.date,
        mealType: candidate.mealType,
        serveAt: new Date(candidate.serveAt).toISOString(),
        timezone: candidate.timezone,
        dinerCount: validated.dinerCount,
        durationOverrideMinutes: validated.durationOverrideMinutes,
        defrostAtOverride: candidate.defrostAtOverride
          ? new Date(candidate.defrostAtOverride).toISOString()
          : null,
        revision: sql`${mealGroups.revision} + 1`,
        updatedAt: now,
      })
      .where(and(eq(mealGroups.id, mealGroupId), eq(mealGroups.revision, input.expectedRevision)))
      .returning({ id: mealGroups.id });
    if (updated.length === 0) {
      throw new MealPilotError(
        "This meal changed elsewhere. Reload and try again.",
        409,
        "REVISION_CONFLICT"
      );
    }
    await tx
      .update(mealPlans)
      .set({ date: candidate.date, mealType: candidate.mealType })
      .where(eq(mealPlans.mealGroupId, mealGroupId));
  });
  return getMealGroup(userId, mealGroupId);
}

export async function addFreshDish(
  userId: number,
  mealGroupId: number,
  input: AddFreshDishRequest
): Promise<MealGroupView> {
  const group = await requireMealGroup(mealGroupId, userId);
  if (group.status !== "planned") {
    throw new MealPilotError("This meal is already complete", 409, "ALREADY_CONFIRMED");
  }
  const recipeId = positiveInteger(input.recipeId);
  const targetPortions = positiveNumber(input.targetPortions);
  if (recipeId == null || targetPortions == null || !(await canUserAccessRecipe(userId, recipeId))) {
    throw new MealPilotError("Recipe or portion target is invalid", 400, "INVALID_REQUEST");
  }
  const recipe = await db.query.recipes.findFirst({
    where: eq(recipes.id, recipeId),
    columns: { yield: true },
  });
  const multiplier = servingsMultiplierForTarget(recipe?.yield, targetPortions);
  if (multiplier == null) {
    throw new MealPilotError(
      "Add a numeric recipe yield before planning portions",
      400,
      "INVALID_REQUEST"
    );
  }
  const fridge = input.plannedOutput?.fridge ?? 0;
  const freezer = input.plannedOutput?.freezer ?? 0;
  if (![fridge, freezer].every((value) => Number.isFinite(value) && value >= 0)) {
    throw new MealPilotError("Saved portions cannot be negative", 400, "INVALID_REQUEST");
  }
  const now = new Date().toISOString();
  await db.transaction(async (tx) => {
    const bumped = await tx
      .update(mealGroups)
      .set({ revision: sql`${mealGroups.revision} + 1`, updatedAt: now })
      .where(and(eq(mealGroups.id, mealGroupId), eq(mealGroups.revision, input.expectedRevision)))
      .returning({ id: mealGroups.id });
    if (bumped.length === 0) {
      throw new MealPilotError(
        "This meal changed elsewhere. Reload and try again.",
        409,
        "REVISION_CONFLICT"
      );
    }
    await tx.insert(mealPlans).values({
      userId,
      householdId: group.householdId,
      mealGroupId,
      date: group.date,
      mealType: group.mealType,
      recipeId,
      servings: multiplier,
      targetPortions,
      plannedOutputFridge: input.plannedOutput ? fridge : null,
      plannedOutputFreezer: input.plannedOutput ? freezer : null,
      notes: input.notes ?? null,
      createdAt: now,
    });
  });
  return getMealGroup(userId, mealGroupId);
}

export async function addPreparedDish(
  userId: number,
  mealGroupId: number,
  input: AddPreparedDishRequest
): Promise<MealGroupView> {
  const group = await requireMealGroup(mealGroupId, userId);
  const portions = positiveNumber(input.portions);
  if (group.status !== "planned") {
    throw new MealPilotError("This meal is already complete", 409, "ALREADY_CONFIRMED");
  }
  if (positiveInteger(input.lotId) == null || portions == null || !input.idempotencyKey?.trim()) {
    throw new MealPilotError("Lot, portions, and idempotency key are required", 400, "INVALID_REQUEST");
  }
  const scope = { userId: group.userId, householdId: group.householdId };
  const now = new Date().toISOString();
  await db.transaction(async (tx) => {
    const duplicate = await tx.query.preparedReservations.findFirst({
      where: eq(preparedReservations.idempotencyKey, input.idempotencyKey),
    });
    if (duplicate) {
      if (duplicate.mealGroupId !== mealGroupId) {
        throw new MealPilotError("Idempotency key was already used", 409, "REVISION_CONFLICT");
      }
      return;
    }
    const [lot] = await tx
      .select({
        id: preparedLots.id,
        storage: preparedLots.storage,
        physicalPortions: preparedLots.physicalPortions,
        userId: preparedBatches.userId,
        householdId: preparedBatches.householdId,
      })
      .from(preparedLots)
      .innerJoin(preparedBatches, eq(preparedLots.batchId, preparedBatches.id))
      .where(eq(preparedLots.id, input.lotId))
      .limit(1);
    if (!lot || !scopeMatches(lot, scope)) {
      throw new MealPilotError("Prepared food lot not found", 404, "NOT_FOUND");
    }
    const reservedRows = await tx
      .select({ total: sql<number>`coalesce(sum(${preparedReservations.plannedPortions}), 0)` })
      .from(preparedReservations)
      .where(
        and(
          eq(preparedReservations.lotId, lot.id),
          eq(preparedReservations.status, "reserved")
        )
      );
    const available = lot.physicalPortions - Number(reservedRows[0]?.total ?? 0);
    if (available + 1e-9 < portions) {
      throw new MealPilotError(
        `Only ${Math.max(0, available)} portions are unallocated`,
        409,
        "INSUFFICIENT_PORTIONS"
      );
    }
    const bumped = await tx
      .update(mealGroups)
      .set({ revision: sql`${mealGroups.revision} + 1`, updatedAt: now })
      .where(and(eq(mealGroups.id, mealGroupId), eq(mealGroups.revision, input.expectedRevision)))
      .returning({ id: mealGroups.id });
    if (bumped.length === 0) {
      throw new MealPilotError(
        "This meal changed elsewhere. Reload and try again.",
        409,
        "REVISION_CONFLICT"
      );
    }
    await tx.insert(preparedReservations).values({
      mealGroupId,
      lotId: lot.id,
      sourceStorage: lot.storage,
      plannedPortions: portions,
      consumedPortions: 0,
      status: "reserved",
      reheatNotes: input.reheatNotes?.trim() || null,
      idempotencyKey: input.idempotencyKey,
      createdAt: now,
      updatedAt: now,
    });
  });
  return getMealGroup(userId, mealGroupId);
}

export async function updateFreshDish(
  userId: number,
  mealGroupId: number,
  mealPlanId: number,
  input: UpdateFreshDishRequest
): Promise<MealGroupView> {
  const group = await requireMealGroup(mealGroupId, userId);
  if (group.status !== "planned") {
    throw new MealPilotError("This meal is already complete", 409, "ALREADY_CONFIRMED");
  }
  const [plan] = await db
    .select({
      id: mealPlans.id,
      recipeId: mealPlans.recipeId,
      yieldText: recipes.yield,
    })
    .from(mealPlans)
    .innerJoin(recipes, eq(mealPlans.recipeId, recipes.id))
    .where(and(eq(mealPlans.id, mealPlanId), eq(mealPlans.mealGroupId, mealGroupId)))
    .limit(1);
  if (!plan) throw new MealPilotError("Fresh dish not found", 404, "NOT_FOUND");
  const fields: Partial<typeof mealPlans.$inferInsert> = {};
  if (input.targetPortions !== undefined) {
    const target = positiveNumber(input.targetPortions);
    const multiplier = target == null ? null : servingsMultiplierForTarget(plan.yieldText, target);
    if (target == null || multiplier == null) {
      throw new MealPilotError(
        "A positive portion target and numeric recipe yield are required",
        400,
        "INVALID_REQUEST"
      );
    }
    fields.targetPortions = target;
    fields.servings = multiplier;
  }
  if (input.plannedOutput !== undefined) {
    const fridge = input.plannedOutput?.fridge ?? 0;
    const freezer = input.plannedOutput?.freezer ?? 0;
    if (![fridge, freezer].every((value) => Number.isFinite(value) && value >= 0)) {
      throw new MealPilotError("Saved portions cannot be negative", 400, "INVALID_REQUEST");
    }
    fields.plannedOutputFridge = input.plannedOutput ? fridge : null;
    fields.plannedOutputFreezer = input.plannedOutput ? freezer : null;
  }
  if (input.notes !== undefined) fields.notes = input.notes?.trim() || null;
  if (Object.keys(fields).length === 0) {
    throw new MealPilotError("No fresh dish changes supplied", 400, "INVALID_REQUEST");
  }
  const now = new Date().toISOString();
  await db.transaction(async (tx) => {
    const bumped = await tx
      .update(mealGroups)
      .set({ revision: sql`${mealGroups.revision} + 1`, updatedAt: now })
      .where(and(eq(mealGroups.id, mealGroupId), eq(mealGroups.revision, input.expectedRevision)))
      .returning({ id: mealGroups.id });
    if (bumped.length === 0) {
      throw new MealPilotError(
        "This meal changed elsewhere. Reload and try again.",
        409,
        "REVISION_CONFLICT"
      );
    }
    await tx.update(mealPlans).set(fields).where(eq(mealPlans.id, mealPlanId));
  });
  return getMealGroup(userId, mealGroupId);
}

export async function removeFreshDish(
  userId: number,
  mealGroupId: number,
  mealPlanId: number,
  expectedRevision: number
): Promise<MealGroupView> {
  const group = await requireMealGroup(mealGroupId, userId);
  if (group.status !== "planned") {
    throw new MealPilotError("This meal is already complete", 409, "ALREADY_CONFIRMED");
  }
  const now = new Date().toISOString();
  await db.transaction(async (tx) => {
    const dish = await tx.query.mealPlans.findFirst({
      where: and(eq(mealPlans.id, mealPlanId), eq(mealPlans.mealGroupId, mealGroupId)),
      columns: { id: true },
    });
    if (!dish) throw new MealPilotError("Fresh dish not found", 404, "NOT_FOUND");
    const bumped = await tx
      .update(mealGroups)
      .set({ revision: sql`${mealGroups.revision} + 1`, updatedAt: now })
      .where(and(eq(mealGroups.id, mealGroupId), eq(mealGroups.revision, expectedRevision)))
      .returning({ id: mealGroups.id });
    if (bumped.length === 0) {
      throw new MealPilotError(
        "This meal changed elsewhere. Reload and try again.",
        409,
        "REVISION_CONFLICT"
      );
    }
    await tx.delete(mealPlans).where(eq(mealPlans.id, mealPlanId));
  });
  return getMealGroup(userId, mealGroupId);
}

export async function updatePreparedDish(
  userId: number,
  mealGroupId: number,
  reservationId: number,
  input: UpdatePreparedDishRequest
): Promise<MealGroupView> {
  const group = await requireMealGroup(mealGroupId, userId);
  if (group.status !== "planned") {
    throw new MealPilotError("This meal is already complete", 409, "ALREADY_CONFIRMED");
  }
  const now = new Date().toISOString();
  await db.transaction(async (tx) => {
    const reservation = await tx.query.preparedReservations.findFirst({
      where: and(
        eq(preparedReservations.id, reservationId),
        eq(preparedReservations.mealGroupId, mealGroupId),
        eq(preparedReservations.status, "reserved")
      ),
    });
    if (!reservation) throw new MealPilotError("Prepared dish not found", 404, "NOT_FOUND");
    const fields: Partial<typeof preparedReservations.$inferInsert> = { updatedAt: now };
    if (input.portions !== undefined) {
      const portions = positiveNumber(input.portions);
      if (portions == null) {
        throw new MealPilotError("Portions must be positive", 400, "INVALID_REQUEST");
      }
      const [lot, totals] = await Promise.all([
        tx.query.preparedLots.findFirst({
          where: eq(preparedLots.id, reservation.lotId),
          columns: { physicalPortions: true },
        }),
        tx
          .select({ total: sql<number>`coalesce(sum(${preparedReservations.plannedPortions}), 0)` })
          .from(preparedReservations)
          .where(
            and(
              eq(preparedReservations.lotId, reservation.lotId),
              eq(preparedReservations.status, "reserved"),
              ne(preparedReservations.id, reservation.id)
            )
          ),
      ]);
      const available = (lot?.physicalPortions ?? 0) - Number(totals[0]?.total ?? 0);
      if (available + 1e-9 < portions) {
        throw new MealPilotError(
          `Only ${Math.max(0, available)} portions are available for this meal`,
          409,
          "INSUFFICIENT_PORTIONS"
        );
      }
      fields.plannedPortions = portions;
    }
    if (input.reheatNotes !== undefined) fields.reheatNotes = input.reheatNotes?.trim() || null;
    const bumped = await tx
      .update(mealGroups)
      .set({ revision: sql`${mealGroups.revision} + 1`, updatedAt: now })
      .where(and(eq(mealGroups.id, mealGroupId), eq(mealGroups.revision, input.expectedRevision)))
      .returning({ id: mealGroups.id });
    if (bumped.length === 0) {
      throw new MealPilotError(
        "This meal changed elsewhere. Reload and try again.",
        409,
        "REVISION_CONFLICT"
      );
    }
    await tx
      .update(preparedReservations)
      .set(fields)
      .where(eq(preparedReservations.id, reservationId));
  });
  return getMealGroup(userId, mealGroupId);
}

export async function removePreparedDish(
  userId: number,
  mealGroupId: number,
  reservationId: number,
  expectedRevision: number
): Promise<MealGroupView> {
  const group = await requireMealGroup(mealGroupId, userId);
  if (group.status !== "planned") {
    throw new MealPilotError("This meal is already complete", 409, "ALREADY_CONFIRMED");
  }
  const now = new Date().toISOString();
  await db.transaction(async (tx) => {
    const reservation = await tx.query.preparedReservations.findFirst({
      where: and(
        eq(preparedReservations.id, reservationId),
        eq(preparedReservations.mealGroupId, mealGroupId),
        eq(preparedReservations.status, "reserved")
      ),
      columns: { id: true },
    });
    if (!reservation) throw new MealPilotError("Prepared dish not found", 404, "NOT_FOUND");
    const bumped = await tx
      .update(mealGroups)
      .set({ revision: sql`${mealGroups.revision} + 1`, updatedAt: now })
      .where(and(eq(mealGroups.id, mealGroupId), eq(mealGroups.revision, expectedRevision)))
      .returning({ id: mealGroups.id });
    if (bumped.length === 0) {
      throw new MealPilotError(
        "This meal changed elsewhere. Reload and try again.",
        409,
        "REVISION_CONFLICT"
      );
    }
    await tx.delete(preparedReservations).where(eq(preparedReservations.id, reservationId));
  });
  return getMealGroup(userId, mealGroupId);
}

export async function listPreparedBatches(userId: number): Promise<PreparedBatchView[]> {
  const scope = await currentMealScope(userId);
  const batches = await db
    .select()
    .from(preparedBatches)
    .where(
      scope.householdId != null
        ? eq(preparedBatches.householdId, scope.householdId)
        : and(eq(preparedBatches.userId, userId), isNull(preparedBatches.householdId))
    )
    .orderBy(sql`${preparedBatches.updatedAt} desc`);
  return buildPreparedBatchViews(batches);
}

async function buildPreparedBatchViews(
  batches: Array<typeof preparedBatches.$inferSelect>
): Promise<PreparedBatchView[]> {
  if (batches.length === 0) return [];
  const batchIds = batches.map((batch) => batch.id);
  const lots = await db.select().from(preparedLots).where(inArray(preparedLots.batchId, batchIds));
  const lotIds = lots.map((lot) => lot.id);
  const reservations = lotIds.length
    ? await db
        .select()
        .from(preparedReservations)
        .where(
          and(
            inArray(preparedReservations.lotId, lotIds),
            eq(preparedReservations.status, "reserved")
          )
        )
    : [];
  return batches.map((batch) => {
    const lotViews = lots
      .filter((lot) => lot.batchId === batch.id)
      .map((lot) => {
        const balance = preparedLotBalance(
          lot.physicalPortions,
          reservations
            .filter((reservation) => reservation.lotId === lot.id)
            .map((reservation) => reservation.plannedPortions)
        );
        return {
          id: lot.id,
          storage: lot.storage as PreparedBatchView["lots"][number]["storage"],
          ...balance,
          useByDate: lot.useByDate,
          revision: lot.revision,
        };
      });
    return {
      id: batch.id,
      revision: batch.revision,
      title: batch.title,
      recipeId: batch.recipeId,
      cookedAt: batch.cookedAt,
      notes: batch.notes,
      lots: lotViews,
      totalPhysicalPortions: lotViews.reduce((sum, lot) => sum + lot.physicalPortions, 0),
      totalReservedPortions: lotViews.reduce((sum, lot) => sum + lot.reservedPortions, 0),
      totalUnallocatedPortions: lotViews.reduce((sum, lot) => sum + lot.unallocatedPortions, 0),
      createdAt: batch.createdAt,
      updatedAt: batch.updatedAt,
    };
  });
}

export async function getPreparedBatch(userId: number, batchId: number): Promise<PreparedBatchView> {
  const batch = await findPreparedBatch(batchId, userId);
  if (!batch) throw new MealPilotError("Prepared batch not found", 404, "NOT_FOUND");
  const [view] = await buildPreparedBatchViews([batch]);
  return view;
}

export async function createPreparedBatch(
  userId: number,
  input: CreatePreparedBatchRequest
): Promise<PreparedBatchView> {
  const title = input.title?.trim();
  if (!title || !Array.isArray(input.lots) || input.lots.length === 0) {
    throw new MealPilotError("Title and at least one storage lot are required", 400, "INVALID_REQUEST");
  }
  const lots = input.lots.map((lot) => ({
    storage: lot.storage,
    portions: positiveNumber(lot.portions),
    useByDate: lot.useByDate?.trim() || null,
  }));
  if (lots.some((lot) => !isPreparedStorage(lot.storage) || lot.portions == null)) {
    throw new MealPilotError("Each lot needs valid storage and portions", 400, "INVALID_REQUEST");
  }
  const recipeId = input.recipeId == null ? null : positiveInteger(input.recipeId);
  if (input.recipeId != null && (recipeId == null || !(await canUserAccessRecipe(userId, recipeId)))) {
    throw new MealPilotError("Recipe not found", 404, "NOT_FOUND");
  }
  if (input.cookedAt != null && !isIsoInstant(input.cookedAt)) {
    throw new MealPilotError("Cooked time must be a valid instant", 400, "INVALID_REQUEST");
  }
  const scope = await currentMealScope(userId);
  const now = new Date().toISOString();
  const created = await db.transaction(async (tx) => {
    const [batch] = await tx
      .insert(preparedBatches)
      .values({
        userId,
        householdId: scope.householdId,
        recipeId,
        title,
        cookedAt: input.cookedAt ? new Date(input.cookedAt).toISOString() : null,
        notes: input.notes?.trim() || null,
        revision: 1,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    await tx.insert(preparedLots).values(
      lots.map((lot) => ({
        batchId: batch.id,
        storage: lot.storage,
        physicalPortions: lot.portions!,
        useByDate: lot.useByDate,
        revision: 1,
        createdAt: now,
        updatedAt: now,
      }))
    );
    return batch;
  });
  const [view] = await buildPreparedBatchViews([created]);
  return view;
}

export async function updatePreparedBatch(
  userId: number,
  batchId: number,
  input: UpdatePreparedBatchRequest
): Promise<PreparedBatchView> {
  const batch = await findPreparedBatch(batchId, userId);
  if (!batch) throw new MealPilotError("Prepared batch not found", 404, "NOT_FOUND");
  const fields: Partial<typeof preparedBatches.$inferInsert> = {
    revision: sql`${preparedBatches.revision} + 1` as unknown as number,
    updatedAt: new Date().toISOString(),
  };
  if (input.title !== undefined) {
    if (!input.title.trim()) throw new MealPilotError("Title is required", 400, "INVALID_REQUEST");
    fields.title = input.title.trim();
  }
  if (input.notes !== undefined) fields.notes = input.notes?.trim() || null;
  if (input.cookedAt !== undefined) {
    if (input.cookedAt !== null && !isIsoInstant(input.cookedAt)) {
      throw new MealPilotError("Cooked time must be a valid instant", 400, "INVALID_REQUEST");
    }
    fields.cookedAt = input.cookedAt ? new Date(input.cookedAt).toISOString() : null;
  }
  const updated = await db
    .update(preparedBatches)
    .set(fields)
    .where(and(eq(preparedBatches.id, batchId), eq(preparedBatches.revision, input.expectedRevision)))
    .returning({ id: preparedBatches.id });
  if (updated.length === 0) {
    throw new MealPilotError(
      "This batch changed elsewhere. Reload and try again.",
      409,
      "REVISION_CONFLICT"
    );
  }
  return getPreparedBatch(userId, batchId);
}

export async function transferPreparedPortions(
  userId: number,
  batchId: number,
  input: TransferPreparedPortionsRequest
): Promise<PreparedBatchView> {
  const batch = await findPreparedBatch(batchId, userId);
  const portions = positiveNumber(input.portions);
  if (!batch) throw new MealPilotError("Prepared batch not found", 404, "NOT_FOUND");
  if (
    positiveInteger(input.fromLotId) == null ||
    portions == null ||
    !isPreparedStorage(input.storage)
  ) {
    throw new MealPilotError("Transfer details are invalid", 400, "INVALID_REQUEST");
  }
  const now = new Date().toISOString();
  await db.transaction(async (tx) => {
    const lot = await tx.query.preparedLots.findFirst({
      where: and(eq(preparedLots.id, input.fromLotId), eq(preparedLots.batchId, batchId)),
    });
    if (!lot) throw new MealPilotError("Prepared lot not found", 404, "NOT_FOUND");
    if (lot.revision !== input.expectedLotRevision || batch.revision !== input.expectedBatchRevision) {
      throw new MealPilotError(
        "This prepared batch changed elsewhere. Reload and try again.",
        409,
        "REVISION_CONFLICT"
      );
    }
    if (lot.storage === input.storage) {
      throw new MealPilotError("Choose a different storage location", 400, "INVALID_REQUEST");
    }
    const totals = await tx
      .select({ total: sql<number>`coalesce(sum(${preparedReservations.plannedPortions}), 0)` })
      .from(preparedReservations)
      .where(
        and(
          eq(preparedReservations.lotId, lot.id),
          eq(preparedReservations.status, "reserved")
        )
      );
    const reserved = Number(totals[0]?.total ?? 0);
    if (portions > lot.physicalPortions + 1e-9) {
      throw new MealPilotError("Transfer exceeds physical stock", 409, "INSUFFICIENT_PORTIONS");
    }

    const bumpedBatch = await tx
      .update(preparedBatches)
      .set({ revision: sql`${preparedBatches.revision} + 1`, updatedAt: now })
      .where(
        and(
          eq(preparedBatches.id, batchId),
          eq(preparedBatches.revision, input.expectedBatchRevision)
        )
      )
      .returning({ id: preparedBatches.id });
    if (bumpedBatch.length === 0) {
      throw new MealPilotError(
        "This prepared batch changed elsewhere. Reload and try again.",
        409,
        "REVISION_CONFLICT"
      );
    }

    if (Math.abs(portions - lot.physicalPortions) < 1e-9) {
      const updated = await tx
        .update(preparedLots)
        .set({
          storage: input.storage,
          useByDate: input.useByDate?.trim() || lot.useByDate,
          revision: sql`${preparedLots.revision} + 1`,
          updatedAt: now,
        })
        .where(
          and(eq(preparedLots.id, lot.id), eq(preparedLots.revision, input.expectedLotRevision))
        )
        .returning({ id: preparedLots.id });
      if (updated.length === 0) {
        throw new MealPilotError(
          "This prepared lot changed elsewhere. Reload and try again.",
          409,
          "REVISION_CONFLICT"
        );
      }
      if (reserved > 0) {
        const affected = await tx
          .select({ mealGroupId: preparedReservations.mealGroupId })
          .from(preparedReservations)
          .where(
            and(
              eq(preparedReservations.lotId, lot.id),
              eq(preparedReservations.status, "reserved")
            )
          );
        for (const row of affected) {
          await tx.insert(mealConflicts).values({
            mealGroupId: row.mealGroupId,
            kind: "storage_changed",
            message: "Prepared food moved storage after this meal was planned",
            details: JSON.stringify({
              lotId: lot.id,
              plannedStorage: lot.storage,
              currentStorage: input.storage,
            }),
            detectedAt: now,
          });
        }
      }
    } else {
      const unallocated = lot.physicalPortions - reserved;
      if (portions > unallocated + 1e-9) {
        throw new MealPilotError(
          `Only ${Math.max(0, unallocated)} unallocated portions can be split`,
          409,
          "INSUFFICIENT_PORTIONS"
        );
      }
      const updated = await tx
        .update(preparedLots)
        .set({
          physicalPortions: lot.physicalPortions - portions,
          revision: sql`${preparedLots.revision} + 1`,
          updatedAt: now,
        })
        .where(
          and(eq(preparedLots.id, lot.id), eq(preparedLots.revision, input.expectedLotRevision))
        )
        .returning({ id: preparedLots.id });
      if (updated.length === 0) {
        throw new MealPilotError(
          "This prepared lot changed elsewhere. Reload and try again.",
          409,
          "REVISION_CONFLICT"
        );
      }
      await tx.insert(preparedLots).values({
        batchId,
        storage: input.storage,
        physicalPortions: portions,
        useByDate: input.useByDate?.trim() || null,
        revision: 1,
        createdAt: now,
        updatedAt: now,
      });
    }
  });
  return getPreparedBatch(userId, batchId);
}

export async function replaceStationAssignments(
  userId: number,
  mealGroupId: number,
  input: ReplaceStationAssignmentsRequest
): Promise<MealGroupView> {
  const group = await requireMealGroup(mealGroupId, userId);
  if (group.status !== "planned") {
    throw new MealPilotError("This meal is already complete", 409, "ALREADY_CONFIRMED");
  }
  if (!Array.isArray(input.assignments)) {
    throw new MealPilotError("Assignments must be a list", 400, "INVALID_REQUEST");
  }
  const view = await getMealGroup(userId, mealGroupId);
  const dishKeys = new Set(view.dishes.map((dish) =>
    dish.source === "fresh" ? `fresh:${dish.mealPlanId}` : `prepared:${dish.reservationId}`
  ));
  const assignments = input.assignments.map((assignment) => {
    const stationName = assignment.stationName?.trim();
    if (!dishKeys.has(assignment.dishKey) || !stationName) {
      throw new MealPilotError("Station assignment references an invalid dish", 400, "INVALID_REQUEST");
    }
    const start = assignment.startOffsetMinutes;
    const duration = assignment.durationMinutes;
    if (start != null && (!Number.isInteger(start) || start < 0)) {
      throw new MealPilotError("Station start must be zero or more minutes", 400, "INVALID_REQUEST");
    }
    if (duration != null && positiveInteger(duration) == null) {
      throw new MealPilotError("Station duration must be positive", 400, "INVALID_REQUEST");
    }
    const [source, idText] = assignment.dishKey.split(":") as ["fresh" | "prepared", string];
    return {
      source,
      dishId: Number(idText),
      instructionId: assignment.instructionId ?? null,
      stationName,
      startOffsetMinutes: start ?? null,
      durationMinutes: duration ?? null,
    };
  });

  const overlaps: Array<{ stationName: string; first: number; second: number }> = [];
  for (let index = 0; index < assignments.length; index += 1) {
    const first = assignments[index];
    if (first.startOffsetMinutes == null || first.durationMinutes == null) continue;
    for (let next = index + 1; next < assignments.length; next += 1) {
      const second = assignments[next];
      if (
        second.stationName.toLowerCase() !== first.stationName.toLowerCase() ||
        second.startOffsetMinutes == null ||
        second.durationMinutes == null
      ) continue;
      const overlapsInTime =
        first.startOffsetMinutes < second.startOffsetMinutes + second.durationMinutes &&
        second.startOffsetMinutes < first.startOffsetMinutes + first.durationMinutes;
      if (overlapsInTime) {
        overlaps.push({ stationName: first.stationName, first: index, second: next });
      }
    }
  }

  const now = new Date().toISOString();
  await db.transaction(async (tx) => {
    const bumped = await tx
      .update(mealGroups)
      .set({ revision: sql`${mealGroups.revision} + 1`, updatedAt: now })
      .where(and(eq(mealGroups.id, mealGroupId), eq(mealGroups.revision, input.expectedRevision)))
      .returning({ id: mealGroups.id });
    if (bumped.length === 0) {
      throw new MealPilotError(
        "This meal changed elsewhere. Reload and try again.",
        409,
        "REVISION_CONFLICT"
      );
    }
    await tx.delete(mealStationAssignments).where(eq(mealStationAssignments.mealGroupId, mealGroupId));
    await tx
      .update(mealConflicts)
      .set({ resolvedAt: now })
      .where(
        and(
          eq(mealConflicts.mealGroupId, mealGroupId),
          eq(mealConflicts.kind, "station_overlap"),
          isNull(mealConflicts.resolvedAt)
        )
      );
    if (assignments.length > 0) {
      await tx.insert(mealStationAssignments).values(
        assignments.map((assignment) => ({
          mealGroupId,
          mealPlanId: assignment.source === "fresh" ? assignment.dishId : null,
          reservationId: assignment.source === "prepared" ? assignment.dishId : null,
          instructionId: assignment.instructionId,
          stationName: assignment.stationName,
          startOffsetMinutes: assignment.startOffsetMinutes,
          durationMinutes: assignment.durationMinutes,
          createdAt: now,
        }))
      );
    }
    for (const overlap of overlaps) {
      await tx.insert(mealConflicts).values({
        mealGroupId,
        kind: "station_overlap",
        message: `${overlap.stationName} is assigned to overlapping tasks`,
        details: JSON.stringify(overlap),
        detectedAt: now,
      });
    }
  });
  return getMealGroup(userId, mealGroupId);
}

type FreshEffectSnapshot = {
  previousCookedAt: string | null;
  deductions: Array<{ inventoryId: number; quantity: number; name: string }>;
  untracked: string[];
};

function parseFreshEffectSnapshot(value: string): FreshEffectSnapshot {
  const parsed = JSON.parse(value) as Partial<FreshEffectSnapshot>;
  return {
    previousCookedAt:
      typeof parsed.previousCookedAt === "string" ? parsed.previousCookedAt : null,
    deductions: Array.isArray(parsed.deductions)
      ? parsed.deductions.filter(
          (item): item is FreshEffectSnapshot["deductions"][number] =>
            typeof item?.inventoryId === "number" &&
            typeof item?.quantity === "number" &&
            typeof item?.name === "string"
        )
      : [],
    untracked: Array.isArray(parsed.untracked)
      ? parsed.untracked.filter((item): item is string => typeof item === "string")
      : [],
  };
}

export async function confirmMeal(
  userId: number,
  mealGroupId: number,
  input: ConfirmMealRequest
): Promise<MealGroupView> {
  const group = await requireMealGroup(mealGroupId, userId);
  if (!input.idempotencyKey?.trim()) {
    throw new MealPilotError("Idempotency key is required", 400, "INVALID_REQUEST");
  }
  if (!(["as_planned", "adjusted", "skipped"] as const).includes(input.outcome)) {
    throw new MealPilotError("Invalid confirmation outcome", 400, "INVALID_REQUEST");
  }
  if (group.status !== "planned") {
    const prior = await db.query.mealConfirmationCommands.findFirst({
      where: eq(mealConfirmationCommands.idempotencyKey, input.idempotencyKey),
    });
    if (prior?.mealGroupId === mealGroupId) return getMealGroup(userId, mealGroupId);
    throw new MealPilotError("This meal was already reviewed", 409, "ALREADY_CONFIRMED");
  }
  const actualDiners = input.actualDiners ?? group.dinerCount;
  if (positiveInteger(actualDiners) == null) {
    throw new MealPilotError("Actual diners must be a positive whole number", 400, "INVALID_REQUEST");
  }
  const preparedInput = new Map(
    (input.prepared ?? []).map((item) => [item.reservationId, item.consumedPortions])
  );
  const freshInput = new Map((input.fresh ?? []).map((item) => [item.mealPlanId, item]));
  if (
    [...preparedInput.values()].some(
      (portions) => !Number.isFinite(portions) || portions < 0
    )
  ) {
    throw new MealPilotError("Consumed portions cannot be negative", 400, "INVALID_REQUEST");
  }
  const now = new Date().toISOString();

  await db.transaction(async (tx) => {
    const duplicate = await tx.query.mealConfirmationCommands.findFirst({
      where: eq(mealConfirmationCommands.idempotencyKey, input.idempotencyKey),
    });
    if (duplicate) {
      if (duplicate.mealGroupId !== mealGroupId) {
        throw new MealPilotError("Idempotency key was already used", 409, "REVISION_CONFLICT");
      }
      return;
    }
    const current = await tx.query.mealGroups.findFirst({
      where: eq(mealGroups.id, mealGroupId),
    });
    if (!current || current.revision !== input.expectedRevision) {
      throw new MealPilotError(
        "This meal changed elsewhere. Reload and try again.",
        409,
        "REVISION_CONFLICT"
      );
    }
    if (current.status !== "planned") {
      throw new MealPilotError("This meal was already reviewed", 409, "ALREADY_CONFIRMED");
    }
    await tx.insert(mealConfirmationCommands).values({
      mealGroupId,
      userId,
      idempotencyKey: input.idempotencyKey,
      kind: "confirm",
      payload: JSON.stringify({ ...input, previousDinerCount: current.dinerCount }),
      appliedAt: now,
    });

    const reservations = await tx
      .select({
        reservation: preparedReservations,
        lot: preparedLots,
      })
      .from(preparedReservations)
      .innerJoin(preparedLots, eq(preparedReservations.lotId, preparedLots.id))
      .where(
        and(
          eq(preparedReservations.mealGroupId, mealGroupId),
          eq(preparedReservations.status, "reserved")
        )
      );
    for (const row of reservations) {
      const consumed =
        input.outcome === "skipped"
          ? 0
          : input.outcome === "as_planned"
            ? row.reservation.plannedPortions
            : preparedInput.get(row.reservation.id) ?? 0;
      const otherReservedRows = await tx
        .select({ total: sql<number>`coalesce(sum(${preparedReservations.plannedPortions}), 0)` })
        .from(preparedReservations)
        .where(
          and(
            eq(preparedReservations.lotId, row.lot.id),
            eq(preparedReservations.status, "reserved"),
            ne(preparedReservations.id, row.reservation.id)
          )
        );
      const availableForThisMeal =
        row.lot.physicalPortions - Number(otherReservedRows[0]?.total ?? 0);
      if (consumed > availableForThisMeal + 1e-9) {
        throw new MealPilotError(
          `Only ${Math.max(0, availableForThisMeal)} portions of ${row.reservation.sourceStorage} food remain`,
          409,
          "INSUFFICIENT_PORTIONS"
        );
      }
      if (consumed > 0) {
        await tx
          .update(preparedLots)
          .set({
            physicalPortions: row.lot.physicalPortions - consumed,
            revision: sql`${preparedLots.revision} + 1`,
            updatedAt: now,
          })
          .where(eq(preparedLots.id, row.lot.id));
      }
      await tx
        .update(preparedReservations)
        .set({
          consumedPortions: consumed,
          status: consumed > 0 ? "consumed" : "released",
          updatedAt: now,
        })
        .where(eq(preparedReservations.id, row.reservation.id));
    }

    if (input.outcome !== "skipped") {
      const plans = await tx.query.mealPlans.findMany({
        where: eq(mealPlans.mealGroupId, mealGroupId),
      });
      let legacyScale = 1;
      if (current.householdId != null && plans.some((plan) => plan.targetPortions == null)) {
        const [blockRows, memberCountRows] = await Promise.all([
          tx
            .select({
              id: householdMemberBlocks.id,
              userId: householdMemberBlocks.userId,
              scope: householdMemberBlocks.scope,
              date: householdMemberBlocks.date,
              mealType: householdMemberBlocks.mealType,
            })
            .from(householdMemberBlocks)
            .where(eq(householdMemberBlocks.householdId, current.householdId)),
          tx
            .select({ count: sql<number>`count(*)` })
            .from(householdMembers)
            .where(eq(householdMembers.householdId, current.householdId)),
        ]);
        legacyScale = blockingScaleFactor(
          Number(memberCountRows[0]?.count ?? 0),
          blockedMembersForSlot(
            blockRows.map((row) => ({ ...row, scope: row.scope as HouseholdBlockScope })),
            current.date,
            current.mealType
          ).length
        );
      }
      for (const plan of plans) {
        const requested = freshInput.get(plan.id);
        const cooked = input.outcome === "as_planned" ? true : (requested?.cooked ?? true);
        if (!cooked) continue;
        const existingEffect = await tx.query.mealFreshEffects.findFirst({
          where: eq(mealFreshEffects.mealPlanId, plan.id),
        });
        if (existingEffect) {
          if (!plan.cookedAt) {
            await tx.update(mealPlans).set({ cookedAt: now }).where(eq(mealPlans.id, plan.id));
          }
          continue;
        }
        const recipeIngredients = await tx.query.ingredients.findMany({
          where: eq(ingredients.recipeId, plan.recipeId),
          columns: {
            name: true,
            quantity: true,
            unit: true,
            approximate: true,
            catalogIngredientId: true,
          },
        });
        const inventoryRows = await tx
          .select({
            id: inventory.id,
            name: inventory.name,
            unit: inventory.unit,
            quantity: inventory.quantity,
            catalogIngredientId: inventory.catalogIngredientId,
          })
          .from(inventory)
          .where(
            current.householdId != null
              ? eq(inventory.householdId, current.householdId)
              : and(eq(inventory.userId, current.userId), isNull(inventory.householdId))
          );
        const deduction = computeDeductionItems(
          recipeIngredients,
          plan.servings,
          plan.targetPortions == null ? legacyScale : 1
        );
        const deductions: FreshEffectSnapshot["deductions"] = [];
        const untracked = [...deduction.untracked];
        for (const item of deduction.items) {
          const match = matchInventoryRow(item, inventoryRows);
          if (!match) {
            untracked.push(item.name);
            continue;
          }
          await tx
            .update(inventory)
            .set({
              quantity: match.quantity - item.quantity,
              updatedAt: now,
            })
            .where(eq(inventory.id, match.id));
          match.quantity -= item.quantity;
          deductions.push({ inventoryId: match.id, quantity: item.quantity, name: item.name });
        }

        const output = requested?.output ?? {
          fridge: plan.plannedOutputFridge ?? 0,
          freezer: plan.plannedOutputFreezer ?? 0,
        };
        if (
          ![output.fridge, output.freezer].every(
            (value) => Number.isFinite(value) && value >= 0
          )
        ) {
          throw new MealPilotError("Saved output portions cannot be negative", 400, "INVALID_REQUEST");
        }
        let outputBatchId: number | null = null;
        if (output.fridge + output.freezer > 0) {
          const recipe = await tx.query.recipes.findFirst({
            where: eq(recipes.id, plan.recipeId),
            columns: { title: true },
          });
          const [batch] = await tx
            .insert(preparedBatches)
            .values({
              userId,
              householdId: current.householdId,
              recipeId: plan.recipeId,
              title: recipe?.title ?? "Prepared meal",
              cookedAt: now,
              notes: "Saved from a planned meal",
              revision: 1,
              createdAt: now,
              updatedAt: now,
            })
            .returning();
          outputBatchId = batch.id;
          const lots = [
            output.fridge > 0
              ? { storage: "fridge", physicalPortions: output.fridge }
              : null,
            output.freezer > 0
              ? { storage: "freezer", physicalPortions: output.freezer }
              : null,
          ].filter((lot): lot is { storage: string; physicalPortions: number } => lot != null);
          await tx.insert(preparedLots).values(
            lots.map((lot) => ({
              batchId: batch.id,
              storage: lot.storage,
              physicalPortions: lot.physicalPortions,
              revision: 1,
              createdAt: now,
              updatedAt: now,
            }))
          );
        }
        await tx.insert(mealFreshEffects).values({
          mealGroupId,
          mealPlanId: plan.id,
          preparedBatchId: outputBatchId,
          effectSnapshot: JSON.stringify({
            previousCookedAt: plan.cookedAt,
            deductions,
            untracked,
          } satisfies FreshEffectSnapshot),
          appliedAt: now,
        });
        await tx.update(mealPlans).set({ cookedAt: now }).where(eq(mealPlans.id, plan.id));
      }
    } else {
      await tx
        .update(preparedReservations)
        .set({ status: "released", consumedPortions: 0, updatedAt: now })
        .where(
          and(
            eq(preparedReservations.mealGroupId, mealGroupId),
            eq(preparedReservations.status, "reserved")
          )
        );
    }

    const updated = await tx
      .update(mealGroups)
      .set({
        dinerCount: actualDiners,
        status: input.outcome === "skipped" ? "skipped" : "confirmed",
        confirmedAt: now,
        confirmedBy: userId,
        revision: sql`${mealGroups.revision} + 1`,
        updatedAt: now,
      })
      .where(and(eq(mealGroups.id, mealGroupId), eq(mealGroups.revision, input.expectedRevision)))
      .returning({ id: mealGroups.id });
    if (updated.length === 0) {
      throw new MealPilotError(
        "This meal changed elsewhere. Reload and try again.",
        409,
        "REVISION_CONFLICT"
      );
    }
  });
  return getMealGroup(userId, mealGroupId);
}

export async function undoMealConfirmation(
  userId: number,
  mealGroupId: number,
  input: UndoMealConfirmationRequest
): Promise<MealGroupView> {
  const group = await requireMealGroup(mealGroupId, userId);
  if (!input.idempotencyKey?.trim()) {
    throw new MealPilotError("Idempotency key is required", 400, "INVALID_REQUEST");
  }
  if (group.status === "planned") return getMealGroup(userId, mealGroupId);
  const now = new Date().toISOString();
  await db.transaction(async (tx) => {
    const duplicate = await tx.query.mealConfirmationCommands.findFirst({
      where: eq(mealConfirmationCommands.idempotencyKey, input.idempotencyKey),
    });
    if (duplicate) {
      if (duplicate.mealGroupId !== mealGroupId) {
        throw new MealPilotError("Idempotency key was already used", 409, "REVISION_CONFLICT");
      }
      return;
    }
    const current = await tx.query.mealGroups.findFirst({ where: eq(mealGroups.id, mealGroupId) });
    if (!current || current.revision !== input.expectedRevision) {
      throw new MealPilotError(
        "This meal changed elsewhere. Reload and try again.",
        409,
        "REVISION_CONFLICT"
      );
    }
    const confirmation = await tx.query.mealConfirmationCommands.findFirst({
      where: and(
        eq(mealConfirmationCommands.mealGroupId, mealGroupId),
        eq(mealConfirmationCommands.kind, "confirm")
      ),
      orderBy: [desc(mealConfirmationCommands.id)],
    });
    if (!confirmation) {
      throw new MealPilotError("Confirmation record not found", 409, "REVISION_CONFLICT");
    }

    const consumedReservations = await tx.query.preparedReservations.findMany({
      where: and(
        eq(preparedReservations.mealGroupId, mealGroupId),
        eq(preparedReservations.status, "consumed")
      ),
    });
    for (const reservation of consumedReservations) {
      await tx
        .update(preparedLots)
        .set({
          physicalPortions: sql`${preparedLots.physicalPortions} + ${reservation.consumedPortions}`,
          revision: sql`${preparedLots.revision} + 1`,
          updatedAt: now,
        })
        .where(eq(preparedLots.id, reservation.lotId));
    }
    await tx
      .update(preparedReservations)
      .set({ status: "reserved", consumedPortions: 0, updatedAt: now })
      .where(eq(preparedReservations.mealGroupId, mealGroupId));

    const effects = await tx.query.mealFreshEffects.findMany({
      where: eq(mealFreshEffects.mealGroupId, mealGroupId),
    });
    for (const effect of effects) {
      if (effect.preparedBatchId != null) {
        const allocationRows = await tx
          .select({ count: sql<number>`count(*)` })
          .from(preparedReservations)
          .innerJoin(preparedLots, eq(preparedReservations.lotId, preparedLots.id))
          .where(eq(preparedLots.batchId, effect.preparedBatchId));
        if (Number(allocationRows[0]?.count ?? 0) > 0) {
          throw new MealPilotError(
            "Saved portions from this meal are already planned. Remove those allocations before undoing.",
            409,
            "REVISION_CONFLICT"
          );
        }
      }
      const snapshot = parseFreshEffectSnapshot(effect.effectSnapshot);
      for (const deduction of snapshot.deductions) {
        await tx
          .update(inventory)
          .set({
            quantity: sql`${inventory.quantity} + ${deduction.quantity}`,
            updatedAt: now,
          })
          .where(eq(inventory.id, deduction.inventoryId));
      }
      await tx
        .update(mealPlans)
        .set({ cookedAt: snapshot.previousCookedAt })
        .where(eq(mealPlans.id, effect.mealPlanId));
      if (effect.preparedBatchId != null) {
        await tx.delete(preparedBatches).where(eq(preparedBatches.id, effect.preparedBatchId));
      }
      await tx.delete(mealFreshEffects).where(eq(mealFreshEffects.id, effect.id));
    }

    let previousDinerCount = current.dinerCount;
    try {
      const payload = JSON.parse(confirmation.payload) as { previousDinerCount?: unknown };
      if (positiveInteger(payload.previousDinerCount) != null) {
        previousDinerCount = Number(payload.previousDinerCount);
      }
    } catch {
      // Preserve the current count when an old command payload is unreadable.
    }
    const updated = await tx
      .update(mealGroups)
      .set({
        dinerCount: previousDinerCount,
        status: "planned",
        confirmedAt: null,
        confirmedBy: null,
        revision: sql`${mealGroups.revision} + 1`,
        updatedAt: now,
      })
      .where(and(eq(mealGroups.id, mealGroupId), eq(mealGroups.revision, input.expectedRevision)))
      .returning({ id: mealGroups.id });
    if (updated.length === 0) {
      throw new MealPilotError(
        "This meal changed elsewhere. Reload and try again.",
        409,
        "REVISION_CONFLICT"
      );
    }
    await tx.insert(mealConfirmationCommands).values({
      mealGroupId,
      userId,
      idempotencyKey: input.idempotencyKey,
      kind: "undo",
      payload: JSON.stringify(input),
      reversesCommandId: confirmation.id,
      appliedAt: now,
    });
  });
  return getMealGroup(userId, mealGroupId);
}

export async function listMealReviews(userId: number, before: string): Promise<MealGroupView[]> {
  if (!isIsoInstant(before)) {
    throw new MealPilotError("Invalid review cutoff", 400, "INVALID_REQUEST");
  }
  const scope = await currentMealScope(userId);
  const groups = await db
    .select()
    .from(mealGroups)
    .where(
      and(
        scope.householdId != null
          ? eq(mealGroups.householdId, scope.householdId)
          : and(eq(mealGroups.userId, userId), isNull(mealGroups.householdId)),
        eq(mealGroups.status, "planned"),
        lt(mealGroups.serveAt, new Date(before).toISOString())
      )
    )
    .orderBy(mealGroups.serveAt);
  return buildMealGroupViews(groups);
}

export type ExternalTimingResult =
  | { status: "applied"; mealGroup: MealGroupView }
  | { status: "version_conflict" | "historical" | "not_found" };

export async function applyExternalMealTiming(input: {
  mealGroupId: number;
  expectedRevision: number;
  serveAt: string;
  durationOverrideMinutes: number | null;
  actorUserId: number;
}): Promise<ExternalTimingResult> {
  const group = await authorizedMealGroup(input.mealGroupId, input.actorUserId);
  if (!group) return { status: "not_found" };
  if (group.status !== "planned") return { status: "historical" };
  const date = localDateKey(input.serveAt, group.timezone);
  if (!date) return { status: "version_conflict" };
  try {
    const mealGroup = await updateMealGroup(input.actorUserId, input.mealGroupId, {
      expectedRevision: input.expectedRevision,
      date,
      serveAt: input.serveAt,
      durationOverrideMinutes: input.durationOverrideMinutes,
    });
    return { status: "applied", mealGroup };
  } catch (error) {
    if (error instanceof MealPilotError && error.code === "REVISION_CONFLICT") {
      return { status: "version_conflict" };
    }
    throw error;
  }
}

export async function applyExternalDefrostTiming(input: {
  mealGroupId: number;
  expectedRevision: number;
  defrostAtOverride: string;
  actorUserId: number;
}): Promise<ExternalTimingResult> {
  const group = await authorizedMealGroup(input.mealGroupId, input.actorUserId);
  if (!group) return { status: "not_found" };
  if (group.status !== "planned") return { status: "historical" };
  try {
    const mealGroup = await updateMealGroup(input.actorUserId, input.mealGroupId, {
      expectedRevision: input.expectedRevision,
      defrostAtOverride: input.defrostAtOverride,
    });
    return { status: "applied", mealGroup };
  } catch (error) {
    if (error instanceof MealPilotError && error.code === "REVISION_CONFLICT") {
      return { status: "version_conflict" };
    }
    throw error;
  }
}
