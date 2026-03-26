"use client";

import { useState, useCallback, useEffect } from "react";
import { Button, IconButton } from "@radix-ui/themes";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  Cross2Icon,
} from "@radix-ui/react-icons";
import { useToast } from "@/context/ToastContext";

interface MealPlan {
  id: number;
  date: string;
  mealType: string;
  recipeId: number;
  servings: number;
  notes: string | null;
  recipe?: { id: number; title: string; yield: string | null };
}

interface Recipe {
  id: number;
  title: string;
}

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"] as const;
const MEAL_LABELS: Record<string, string> = {
  breakfast: "🌅 Breakfast",
  lunch: "☀️ Lunch",
  dinner: "🌙 Dinner",
  snack: "🍪 Snack",
};

function getWeekDates(offset: number): string[] {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - now.getDay() + 1 + offset * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d.toISOString().split("T")[0];
  });
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return {
    day: d.toLocaleDateString("en-SG", { weekday: "short" }),
    date: d.getDate(),
    full: d.toLocaleDateString("en-SG", { day: "numeric", month: "short" }),
    isToday: dateStr === new Date().toISOString().split("T")[0],
  };
}

export function MealPlanView() {
  const { addToast } = useToast();
  const [weekOffset, setWeekOffset] = useState(0);
  const [plans, setPlans] = useState<MealPlan[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingSlot, setAddingSlot] = useState<{
    date: string;
    mealType: string;
  } | null>(null);
  const [selectedRecipeId, setSelectedRecipeId] = useState<number | null>(null);

  const weekDates = getWeekDates(weekOffset);
  const startDate = weekDates[0];
  const endDate = weekDates[6];

  // Fetch meal plans
  useEffect(() => {
    setLoading(true);
    fetch(`/api/meal-plans?startDate=${startDate}&endDate=${endDate}`)
      .then((r) => r.json())
      .then((data) => setPlans(Array.isArray(data) ? data : []))
      .catch(() => setPlans([]))
      .finally(() => setLoading(false));
  }, [startDate, endDate]);

  // Fetch recipes for the add dialog
  useEffect(() => {
    fetch("/api/recipes")
      .then((r) => r.json())
      .then((data) => setRecipes(Array.isArray(data) ? data : []))
      .catch(() => setRecipes([]));
  }, []);

  const addPlan = useCallback(async () => {
    if (!addingSlot || !selectedRecipeId) return;
    try {
      const res = await fetch("/api/meal-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: addingSlot.date,
          mealType: addingSlot.mealType,
          recipeId: selectedRecipeId,
          servings: 1,
        }),
      });
      const newPlan = await res.json();
      if (res.ok) {
        setPlans((prev) => [...prev, newPlan]);
        setAddingSlot(null);
        setSelectedRecipeId(null);
        addToast("Meal added", "success");
      }
    } catch {
      addToast("Failed to add meal", "error");
    }
  }, [addingSlot, selectedRecipeId, addToast]);

  const removePlan = useCallback(
    async (id: number) => {
      await fetch(`/api/meal-plans/${id}`, { method: "DELETE" });
      setPlans((prev) => prev.filter((p) => p.id !== id));
    },
    []
  );

  const getPlansForSlot = (date: string, mealType: string) =>
    plans.filter((p) => p.date === date && p.mealType === mealType);

  return (
    <div className="flex-1 overflow-y-auto bg-surface pb-20 md:pb-6">
      <div className="mx-auto max-w-5xl px-4 py-6">
        {/* Week header */}
        <div className="mb-6 flex items-center justify-between">
          <IconButton
            variant="ghost"
            size="2"
            onClick={() => setWeekOffset((o) => o - 1)}
          >
            <ChevronLeftIcon />
          </IconButton>
          <div className="text-center">
            <h2 className="text-base font-semibold">
              {new Date(startDate + "T00:00:00").toLocaleDateString("en-SG", {
                day: "numeric",
                month: "short",
              })}{" "}
              –{" "}
              {new Date(endDate + "T00:00:00").toLocaleDateString("en-SG", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </h2>
            {weekOffset !== 0 && (
              <button
                onClick={() => setWeekOffset(0)}
                className="mt-1 text-xs text-amber-700 hover:underline"
              >
                Back to this week
              </button>
            )}
          </div>
          <IconButton
            variant="ghost"
            size="2"
            onClick={() => setWeekOffset((o) => o + 1)}
          >
            <ChevronRightIcon />
          </IconButton>
        </div>

        {loading ? (
          <p className="py-12 text-center text-sm text-neutral-500">
            Loading meal plans...
          </p>
        ) : (
          <div className="space-y-3">
            {weekDates.map((date) => {
              const { day, date: num, isToday } = formatDate(date);
              const dayPlans = plans.filter((p) => p.date === date);

              return (
                <div
                  key={date}
                  className={`rounded-2xl border bg-white p-4 ${
                    isToday
                      ? "border-amber-300 ring-1 ring-amber-200"
                      : "border-neutral-200"
                  }`}
                >
                  {/* Day header */}
                  <div className="mb-3 flex items-center gap-2">
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold ${
                        isToday
                          ? "bg-amber-600 text-white"
                          : "bg-neutral-100 text-neutral-700"
                      }`}
                    >
                      {num}
                    </div>
                    <span className="text-sm font-medium text-neutral-700">
                      {day}
                    </span>
                    {isToday && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                        Today
                      </span>
                    )}
                  </div>

                  {/* Meal slots */}
                  <div className="grid gap-2 sm:grid-cols-4">
                    {MEAL_TYPES.map((mealType) => {
                      const slotPlans = getPlansForSlot(date, mealType);
                      return (
                        <div
                          key={mealType}
                          className="rounded-lg border border-neutral-100 bg-neutral-50/50 p-2"
                        >
                          <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-neutral-400">
                            {MEAL_LABELS[mealType]}
                          </p>
                          {slotPlans.map((plan) => (
                            <div
                              key={plan.id}
                              className="group flex items-center gap-1 rounded-md bg-white px-2 py-1 text-xs shadow-sm"
                            >
                              <span className="flex-1 truncate text-neutral-800">
                                {plan.recipe?.title || "Unknown recipe"}
                              </span>
                              <IconButton
                                variant="ghost"
                                size="1"
                                color="red"
                                className="h-4 w-4 opacity-0 group-hover:opacity-100"
                                onClick={() => removePlan(plan.id)}
                              >
                                <Cross2Icon className="h-3 w-3" />
                              </IconButton>
                            </div>
                          ))}
                          <button
                            onClick={() =>
                              setAddingSlot({ date, mealType })
                            }
                            className="mt-1 flex w-full items-center justify-center gap-1 rounded-md border border-dashed border-neutral-200 py-1 text-[10px] text-neutral-400 transition-colors hover:border-amber-300 hover:text-amber-600"
                          >
                            <PlusIcon className="h-3 w-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Add meal dialog */}
        {addingSlot && (
          <>
            <div
              className="fixed inset-0 z-40 bg-neutral-950/40 backdrop-blur-sm"
              onClick={() => {
                setAddingSlot(null);
                setSelectedRecipeId(null);
              }}
            />
            <div className="fixed inset-x-4 bottom-20 z-50 mx-auto max-w-sm rounded-xl bg-white p-5 shadow-xl md:bottom-auto md:top-1/2 md:-translate-y-1/2">
              <h3 className="mb-1 text-sm font-semibold">Add to meal plan</h3>
              <p className="mb-3 text-xs text-neutral-500">
                {formatDate(addingSlot.date).full} •{" "}
                {MEAL_LABELS[addingSlot.mealType]}
              </p>

              <div className="mb-3 max-h-48 space-y-1 overflow-y-auto">
                {recipes.length === 0 ? (
                  <p className="py-4 text-center text-xs text-neutral-500">
                    No recipes yet. Create one first!
                  </p>
                ) : (
                  recipes.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => setSelectedRecipeId(r.id)}
                      className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                        selectedRecipeId === r.id
                          ? "bg-amber-50 font-medium text-amber-800"
                          : "hover:bg-neutral-100"
                      }`}
                    >
                      <span className="text-base">🍳</span>
                      {r.title}
                    </button>
                  ))
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  size="2"
                  variant="solid"
                  disabled={!selectedRecipeId}
                  onClick={addPlan}
                  className="flex-1"
                >
                  Add
                </Button>
                <Button
                  size="2"
                  variant="soft"
                  color="gray"
                  onClick={() => {
                    setAddingSlot(null);
                    setSelectedRecipeId(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
