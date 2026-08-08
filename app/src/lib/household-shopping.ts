// Shared shopping-list state helpers: tick → inventory idempotency and
// the move-to-inventory plan. Pure and unit-tested
// (household-shopping.test.ts); the routes do DB IO.
//
// The 2-step flow (packet decision 6): ticking only marks bought
// (ticked_at). A separate explicit action moves ticked rows into the
// shared inventory and stamps moved_at. Idempotency lives here:
// partitionForMove only ever returns rows where moved_at is NULL, so a
// second push physically cannot double-add.

export interface ShoppingStateRow {
  id: number;
  itemKey: string;
  name: string;
  unit: string;
  category: string | null;
  quantity: number | null;
  approximate: boolean;
  source: string; // "generated" | "manual"
  catalogIngredientId: number | null;
  tickedAt: string | null;
  tickedBy: number | null;
  movedAt: string | null;
  movedBy: number | null;
}

export interface MoveOverride {
  quantity?: number | null;
  unit?: string;
}

export interface MovePlanItem {
  stateId: number;
  itemKey: string;
  name: string;
  unit: string;
  category: string | null;
  quantity: number | null; // null = unknown amount (approximate); UI edits before confirming
  catalogIngredientId: number | null;
}

// Splits a household's shopping-list rows into what a move would push
// now vs what is already in inventory (shown as such, never re-pushed).
export function partitionForMove(rows: ShoppingStateRow[]): {
  pending: ShoppingStateRow[];
  alreadyMoved: ShoppingStateRow[];
} {
  const pending: ShoppingStateRow[] = [];
  const alreadyMoved: ShoppingStateRow[] = [];
  for (const row of rows) {
    if (row.movedAt) {
      alreadyMoved.push(row);
    } else if (row.tickedAt) {
      pending.push(row);
    }
  }
  return { pending, alreadyMoved };
}

// Builds the actual inventory additions from the pending rows, applying
// the cook's edit-before-confirm overrides (keyed by itemKey). Rows
// with no quantity anywhere (approximate and never edited) are dropped
// from the push and returned in `skipped` so the UI can say why.
export function buildMovePlan(
  pending: ShoppingStateRow[],
  overrides: Record<string, MoveOverride> = {}
): { moves: MovePlanItem[]; skipped: ShoppingStateRow[] } {
  const moves: MovePlanItem[] = [];
  const skipped: ShoppingStateRow[] = [];
  for (const row of pending) {
    const override = overrides[row.itemKey];
    const quantity = override?.quantity ?? row.quantity;
    const unit = override?.unit ?? row.unit;
    if (quantity == null || !Number.isFinite(quantity) || quantity <= 0) {
      skipped.push(row);
      continue;
    }
    moves.push({
      stateId: row.id,
      itemKey: row.itemKey,
      name: row.name,
      unit,
      category: row.category,
      quantity,
      catalogIngredientId: row.catalogIngredientId,
    });
  }
  return { moves, skipped };
}

// Groups moves into inventory upserts: an existing shared row matched by
// catalog id (+unit) or case-insensitive name (+unit) gets its quantity
// incremented; anything else becomes a new row. Matching rules mirror
// household-inventory.matchInventoryRow so deduction and restock agree
// on what "the same item" means.
export function groupMovesAgainstInventory<T extends { name: string; unit: string; catalogIngredientId: number | null }>(
  moves: Array<T & { quantity: number }>,
  inventoryRows: Array<{ id: number; name: string; unit: string; quantity: number; catalogIngredientId: number | null }>
): {
  increments: Array<{ inventoryId: number; add: number; names: string[] }>;
  inserts: Array<T & { quantity: number }>;
} {
  const normalize = (v: string) => v.trim().toLowerCase();
  const increments = new Map<number, { inventoryId: number; add: number; names: string[] }>();
  const inserts: Array<T & { quantity: number }> = [];

  for (const move of moves) {
    const match =
      (move.catalogIngredientId != null
        ? inventoryRows.find(
            (row) =>
              row.catalogIngredientId === move.catalogIngredientId &&
              normalize(row.unit) === normalize(move.unit)
          )
        : undefined) ??
      inventoryRows.find(
        (row) =>
          normalize(row.name) === normalize(move.name) &&
          normalize(row.unit) === normalize(move.unit)
      );
    if (match) {
      const entry = increments.get(match.id) ?? {
        inventoryId: match.id,
        add: 0,
        names: [],
      };
      entry.add += move.quantity;
      entry.names.push(move.name);
      increments.set(match.id, entry);
    } else {
      inserts.push(move);
    }
  }
  return { increments: [...increments.values()], inserts };
}
