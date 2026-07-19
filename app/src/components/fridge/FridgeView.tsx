"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@radix-ui/themes";
import type { LucideIcon } from "lucide-react";
import { Package, Plus, Refrigerator, Snowflake, Trash2, Warehouse } from "lucide-react";
import { EmptyState, PageHeader, Skeleton } from "@/components/ui";
import { useToast } from "@/context/ToastContext";
import { cn } from "@/lib/utils";

interface InventoryItem {
  id: number;
  name: string;
  quantity: number;
  unit: string;
  location: string | null;
  expiryDate: string | null;
  updatedAt: string;
}

type LocationFilter = "all" | "fridge" | "freezer" | "pantry";

const LOCATIONS: { id: LocationFilter; label: string; icon: LucideIcon }[] = [
  { id: "all", label: "All", icon: Package },
  { id: "fridge", label: "Fridge", icon: Refrigerator },
  { id: "freezer", label: "Freezer", icon: Snowflake },
  { id: "pantry", label: "Pantry", icon: Warehouse },
];

function isExpiringSoon(expiryDate: string | null): boolean {
  if (!expiryDate) return false;
  const diff = new Date(expiryDate).getTime() - Date.now();
  return diff > 0 && diff < 3 * 24 * 60 * 60 * 1000; // 3 days
}

function isExpired(expiryDate: string | null): boolean {
  if (!expiryDate) return false;
  return new Date(expiryDate).getTime() < Date.now();
}

