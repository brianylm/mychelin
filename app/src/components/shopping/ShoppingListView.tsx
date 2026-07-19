"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@radix-ui/themes";

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
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [dateRange, setDateRange] = useState<DateRange>(() => initialDateRange || getWeekRange());
  const [summary, setSummary] = useState<ShoppingSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

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
        setItems(data.items || []);
        setSummary(data.summary || null);
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

  const toggleCheck = (key: string) => {
    setCheckedItems((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

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
              automatically — minus what you already have in the fridge.
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
                        onClick={() => toggleCheck(item.key)}
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
      </div>
    </div>
  );
}
