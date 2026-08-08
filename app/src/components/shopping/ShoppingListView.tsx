"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@radix-ui/themes";
import { useToast } from "@/context/ToastContext";

interface ShoppingItem {
  key: string;
  name: string;
  category: string | null;
  quantityNeeded: number | null;
  quantityOnHand: number;
  quantityToBuy: number | null;
  quantityLabel: string;
  unit: string;
  approximate: boolean;
  sourceMealCount: number;
  catalogIngredientId?: number | null;
  // Household mode only (server-persisted shared state).
  ticked?: boolean;
  tickedByName?: string | null;
  manual?: boolean;
}

interface MovedItem {
  key: string;
  name: string;
  unit: string;
  quantity: number | null;
  movedByName: string | null;
  movedAt: string;
}

interface ShoppingSummary {
  startDate: string;
  endDate: string;
  mealCount: number;
  recipeCount: number;
  itemCount: number;
}

interface DateRange {
  start: string;
  end: string;
}

interface ShoppingListViewProps {
  initialDateRange?: DateRange;
}

function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return year + "-" + month + "-" + day;
}

function getWeekRange(): DateRange {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - now.getDay() + 1);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return {
    start: toDateKey(monday),
    end: toDateKey(sunday),
  };
}

export function ShoppingListView({ initialDateRange }: ShoppingListViewProps) {
  const { addToast } = useToast();
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [movedItems, setMovedItems] = useState<MovedItem[]>([]);
  const [householdName, setHouseholdName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [dateRange, setDateRange] = useState<DateRange>(() => initialDateRange || getWeekRange());
  const [summary, setSummary] = useState<ShoppingSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Household: move-to-inventory confirm sheet (step 2 of the 2-step
  // flow), with editable quantities before confirming.
  const [moveSheetOpen, setMoveSheetOpen] = useState(false);
  const [moveDrafts, setMoveDrafts] = useState<Record<string, string>>({});
  const [moving, setMoving] = useState(false);
  const [addDraft, setAddDraft] = useState({ name: "", quantity: "", unit: "" });
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    if (!initialDateRange) return;
    setDateRange(initialDateRange);
    setCheckedItems(new Set());
  }, [initialDateRange]);

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/shopping-list?startDate=${dateRange.start}&endDate=${dateRange.end}`
      );
      const data = await res.json();
      if (res.ok) {
        const list: ShoppingItem[] = data.items || [];
        setItems(list);
        setMovedItems(Array.isArray(data.movedItems) ? data.movedItems : []);
        setHouseholdName(data.household?.name ?? null);
        setSummary(data.summary || null);
        if (data.household) {
          // Shared list: ticks are server state, not local taps.
          setCheckedItems(new Set(list.filter((i) => i.ticked).map((i) => i.key)));
        }
      } else {
        setError(data.error || "Failed to generate list");
      }
    } catch {
      setError("Failed to fetch shopping list");
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const toggleCheck = (item: ShoppingItem) => {
    const willCheck = !checkedItems.has(item.key);
    // Solo mode: purely local, exactly as before.
    if (!householdName) {
      setCheckedItems((prev) => {
        const next = new Set(prev);
        if (next.has(item.key)) next.delete(item.key);
        else next.add(item.key);
        return next;
      });
      return;
    }
    // Household mode: persist the shared tick (step 1 — never touches
    // inventory on its own).
    setCheckedItems((prev) => {
      const next = new Set(prev);
      if (willCheck) next.add(item.key);
      else next.delete(item.key);
      return next;
    });
    fetch("/api/shopping-list/tick", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key: item.key,
        name: item.name,
        unit: item.unit,
        category: item.category,
        quantity: item.quantityToBuy ?? item.quantityNeeded,
        approximate: item.approximate,
        catalogIngredientId: item.catalogIngredientId ?? null,
        ticked: willCheck,
      }),
    }).catch(() => {
      addToast("Failed to save tick — try again", "error");
      setCheckedItems((prev) => {
        const next = new Set(prev);
        if (willCheck) next.delete(item.key);
        else next.add(item.key);
        return next;
      });
    });
  };

  const addManualItem = useCallback(async () => {
    const name = addDraft.name.trim();
    if (!name) return;
    try {
      const res = await fetch("/api/shopping-list/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          quantity: addDraft.quantity ? parseFloat(addDraft.quantity) : null,
          unit: addDraft.unit.trim(),
        }),
      });
      if (res.ok) {
        setAddDraft({ name: "", quantity: "", unit: "" });
        setIsAdding(false);
        addToast("Item added to the shared list", "success");
        await fetchList();
      } else {
        const data = await res.json().catch(() => ({}));
        addToast(data.error || "Failed to add item", "error");
      }
    } catch {
      addToast("Failed to add item", "error");
    }
  }, [addDraft, addToast, fetchList]);

  const tickedItems = items.filter((i) => checkedItems.has(i.key));

  const openMoveSheet = () => {
    const drafts: Record<string, string> = {};
    for (const item of tickedItems) {
      const qty = item.quantityToBuy ?? item.quantityNeeded;
      drafts[item.key] = qty != null ? String(Math.round(qty * 100) / 100) : "";
    }
    setMoveDrafts(drafts);
    setMoveSheetOpen(true);
  };

  const confirmMove = useCallback(async () => {
    if (moving) return;
    setMoving(true);
    try {
      const overrides: Record<string, { quantity: number | null; unit?: string }> = {};
      for (const item of tickedItems) {
        const raw = (moveDrafts[item.key] ?? "").trim();
        const parsed = raw ? parseFloat(raw) : null;
        overrides[item.key] = {
          quantity: parsed != null && Number.isFinite(parsed) ? parsed : null,
        };
      }
      const res = await fetch("/api/shopping-list/move-to-inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ overrides }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to move items");
      const movedCount = Array.isArray(data.moved) ? data.moved.length : 0;
      addToast(
        movedCount > 0
          ? `Moved ${movedCount} item${movedCount === 1 ? "" : "s"} to inventory`
          : "Nothing new to move",
        "success"
      );
      setMoveSheetOpen(false);
      await fetchList();
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Failed to move items", "error");
    } finally {
      setMoving(false);
    }
  }, [moving, tickedItems, moveDrafts, addToast, fetchList]);

  // Group by category
  const grouped = items.reduce<Record<string, ShoppingItem[]>>(
    (acc, item) => {
      const cat = item.category || "Other";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(item);
      return acc;
    },
    {}
  );

  const totalItems = items.length;
  const checkedCount = checkedItems.size;

  return (
    <div className="flex-1 overflow-y-auto bg-surface pb-20 md:pb-6">
      <div className="mx-auto max-w-3xl px-4 py-6">
        {/* Header */}
        <div className="mb-4">
          <h2 className="text-base font-semibold">Shopping List</h2>
          <p className="text-xs text-neutral-500">
            Based on your meal plan, grouped by ingredient and adjusted for matching inventory.
            {householdName && (
              <span className="ml-2 rounded-full bg-[#800020]/10 px-2 py-0.5 text-[10px] font-semibold text-[#800020]">
                Shared with {householdName}
              </span>
            )}
          </p>
        </div>

        {/* Date range picker */}
        <div className="mb-4 grid gap-3 rounded-2xl border border-neutral-200 bg-white p-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <div className="grid min-w-0 gap-2 sm:grid-cols-2">
            <label className="min-w-0 text-xs font-medium text-neutral-500">
              <span className="mb-1 block">From</span>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) =>
                  setDateRange((r) => ({ ...r, start: e.target.value }))
                }
                className="w-full min-w-0 rounded-lg border border-neutral-200 px-2 py-1.5 text-[13px] outline-none focus:border-neutral-400"
              />
            </label>
            <label className="min-w-0 text-xs font-medium text-neutral-500">
              <span className="mb-1 block">To</span>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) =>
                  setDateRange((r) => ({ ...r, end: e.target.value }))
                }
                className="w-full min-w-0 rounded-lg border border-neutral-200 px-2 py-1.5 text-[13px] outline-none focus:border-neutral-400"
              />
            </label>
          </div>
          <Button size="1" variant="soft" onClick={fetchList}>
            Refresh
          </Button>
        </div>

        {/* Summary */}
        {summary && (
          <div className="mb-4 grid gap-2 sm:grid-cols-3">
            <div className="rounded-2xl border border-neutral-200 bg-white p-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-400">Meals</p>
              <p className="mt-1 text-lg font-semibold text-neutral-900">{summary.mealCount}</p>
            </div>
            <div className="rounded-2xl border border-neutral-200 bg-white p-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-400">Recipes</p>
              <p className="mt-1 text-lg font-semibold text-neutral-900">{summary.recipeCount}</p>
            </div>
            <div className="rounded-2xl border border-neutral-200 bg-white p-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-400">To buy</p>
              <p className="mt-1 text-lg font-semibold text-neutral-900">{summary.itemCount}</p>
            </div>
          </div>
        )}

        {/* Progress */}
        {totalItems > 0 && (
          <div className="mb-4 rounded-2xl border border-neutral-200 bg-white p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium text-neutral-500">
                Progress
              </span>
              <span className="text-xs tabular-nums text-neutral-500">
                {checkedCount}/{totalItems}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-neutral-100">
              <div
                className="h-full rounded-full bg-[#800020]/50 transition-all duration-300"
                style={{
                  width: `${totalItems > 0 ? (checkedCount / totalItems) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Household: move ticked to inventory (step 2) */}
        {householdName && checkedCount > 0 && (
          <div className="mb-4">
            <button
              type="button"
              onClick={openMoveSheet}
              className="w-full rounded-2xl bg-[#800020] px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-[#6b001b]"
            >
              Move {checkedCount} ticked item{checkedCount === 1 ? "" : "s"} to inventory
            </button>
          </div>
        )}

        {/* Household: manual add */}
        {householdName && (
          <div className="mb-4">
            {isAdding ? (
              <div className="rounded-2xl border border-neutral-200 bg-white p-4">
                <h3 className="mb-3 text-sm font-semibold">Add to shared list</h3>
                <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
                  <input
                    value={addDraft.name}
                    onChange={(e) => setAddDraft((d) => ({ ...d, name: e.target.value }))}
                    placeholder="Item name"
                    aria-label="Item name"
                    className="rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm outline-none focus:border-[#800020]/45"
                    autoFocus
                  />
                  <input
                    value={addDraft.quantity}
                    onChange={(e) => setAddDraft((d) => ({ ...d, quantity: e.target.value }))}
                    placeholder="Qty"
                    type="number"
                    aria-label="Quantity"
                    className="w-24 rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm outline-none focus:border-[#800020]/45"
                  />
                  <input
                    value={addDraft.unit}
                    onChange={(e) => setAddDraft((d) => ({ ...d, unit: e.target.value }))}
                    placeholder="Unit"
                    aria-label="Unit"
                    className="w-24 rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm outline-none focus:border-[#800020]/45"
                  />
                </div>
                <div className="mt-3 flex gap-2">
                  <Button size="2" variant="solid" onClick={addManualItem} disabled={!addDraft.name.trim()}>
                    Add
                  </Button>
                  <Button size="2" variant="soft" color="gray" onClick={() => setIsAdding(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsAdding(true)}
                className="w-full rounded-2xl border border-dashed border-neutral-300 px-4 py-3 text-sm font-medium text-neutral-500 transition hover:border-[#800020]/40 hover:text-[#800020]"
              >
                + Add an item manually
              </button>
            )}
          </div>
        )}

        {/* Content */}
        {loading ? (
          <p className="py-12 text-center text-sm text-neutral-500">
            Generating shopping list...
          </p>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-center">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        ) : totalItems === 0 ? (
          <div className="py-12 text-center">
            <p className="text-3xl">🛒</p>
            <p className="mt-2 text-sm font-medium text-neutral-700">
              Nothing to buy!
            </p>
            <p className="mt-1 text-xs text-neutral-500">
              Add recipes to your meal plan and items will appear here
              automatically — minus what you already have in inventory.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(grouped).map(([category, catItems]) => (
              <div key={category}>
                <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
                  {category}
                </h3>
                <div className="space-y-1">
                  {catItems.map((item) => {
                    const checked = checkedItems.has(item.key);
                    return (
                      <button
                        key={item.key}
                        onClick={() => toggleCheck(item)}
                        className={`flex w-full items-center gap-3 rounded-xl border bg-white px-4 py-3 text-left transition-all ${
                          checked
                            ? "border-green-200 bg-green-50/50"
                            : "border-neutral-200 hover:border-neutral-300"
                        }`}
                      >
                        {/* Checkbox */}
                        <div
                          className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                            checked
                              ? "border-green-500 bg-green-500"
                              : "border-neutral-300"
                          }`}
                        >
                          {checked && (
                            <svg
                              className="h-3 w-3 text-white"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={3}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          )}
                        </div>

                        {/* Item info */}
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-sm ${
                              checked
                                ? "text-neutral-400 line-through"
                                : "text-neutral-800"
                            }`}
                          >
                            {item.name}
                          </p>
                          {checked && householdName && item.tickedByName && (
                            <p className="text-[10px] text-neutral-400">
                              Bought by {item.tickedByName}
                            </p>
                          )}
                        </div>

                        {/* Quantity */}
                        <div className="text-right">
                          <p
                            className={`text-sm font-medium tabular-nums ${
                              checked ? "text-neutral-400" : "text-neutral-800"
                            }`}
                          >
                            {item.quantityLabel}
                          </p>
                          {item.quantityOnHand > 0 && item.quantityToBuy != null && (
                            <p className="text-[10px] text-neutral-400">
                              {item.quantityOnHand} {item.unit} on hand
                            </p>
                          )}
                          {item.approximate && (
                            <p className="text-[10px] text-neutral-400">
                              Check amount while shopping
                            </p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Already moved to inventory — shown as such, never re-pushed */}
        {movedItems.length > 0 && (
          <div className="mt-6">
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-400">
              Moved to inventory
            </h3>
            <div className="space-y-1">
              {movedItems.map((item) => (
                <div
                  key={item.key}
                  className="flex items-center gap-3 rounded-xl border border-neutral-100 bg-neutral-50/60 px-4 py-2.5"
                >
                  <span className="text-green-600">✓</span>
                  <p className="min-w-0 flex-1 truncate text-sm text-neutral-400">
                    {item.name}
                    {item.quantity != null && (
                      <span className="ml-1 tabular-nums">
                        {item.quantity} {item.unit}
                      </span>
                    )}
                  </p>
                  {item.movedByName && (
                    <p className="text-[10px] text-neutral-400">by {item.movedByName}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Move-to-inventory confirm sheet (edit before confirm) */}
      {moveSheetOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
          <div className="w-full max-w-md rounded-t-3xl bg-white p-5 sm:rounded-3xl">
            <h3 className="text-base font-semibold text-neutral-900">
              Move to inventory
            </h3>
            <p className="mt-1 text-xs text-neutral-500">
              Check the amounts before they land in the shared inventory.
            </p>
            <div className="mt-4 max-h-80 space-y-2 overflow-y-auto">
              {tickedItems.map((item) => (
                <div key={item.key} className="flex items-center gap-3">
                  <p className="min-w-0 flex-1 truncate text-sm text-neutral-800">
                    {item.name}
                  </p>
                  <input
                    type="number"
                    value={moveDrafts[item.key] ?? ""}
                    onChange={(e) =>
                      setMoveDrafts((d) => ({ ...d, [item.key]: e.target.value }))
                    }
                    placeholder="Qty"
                    aria-label={`Quantity for ${item.name}`}
                    className="w-24 rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm outline-none focus:border-[#800020]/45"
                  />
                  <span className="w-12 text-xs text-neutral-500">{item.unit}</span>
                </div>
              ))}
            </div>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={confirmMove}
                disabled={moving}
                className="flex-1 rounded-xl bg-[#800020] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#6b001b] disabled:opacity-40"
              >
                {moving ? "Moving..." : "Confirm move"}
              </button>
              <button
                type="button"
                onClick={() => setMoveSheetOpen(false)}
                disabled={moving}
                className="rounded-xl border border-neutral-200 px-4 py-3 text-sm font-medium text-neutral-600"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
