// Shared-inventory deduction math (cook-time confirm-deduct and
// shopping moves). Pure and unit-tested (household-inventory.test.ts);
// API routes do the DB reads/writes and call into here for matching and
// scaling so the trap-prone math lives in exactly one place.

export interface DeductionSource {
  name: string;
  quantity?: number | null;
  unit?: string | null;
  approximate?: boolean | null;
  catalogIngredientId?: number | null;
}

export interface DeductionItem {
  name: string;
  unit: string;
  quantity: number;
  catalogIngredientId: number | null;
}

export interface InventoryRowLike {
  id: number;
  name: string;
  unit: string;
  quantity: number;
  catalogIngredientId: number | null;
}

export function normalizeItemName(value: string | null | undefined): string {
  return (value || "").trim().toLowerCase();
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

// Scales a recipe's ingredients into proposed deduction quantities:
// quantity × plan servings multiplier × eater scale (blocking). Items
// without a usable numeric quantity (approximate "agak-agak" amounts,
// missing quantities) can't be deducted — they are returned separately
// so the UI can list them as "not tracked".
export function computeDeductionItems(
  ingredients: DeductionSource[],
  servingsMultiplier: number,
  eaterScale: number
): { items: DeductionItem[]; untracked: string[] } {
  const items: DeductionItem[] = [];
  const untracked: string[] = [];
  const servings =
    Number.isFinite(servingsMultiplier) && servingsMultiplier > 0
      ? servingsMultiplier
      : 1;
  const scale =
    Number.isFinite(eaterScale) && eaterScale >= 0 && eaterScale <= 1
      ? eaterScale
      : 1;

  for (const ingredient of ingredients) {
    const name = (ingredient.name || "").trim();
    if (!name) continue;
    const hasNumeric =
      typeof ingredient.quantity === "number" &&
      Number.isFinite(ingredient.quantity) &&
      ingredient.quantity > 0 &&
      !ingredient.approximate;
    if (!hasNumeric) {
      untracked.push(name);
      continue;
    }
    const quantity = round2(ingredient.quantity! * servings * scale);
    if (quantity <= 0) {
      untracked.push(name);
      continue;
    }
    items.push({
      name,
      unit: (ingredient.unit || "").trim(),
      quantity,
      catalogIngredientId: ingredient.catalogIngredientId ?? null,
    });
  }
  return { items, untracked };
}

// Matches a deduction item against shared inventory rows: catalog id
// wins, otherwise case-insensitive name (unit must match too, so "rice
// 200 g" never deducts from "rice 2 cups"). Returns the matched row or
// null — unmatched ingredients are skipped silently by the caller and
// surfaced as "not tracked".
export function matchInventoryRow(
  item: Pick<DeductionItem, "name" | "unit" | "catalogIngredientId">,
  rows: InventoryRowLike[]
): InventoryRowLike | null {
  if (item.catalogIngredientId != null) {
    const byCatalog = rows.find(
      (row) =>
        row.catalogIngredientId === item.catalogIngredientId &&
        normalizeItemName(row.unit) === normalizeItemName(item.unit)
    );
    if (byCatalog) return byCatalog;
  }
  const name = normalizeItemName(item.name);
  const unit = normalizeItemName(item.unit);
  return (
    rows.find(
      (row) =>
        normalizeItemName(row.name) === name &&
        normalizeItemName(row.unit) === unit
    ) ?? null
  );
}

export interface DeductionResult {
  inventoryId: number;
  name: string;
  unit: string;
  deducted: number;
  remaining: number;
  // Zero/negative stock is a warning, never a block (packet decision 4).
  wentNegative: boolean;
}

// Pure application of confirmed deductions to matched rows: returns the
// per-row outcomes (the route persists them). Quantities may go
// negative — that is the intended warning state.
export function applyDeductions(
  confirmations: Array<DeductionItem & { inventoryId: number }>,
  rows: InventoryRowLike[]
): DeductionResult[] {
  const byId = new Map(rows.map((row) => [row.id, row]));
  const results: DeductionResult[] = [];
  for (const confirmation of confirmations) {
    if (!Number.isFinite(confirmation.quantity) || confirmation.quantity <= 0) {
      continue;
    }
    const row = byId.get(confirmation.inventoryId);
    if (!row) continue;
    const remaining = round2(row.quantity - confirmation.quantity);
    results.push({
      inventoryId: row.id,
      name: row.name,
      unit: row.unit,
      deducted: confirmation.quantity,
      remaining,
      wentNegative: remaining <= 0,
    });
  }
  return results;
}
