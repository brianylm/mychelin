"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@radix-ui/themes";
import { Check, RefreshCw } from "lucide-react";
import { EmptyState, PageHeader, Skeleton } from "@/components/ui";

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
    <div className="flex-1 overflow-y-auto bg-ui-bg pb-20 md:pb-8">
      <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        <PageHeader
          eyebrow="Meal plan"
          title="Shopping list"
          description="Ingredients are combined across planned dishes, then reduced by matching fridge and pantry stock."
        />

        <section className="mt-5 grid gap-3 border-y border-ui-border py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <div className="grid min-w-0 grid-cols-2 gap-3">
            <label className="grid min-w-0 gap-1 text-xs font-semibold text-ui-muted">
              From
              <input
                type="date"
                value={dateRange.start}
                onChange={(event) =>
                  setDateRange((range) => ({ ...range, start: event.target.value }))
                }
                className="h-11 w-full min-w-0 max-w-full appearance-none rounded-lg border border-ui-border-strong bg-ui-surface-raised px-2 text-[12px] text-ui-text outline-none focus:border-ui-accent focus:ring-2 focus:ring-ui-focus-soft sm:px-3 sm:text-sm"
              />
            </label>
            <label className="grid min-w-0 gap-1 text-xs font-semibold text-ui-muted">
              To
              <input
                type="date"
                value={dateRange.end}
                onChange={(event) =>
                  setDateRange((range) => ({ ...range, end: event.target.value }))
                }
                className="h-11 w-full min-w-0 max-w-full appearance-none rounded-lg border border-ui-border-strong bg-ui-surface-raised px-2 text-[12px] text-ui-text outline-none focus:border-ui-accent focus:ring-2 focus:ring-ui-focus-soft sm:px-3 sm:text-sm"
              />
            </label>
          </div>
          <Button className="h-11" size="2" variant="soft" onClick={fetchList}>
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Refresh
          </Button>
        </section>

        {summary && (
          <dl className="mt-5 grid grid-cols-3 divide-x divide-ui-border border-y border-ui-border">
            {[
              ["Meals", summary.mealCount],
              ["Recipes", summary.recipeCount],
              ["To buy", summary.itemCount],
            ].map(([label, value]) => (
              <div key={String(label)} className="min-w-0 px-3 py-3 text-center sm:text-left">
                <dt className="truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-ui-muted">
                  {label}
                </dt>
                <dd className="mt-1 text-lg font-semibold tabular-nums text-ui-text">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        )}

        {totalItems > 0 && (
          <div className="mt-5 border-b border-ui-border pb-4">
            <div className="mb-2 flex items-center justify-between text-xs font-medium text-ui-muted">
              <span>Shopping progress</span>
              <span className="tabular-nums">
                {checkedCount}/{totalItems}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-ui-surface-subtle">
              <div
                className="h-full rounded-full bg-ui-accent transition-[width] duration-300"
                style={{
                  width: `${totalItems > 0 ? (checkedCount / totalItems) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
        )}

        {loading ? (
          <div className="mt-6 space-y-5">
            {[0, 1, 2].map((item) => (
              <div key={item}>
                <Skeleton className="h-4 w-24" />
                <Skeleton className="mt-3 h-14 w-full" />
                <Skeleton className="mt-1 h-14 w-full" />
              </div>
            ))}
          </div>
        ) : error ? (
          <p className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        ) : totalItems === 0 ? (
          <EmptyState
            className="mt-6 border-t border-ui-border"
            title="Nothing to buy"
            description="Add recipes to your meal plan. Ingredients will appear here automatically, minus matching items already in your fridge or pantry."
          />
        ) : (
          <div className="mt-7 space-y-7">
            {Object.entries(grouped).map(([category, categoryItems]) => (
              <section key={category}>
                <h2 className="flex min-h-11 items-center border-b border-ui-border text-xs font-semibold uppercase tracking-[0.14em] text-ui-muted">
                  {category}
                </h2>
                <div className="divide-y divide-ui-border">
                  {categoryItems.map((item) => {
                    const checked = checkedItems.has(item.key);
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => toggleCheck(item.key)}
                        className={`grid min-h-14 w-full grid-cols-[1.5rem_minmax(0,1fr)_auto] items-center gap-3 px-1 py-3 text-left transition-colors duration-200 hover:bg-ui-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ui-focus ${
                          checked ? "bg-ui-success-soft" : ""
                        }`}
                        aria-pressed={checked}
                      >
                        <span
                          className={`flex h-5 w-5 items-center justify-center rounded border-2 ${
                            checked
                              ? "border-ui-success bg-ui-success text-white"
                              : "border-ui-border-strong"
                          }`}
                          aria-hidden="true"
                        >
                          {checked && <Check className="h-3.5 w-3.5" />}
                        </span>
                        <span
                          className={`min-w-0 break-words text-sm ${
                            checked ? "text-ui-muted line-through" : "text-ui-text"
                          }`}
                        >
                          {item.name}
                        </span>
                        <span className="max-w-[9rem] text-right">
                          <span
                            className={`block break-words text-sm font-semibold tabular-nums ${
                              checked ? "text-ui-muted" : "text-ui-text"
                            }`}
                          >
                            {item.quantityLabel}
                          </span>
                          {item.quantityOnHand > 0 && item.quantityToBuy != null && (
                            <span className="block text-[10px] leading-4 text-ui-muted">
                              {item.quantityOnHand} {item.unit} on hand
                            </span>
                          )}
                          {item.approximate && (
                            <span className="block text-[10px] leading-4 text-ui-muted">
                              Check amount
                            </span>
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
