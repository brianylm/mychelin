"use client";

import { useState, useCallback, useEffect } from "react";
import { Button, IconButton } from "@radix-ui/themes";
import { Cross2Icon, PlusIcon, Pencil1Icon } from "@radix-ui/react-icons";
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
  householdId?: number | null;
}

type LocationFilter = "all" | "fridge" | "freezer" | "pantry";

const LOCATIONS: { id: LocationFilter; label: string; icon: string }[] = [
  { id: "all", label: "All", icon: "📦" },
  { id: "fridge", label: "Fridge", icon: "🧊" },
  { id: "freezer", label: "Freezer", icon: "❄️" },
  { id: "pantry", label: "Pantry", icon: "🏪" },
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
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState({ quantity: "", expiryDate: "" });
  // Whether the inventory is the household's shared one. Loaded
  // best-effort: solo users and HOUSEHOLDS_ENABLED=off both leave this
  // false and the view behaves exactly as before.
  const [isShared, setIsShared] = useState(false);
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
    fetch("/api/households")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setIsShared(Boolean(data?.household)))
      .catch(() => setIsShared(false));
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

  // Manual reconcile: adjust the quantity (and optionally expiry) of any
  // row directly. In a household this is attributed in the activity feed.
  const startEdit = useCallback((item: InventoryItem) => {
    setEditingId(item.id);
    setEditDraft({
      quantity: String(item.quantity),
      expiryDate: item.expiryDate ?? "",
    });
  }, []);

  const saveEdit = useCallback(
    async (id: number) => {
      const quantity = parseFloat(editDraft.quantity);
      if (!Number.isFinite(quantity)) return;
      try {
        const res = await fetch(`/api/inventory/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            quantity,
            expiryDate: editDraft.expiryDate || null,
          }),
        });
        if (res.ok) {
          const updated = await res.json();
          setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...updated } : i)));
          setEditingId(null);
          addToast("Item updated", "success");
        } else {
          addToast("Failed to update item", "error");
        }
      } catch {
        addToast("Failed to update item", "error");
      }
    },
    [editDraft, addToast]
  );

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
    <div className="flex-1 overflow-y-auto bg-surface pb-20 md:pb-6">
      <div className="mx-auto max-w-3xl px-4 py-6">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold">Inventory</h2>
            <p className="text-xs text-neutral-500">
              {items.length} items
              {isShared && (
                <span className="ml-2 rounded-full bg-[#800020]/10 px-2 py-0.5 text-[10px] font-semibold text-[#800020]">
                  Shared with household
                </span>
              )}
              {expiringCount > 0 && (
                <span className="ml-2 text-red-500">
                  ⚠️ {expiringCount} expiring
                </span>
              )}
            </p>
          </div>
          <Button
            size="2"
            variant="solid"
            onClick={() => setIsAdding(true)}
          >
            <PlusIcon className="mr-1 h-4 w-4" />
            Add item
          </Button>
        </div>

        {/* Location filter */}
        <div className="mb-4 flex gap-1 rounded-lg border border-neutral-200 bg-neutral-50 p-1">
          {LOCATIONS.map((loc) => (
            <button
              key={loc.id}
              onClick={() => setFilter(loc.id)}
              className={cn(
                "flex flex-1 items-center justify-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium transition-all",
                filter === loc.id
                  ? "bg-[#17131f] text-white shadow-sm"
                  : "text-neutral-600 hover:bg-neutral-100"
              )}
            >
              <span>{loc.icon}</span>
              <span className="hidden sm:inline">{loc.label}</span>
            </button>
          ))}
        </div>

        {/* Add form */}
        {isAdding && (
          <div className="mb-4 rounded-2xl border border-neutral-200 bg-white p-4">
            <h3 className="mb-3 text-sm font-semibold">Add item</h3>
            <div className="grid gap-2 sm:grid-cols-2">
              <input
                value={draft.name}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                placeholder="Item name"
                className="rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm outline-none focus:border-[#800020]/45 focus:ring-1 focus:ring-[#800020]/10 focus:bg-white"
                autoFocus
              />
              <div className="flex gap-2">
                <input
                  value={draft.quantity}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, quantity: e.target.value }))
                  }
                  placeholder="Qty"
                  type="number"
                  className="w-20 rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm outline-none focus:border-[#800020]/45 focus:ring-1 focus:ring-[#800020]/10 focus:bg-white"
                />
                <input
                  value={draft.unit}
                  onChange={(e) => setDraft((d) => ({ ...d, unit: e.target.value }))}
                  placeholder="Unit (g, ml, pcs)"
                  className="flex-1 rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm outline-none focus:border-[#800020]/45 focus:ring-1 focus:ring-[#800020]/10 focus:bg-white"
                />
              </div>
              <select
                value={draft.location}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, location: e.target.value }))
                }
                className="rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm outline-none focus:border-[#800020]/45 focus:ring-1 focus:ring-[#800020]/10 focus:bg-white"
              >
                <option value="fridge">🧊 Fridge</option>
                <option value="freezer">❄️ Freezer</option>
                <option value="pantry">🏪 Pantry</option>
              </select>
              <input
                type="date"
                value={draft.expiryDate}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, expiryDate: e.target.value }))
                }
                className="rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm outline-none focus:border-[#800020]/45 focus:ring-1 focus:ring-[#800020]/10 focus:bg-white"
                placeholder="Expiry date"
              />
            </div>
            <div className="mt-3 flex gap-2">
              <Button size="2" variant="solid" onClick={addItem}>
                Add
              </Button>
              <Button
                size="2"
                variant="soft"
                color="gray"
                onClick={() => setIsAdding(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Items list */}
        {loading ? (
          <p className="py-12 text-center text-sm text-neutral-500">
            Loading inventory...
          </p>
        ) : filteredItems.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-3xl">🧊</p>
            <p className="mt-2 text-sm text-neutral-500">
              {filter === "all"
                ? "Your inventory is empty. Add some items!"
                : `Nothing in ${filter}. Add items to track them.`}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredItems.map((item) => {
              const expired = isExpired(item.expiryDate);
              const expiring = isExpiringSoon(item.expiryDate);
              const outOfStock = item.quantity <= 0;

              return (
                <div
                  key={item.id}
                  className={cn(
                    "group flex items-center gap-3 rounded-xl border bg-white px-4 py-3 transition-colors",
                    expired
                      ? "border-red-200 bg-red-50/50"
                      : expiring
                        ? "border-[#800020]/15 bg-[#800020]/5"
                        : "border-neutral-200"
                  )}
                >
                  {/* Location icon */}
                  <span className="text-lg">
                    {item.location === "freezer"
                      ? "❄️"
                      : item.location === "pantry"
                        ? "🏪"
                        : "🧊"}
                  </span>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-neutral-800">
                      {item.name}
                    </p>
                    {editingId === item.id ? (
                      <div className="mt-1 flex items-center gap-2">
                        <input
                          value={editDraft.quantity}
                          onChange={(e) =>
                            setEditDraft((d) => ({ ...d, quantity: e.target.value }))
                          }
                          type="number"
                          aria-label="Quantity"
                          className="w-20 rounded-lg border border-neutral-300 bg-neutral-50 px-2 py-1 text-xs outline-none focus:border-[#800020]/45"
                        />
                        <input
                          type="date"
                          value={editDraft.expiryDate}
                          onChange={(e) =>
                            setEditDraft((d) => ({ ...d, expiryDate: e.target.value }))
                          }
                          aria-label="Expiry date"
                          className="rounded-lg border border-neutral-300 bg-neutral-50 px-2 py-1 text-xs outline-none focus:border-[#800020]/45"
                        />
                        <button
                          type="button"
                          onClick={() => saveEdit(item.id)}
                          className="rounded-lg bg-[#17131f] px-2.5 py-1 text-xs font-medium text-white"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="rounded-lg px-2 py-1 text-xs text-neutral-500"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <p className="text-xs text-neutral-500">
                        {item.quantity} {item.unit}
                        {outOfStock && (
                          <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                            ⚠️ Out of stock
                          </span>
                        )}
                        {item.expiryDate && (
                          <span
                            className={cn(
                              "ml-2",
                              expired
                                ? "font-medium text-red-600"
                                : expiring
                                  ? "font-medium text-[#800020]"
                                  : ""
                            )}
                          >
                            {expired
                              ? "⚠️ Expired"
                              : expiring
                                ? `⏰ Expires ${new Date(item.expiryDate).toLocaleDateString("en-SG", { day: "numeric", month: "short" })}`
                                : `Exp: ${new Date(item.expiryDate).toLocaleDateString("en-SG", { day: "numeric", month: "short" })}`}
                          </span>
                        )}
                      </p>
                    )}
                  </div>

                  {/* Edit (manual reconcile) */}
                  {editingId !== item.id && (
                    <IconButton
                      variant="ghost"
                      size="1"
                      aria-label={`Edit ${item.name}`}
                      className="opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100"
                      onClick={() => startEdit(item)}
                    >
                      <Pencil1Icon />
                    </IconButton>
                  )}

                  {/* Remove */}
                  <IconButton
                    variant="ghost"
                    size="1"
                    color="red"
                    className="opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100"
                    onClick={() => removeItem(item.id)}
                  >
                    <Cross2Icon />
                  </IconButton>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