export function FridgeView() {
  const { addToast } = useToast();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<LocationFilter>("all");
  const [isAdding, setIsAdding] = useState(false);
  const [draft, setDraft] = useState({
    name: "",
    quantity: "",
    unit: "",
    location: "fridge",
    expiryDate: "",
  });

  useEffect(() => {
    fetch("/api/inventory")
      .then((r) => r.json())
      .then((data) => setItems(Array.isArray(data) ? data : []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  const filteredItems =
    filter === "all"
      ? items
      : items.filter((i) => i.location === filter);

  const addItem = useCallback(async () => {
    if (!draft.name || !draft.quantity || !draft.unit) return;
    try {
      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: draft.name,
          quantity: parseFloat(draft.quantity),
          unit: draft.unit,
          location: draft.location || null,
          expiryDate: draft.expiryDate || null,
        }),
      });
      if (res.ok) {
        const newItem = await res.json();
        setItems((prev) => [...prev, newItem]);
        setDraft({ name: "", quantity: "", unit: "", location: "fridge", expiryDate: "" });
        setIsAdding(false);
        addToast("Item added", "success");
      }
    } catch {
      addToast("Failed to add item", "error");
    }
  }, [draft, addToast]);

  const removeItem = useCallback(
    async (id: number) => {
      await fetch(`/api/inventory/${id}`, { method: "DELETE" });
      setItems((prev) => prev.filter((i) => i.id !== id));
      addToast("Item removed", "success");
    },
    [addToast]
  );

  const expiringCount = items.filter(
    (i) => isExpiringSoon(i.expiryDate) || isExpired(i.expiryDate)
  ).length;

  return (
    <div className="flex-1 overflow-y-auto bg-ui-bg pb-20 md:pb-8">
      <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        <PageHeader
          eyebrow="Inventory"
          title="Fridge & pantry"
          description={`${items.length} item${items.length === 1 ? "" : "s"} tracked`}
          meta={
            expiringCount > 0 ? (
              <span className="text-xs font-semibold text-ui-danger">
                {expiringCount} expiring or expired
              </span>
            ) : undefined
          }
          actions={
            <Button
              className="h-11"
              size="2"
              variant="solid"
              onClick={() => setIsAdding(true)}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add item
            </Button>
          }
        />

        <div className="mt-5 grid grid-cols-4 gap-1 rounded-lg border border-ui-border bg-ui-surface-subtle p-1">
          {LOCATIONS.map((location) => {
            const Icon = location.icon;
            return (
              <button
                key={location.id}
                type="button"
                onClick={() => setFilter(location.id)}
                className={cn(
                  "flex h-11 min-w-0 items-center justify-center gap-1 rounded-md px-2 text-xs font-semibold transition-[background-color,color] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-focus",
                  filter === location.id
                    ? "bg-ui-action text-ui-action-text"
                    : "text-ui-muted hover:bg-ui-surface-raised hover:text-ui-text"
                )}
                aria-pressed={filter === location.id}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="hidden truncate sm:inline">{location.label}</span>
              </button>
            );
          })}
        </div>

        {isAdding && (
          <section className="mt-5 rounded-lg border border-ui-border-strong bg-ui-surface-raised p-4">
            <h2 className="text-base font-semibold text-ui-text">Add inventory item</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-xs font-semibold text-ui-muted">
                Item name
                <input
                  value={draft.name}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, name: event.target.value }))
                  }
                  placeholder="e.g. Xiao bai cai"
                  className="h-11 rounded-lg border border-ui-border-strong bg-ui-surface-raised px-3 text-sm text-ui-text outline-none focus:border-ui-accent focus:ring-2 focus:ring-ui-focus-soft"
                  autoFocus
                />
              </label>
              <div className="grid grid-cols-[minmax(5rem,0.7fr)_minmax(0,1fr)] gap-3">
                <label className="grid min-w-0 gap-1 text-xs font-semibold text-ui-muted">
                  Quantity
                  <input
                    value={draft.quantity}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, quantity: event.target.value }))
                    }
                    placeholder="1"
                    type="number"
                    className="h-11 min-w-0 rounded-lg border border-ui-border-strong bg-ui-surface-raised px-3 text-sm text-ui-text outline-none focus:border-ui-accent focus:ring-2 focus:ring-ui-focus-soft"
                  />
                </label>
                <label className="grid min-w-0 gap-1 text-xs font-semibold text-ui-muted">
                  Unit
                  <input
                    value={draft.unit}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, unit: event.target.value }))
                    }
                    placeholder="g, ml, pcs"
                    className="h-11 min-w-0 rounded-lg border border-ui-border-strong bg-ui-surface-raised px-3 text-sm text-ui-text outline-none focus:border-ui-accent focus:ring-2 focus:ring-ui-focus-soft"
                  />
                </label>
              </div>
              <label className="grid gap-1 text-xs font-semibold text-ui-muted">
                Stored in
                <select
                  value={draft.location}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, location: event.target.value }))
                  }
                  className="h-11 rounded-lg border border-ui-border-strong bg-ui-surface-raised px-3 text-sm text-ui-text outline-none focus:border-ui-accent focus:ring-2 focus:ring-ui-focus-soft"
                >
                  <option value="fridge">Fridge</option>
                  <option value="freezer">Freezer</option>
                  <option value="pantry">Pantry</option>
                </select>
              </label>
              <label className="grid min-w-0 gap-1 text-xs font-semibold text-ui-muted">
                Expiry date
                <input
                  type="date"
                  value={draft.expiryDate}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, expiryDate: event.target.value }))
                  }
                  className="h-11 min-w-0 max-w-full appearance-none rounded-lg border border-ui-border-strong bg-ui-surface-raised px-3 text-sm text-ui-text outline-none focus:border-ui-accent focus:ring-2 focus:ring-ui-focus-soft"
                />
              </label>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button className="h-11" size="2" variant="solid" onClick={addItem}>
                Add item
              </Button>
              <Button
                className="h-11"
                size="2"
                variant="soft"
                color="gray"
                onClick={() => setIsAdding(false)}
              >
                Cancel
              </Button>
            </div>
          </section>
        )}

        {loading ? (
          <div className="mt-6">
            {[0, 1, 2, 3].map((item) => (
              <div key={item} className="flex items-center gap-3 border-t border-ui-border py-3">
                <Skeleton className="h-10 w-10" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <EmptyState
            className="mt-6 border-t border-ui-border"
            title={filter === "all" ? "No inventory yet" : `Nothing in ${filter}`}
            description="Add what you have on hand so meal planning and shopping can account for it."
          />
        ) : (
          <div className="mt-6 divide-y divide-ui-border border-t border-ui-border">
            {filteredItems.map((item) => {
              const expired = isExpired(item.expiryDate);
              const expiring = isExpiringSoon(item.expiryDate);
              const LocationIcon =
                item.location === "freezer"
                  ? Snowflake
                  : item.location === "pantry"
                    ? Warehouse
                    : Refrigerator;

              return (
                <article
                  key={item.id}
                  className={cn(
                    "grid min-h-16 grid-cols-[2.5rem_minmax(0,1fr)_auto_auto] items-center gap-3 px-1 py-3",
                    expired && "bg-red-50/60",
                    !expired && expiring && "bg-ui-warning-soft"
                  )}
                >
                  <span className="flex h-10 w-10 items-center justify-center text-ui-muted">
                    <LocationIcon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="break-words text-sm font-semibold text-ui-text">
                      {item.name}
                    </p>
                    {item.expiryDate && (
                      <p
                        className={cn(
                          "mt-0.5 text-xs",
                          expired
                            ? "font-semibold text-ui-danger"
                            : expiring
                              ? "font-semibold text-ui-warning"
                              : "text-ui-muted"
                        )}
                      >
                        {expired
                          ? "Expired"
                          : expiring
                            ? "Expires soon"
                            : "Expires"}{" "}
                        {new Date(item.expiryDate).toLocaleDateString("en-SG", {
                          day: "numeric",
                          month: "short",
                        })}
                      </p>
                    )}
                  </div>
                  <span className="max-w-[8rem] break-words text-right text-sm font-semibold tabular-nums text-ui-text">
                    {item.quantity} {item.unit}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="flex h-11 w-11 items-center justify-center rounded-lg text-ui-muted transition-colors duration-200 hover:bg-red-50 hover:text-ui-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-focus"
                    aria-label={`Remove ${item.name}`}
                    title="Remove item"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
