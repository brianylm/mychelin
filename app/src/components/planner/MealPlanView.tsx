"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { Button, IconButton } from "@radix-ui/themes";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  Cross2Icon,
} from "@radix-ui/react-icons";
import { CheckCircle2, ChefHat, ShoppingBasket } from "lucide-react";
import { useToast } from "@/context/ToastContext";
import { CalendarExport } from "@/components/CalendarExport";
import {
  Button as UiButton,
  EmptyState,
  FilterBar,
  RecipeResultRow,
  type FilterOption,
} from "@/components/ui";
import { getMealDateTime, getDefaultMealEndTime, CalendarEvent } from "@/lib/calendar";
import { recipeFlagShortLabel, type RecipeFlag } from "@/lib/recipe-flags";

interface MealPlan {
  id: number;
  date: string;
  mealType: string;
  recipeId: number;
  servings: number;
  notes: string | null;
  cookedAt: string | null;
  recipe?: { id: number; title: string; yield: string | null };
}

interface Recipe {
  id: number;
  title: string;
  description?: string | null;
  cuisine?: string | null;
  ingredients?: string[];
  lastCookedAt?: string | null;
  recipeFlags?: RecipeFlag[];
}

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"] as const;
const MEAL_LABELS: Record<string, string> = {
  breakfast: "🌅 Breakfast",
  lunch: "☀️ Lunch",
  dinner: "🌙 Dinner",
  snack: "🍪 Snack",
};

const MEAL_COLORS: Record<string, string> = {
  breakfast: "bg-orange-400",
  lunch: "bg-yellow-400",
  dinner: "bg-blue-400",
  snack: "bg-purple-400",
};

type ViewType = "week" | "month";

function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return year + "-" + month + "-" + day;
}

function getLocalTodayKey(): string {
  return toDateKey(new Date());
}

function dateFromKey(dateKey: string): Date {
  return new Date(dateKey + "T00:00:00");
}

function getWeekDates(offset: number, anchorDateKey = getLocalTodayKey()): string[] {
  const now = dateFromKey(anchorDateKey);
  const monday = new Date(now);
  monday.setDate(now.getDate() - now.getDay() + 1 + offset * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return toDateKey(d);
  });
}

function getMonthDates(offset: number, anchorDateKey = getLocalTodayKey()): string[][] {
  const now = dateFromKey(anchorDateKey);
  const targetMonth = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const firstDay = new Date(targetMonth);
  
  // Start from the Monday of the week containing the first day
  const startDate = new Date(firstDay);
  startDate.setDate(firstDay.getDate() - firstDay.getDay() + 1);
  
  const weeks: string[][] = [];
  const currentDate = new Date(startDate);
  
  while (weeks.length < 6) {
    const week: string[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(toDateKey(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    weeks.push(week);
    
    // Stop if we've covered the entire month and the first day of next week is in next month
    if (currentDate.getMonth() !== targetMonth.getMonth() && week.some(date => {
      const d = new Date(date + "T00:00:00");
      return d.getMonth() === targetMonth.getMonth();
    })) {
      break;
    }
  }
  
  return weeks;
}

function formatDate(dateStr: string, todayKey = getLocalTodayKey()) {
  const d = new Date(dateStr + "T00:00:00");
  return {
    day: d.toLocaleDateString("en-SG", { weekday: "short" }),
    date: d.getDate(),
    full: d.toLocaleDateString("en-SG", { day: "numeric", month: "short" }),
    isToday: dateStr === todayKey,
    month: d.getMonth(),
    year: d.getFullYear(),
  };
}

function getLastCookedLabel(lastCookedAt?: string | null): string {
  if (!lastCookedAt) return "Never cooked";

  const then = new Date(lastCookedAt).getTime();
  if (Number.isNaN(then)) return "Last cooked unknown";

  const days = Math.max(0, Math.floor((Date.now() - then) / (24 * 60 * 60 * 1000)));
  if (days === 0) return "Cooked today";
  if (days === 1) return "Cooked yesterday";
  if (days < 14) return `Cooked ${days} days ago`;

  return `Last cooked ${new Date(lastCookedAt).toLocaleDateString("en-SG", {
    day: "numeric",
    month: "short",
  })}`;
}

function getRecipeFlagPriority(recipe: Recipe): number {
  const flags = recipe.recipeFlags ?? [];
  if (flags.includes("try_soon")) return 2;
  if (flags.includes("newly_added")) return 1;
  return 0;
}

function getRecipeFlagBadges(recipe: Recipe): string[] {
  return (recipe.recipeFlags ?? []).map(recipeFlagShortLabel);
}

function getLastCookedSortValue(recipe: Recipe): number {
  if (!recipe.lastCookedAt) return 0;
  const timestamp = new Date(recipe.lastCookedAt).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function getRecipeMatchEvidence(recipe: Recipe, query: string): string | null {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return null;

  const ingredientMatch = (recipe.ingredients ?? []).find((ingredient) =>
    ingredient.toLowerCase().includes(normalized)
  );
  if (ingredientMatch) return "Matched ingredient: " + ingredientMatch;

  if (recipe.cuisine?.toLowerCase().includes(normalized)) {
    return "Matched cuisine: " + recipe.cuisine;
  }

  if (recipe.title.toLowerCase().includes(normalized)) return "Matched title";
  if (recipe.description?.toLowerCase().includes(normalized)) return "Matched notes";

  return null;
}

interface MealPlanViewProps {
  onCookMeal?: (recipeId: number, mealPlanId: number) => void;
  onCookMeals?: (meals: Array<{ recipeId: number; mealPlanId: number }>) => void;
  onOpenShoppingList?: (range: { start: string; end: string }) => void;
}

export function MealPlanView({ onCookMeal, onCookMeals, onOpenShoppingList }: MealPlanViewProps) {
  const { addToast } = useToast();
  const [viewType, setViewType] = useState<ViewType>("week");
  const [offset, setOffset] = useState(0);
  const [plans, setPlans] = useState<MealPlan[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingSlot, setAddingSlot] = useState<{
    date: string;
    mealType: string;
  } | null>(null);
  const [selectedRecipeId, setSelectedRecipeId] = useState<number | null>(null);
  const [selectedDayDate, setSelectedDayDate] = useState<string | null>(null);
  const [recipeQuery, setRecipeQuery] = useState("");
  const [cuisineFilter, setCuisineFilter] = useState("all");
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportEvents, setExportEvents] = useState<CalendarEvent[]>([]);
  const [exportTitle, setExportTitle] = useState("");
  const [todayKey, setTodayKey] = useState(getLocalTodayKey);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setTodayKey((current) => {
        const next = getLocalTodayKey();
        return next === current ? current : next;
      });
    }, 60_000);

    return () => window.clearInterval(interval);
  }, []);

  // Get current date range based on view type
  const getCurrentDates = useCallback(() => {
    if (viewType === "week") {
      const weekDates = getWeekDates(offset, todayKey);
      return {
        dates: weekDates,
        startDate: weekDates[0],
        endDate: weekDates[6],
        title: `${new Date(weekDates[0] + "T00:00:00").toLocaleDateString("en-SG", {
          day: "numeric",
          month: "short",
        })} – ${new Date(weekDates[6] + "T00:00:00").toLocaleDateString("en-SG", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })}`,
      };
    } else {
      const monthWeeks = getMonthDates(offset, todayKey);
      const allDates = monthWeeks.flat();
      const startDate = allDates[0];
      const endDate = allDates[allDates.length - 1];
      const baseDate = dateFromKey(todayKey);
      const monthDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + offset, 1);
      return {
        dates: allDates,
        weeks: monthWeeks,
        startDate,
        endDate,
        title: monthDate.toLocaleDateString("en-SG", { month: "long", year: "numeric" }),
      };
    }
  }, [viewType, offset, todayKey]);

  const currentDateRange = getCurrentDates();

  // Fetch meal plans
  useEffect(() => {
    let cancelled = false;

    async function loadMealPlans() {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/meal-plans?startDate=${currentDateRange.startDate}&endDate=${currentDateRange.endDate}`
        );
        const data = await response.json();
        if (!cancelled) setPlans(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setPlans([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadMealPlans();

    return () => {
      cancelled = true;
    };
  }, [currentDateRange.startDate, currentDateRange.endDate]);

  // Fetch recipes for the add dialog
  useEffect(() => {
    fetch("/api/recipes?planner=1")
      .then((r) => r.json())
      .then((data) => setRecipes(Array.isArray(data) ? data : []))
      .catch(() => setRecipes([]));
  }, []);

  const cuisineOptions = useMemo(() => {
    return Array.from(
      new Set(
        recipes
          .map((recipe) => recipe.cuisine?.trim())
          .filter((cuisine): cuisine is string => Boolean(cuisine))
      )
    ).sort((a, b) => a.localeCompare(b));
  }, [recipes]);

  const cuisineFilterOptions = useMemo<FilterOption[]>(() => {
    return [
      { label: "All", value: "all", count: recipes.length },
      ...cuisineOptions.map((cuisine) => ({
        label: cuisine,
        value: cuisine,
        count: recipes.filter((recipe) => recipe.cuisine === cuisine).length,
      })),
    ];
  }, [cuisineOptions, recipes]);

  const filteredRecipes = useMemo(() => {
    const query = recipeQuery.trim().toLowerCase();
    return recipes
      .filter((recipe) => {
        if (cuisineFilter !== "all" && recipe.cuisine !== cuisineFilter) return false;
        if (!query) return true;

        const searchable = [
          recipe.title,
          recipe.description ?? "",
          recipe.cuisine ?? "",
          ...(recipe.ingredients ?? []),
        ]
          .join(" ")
          .toLowerCase();
        return searchable.includes(query);
      })
      .sort((a, b) =>
        getRecipeFlagPriority(b) - getRecipeFlagPriority(a) ||
        getLastCookedSortValue(a) - getLastCookedSortValue(b)
      );
  }, [cuisineFilter, recipeQuery, recipes]);

  const selectedRecipe = selectedRecipeId
    ? recipes.find((recipe) => recipe.id === selectedRecipeId) ?? null
    : null;

  const openAddDialog = useCallback((date: string, mealType: string) => {
    setAddingSlot({ date, mealType });
    setSelectedRecipeId(null);
    setRecipeQuery("");
    setCuisineFilter("all");
  }, []);

  const closeAddDialog = useCallback(() => {
    setAddingSlot(null);
    setSelectedRecipeId(null);
    setRecipeQuery("");
    setCuisineFilter("all");
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
        closeAddDialog();
        addToast("Meal added", "success");
      }
    } catch {
      addToast("Failed to add meal", "error");
    }
  }, [addingSlot, selectedRecipeId, closeAddDialog, addToast]);

  const removePlan = useCallback(
    async (id: number) => {
      try {
        await fetch(`/api/meal-plans/${id}`, { method: "DELETE" });
        setPlans((prev) => prev.filter((p) => p.id !== id));
        addToast("Meal removed", "success");
      } catch {
        addToast("Failed to remove meal", "error");
      }
    },
    [addToast]
  );

  const getPlansForSlot = (date: string, mealType: string) =>
    plans.filter((p) => p.date === date && p.mealType === mealType);

  const getPlansForDate = (date: string) =>
    plans.filter((p) => p.date === date);

  const buildCalendarEvents = (mealPlans: MealPlan[]): CalendarEvent[] => {
    return mealPlans.map((plan) => {
      const start = getMealDateTime(plan.date, plan.mealType);
      const end = getDefaultMealEndTime(start);
      return {
        id: String(plan.id),
        title: `${plan.recipe?.title || "Meal"} (${plan.mealType})`,
        startDate: start,
        endDate: end,
        description: `Planned meal: ${plan.recipe?.title || "Meal"}`,
        recipeId: plan.recipeId,
      };
    });
  };

  return (
    <div className="flex-1 overflow-y-auto bg-surface pb-20 md:pb-6">
      <div className="mx-auto max-w-5xl px-4 py-6">
        {/* Header with view toggle and navigation */}
        <div className="mb-6">
          {/* View toggle */}
          <div className="mb-4 flex justify-center">
            <div className="inline-flex rounded-lg bg-neutral-100 p-1">
              <button
                onClick={() => {
                  setViewType("week");
                  setOffset(0);
                }}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  viewType === "week"
                    ? "bg-[#17131f] text-white shadow-sm"
                    : "text-neutral-600 hover:text-neutral-800"
                }`}
              >
                Week
              </button>
              <button
                onClick={() => {
                  setViewType("month");
                  setOffset(0);
                }}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  viewType === "month"
                    ? "bg-[#17131f] text-white shadow-sm"
                    : "text-neutral-600 hover:text-neutral-800"
                }`}
              >
                Month
              </button>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-center gap-4">
            <IconButton
              variant="ghost"
              size="2"
              onClick={() => setOffset((o) => o - 1)}
            >
              <ChevronLeftIcon />
            </IconButton>
            
            <div className="min-w-[200px] text-center">
              <h2 className="text-base font-semibold">
                {currentDateRange.title}
              </h2>
              {offset !== 0 && (
                <button
                  onClick={() => setOffset(0)}
                  className="mt-1 text-xs text-[#800020] hover:underline"
                >
                  Back to {viewType === "week" ? "this week" : "this month"}
                </button>
              )}
            </div>
            
            <IconButton
              variant="ghost"
              size="2"
              onClick={() => setOffset((o) => o + 1)}
            >
              <ChevronRightIcon />
            </IconButton>
          </div>

          {plans.length > 0 && (
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {onOpenShoppingList && (
                <Button
                  variant="solid"
                  color="gray"
                  onClick={() =>
                    onOpenShoppingList({
                      start: currentDateRange.startDate,
                      end: currentDateRange.endDate,
                    })
                  }
                >
                  <ShoppingBasket className="mr-1 h-4 w-4" />
                  Generate shopping list
                </Button>
              )}
              <Button
                variant="soft"
                color="amber"
                onClick={() => {
                  setExportEvents(buildCalendarEvents(plans));
                  setExportTitle(currentDateRange.title);
                  setShowExportModal(true);
                }}
              >
                <span className="mr-1">📤</span>
                Send to Calendar
              </Button>
            </div>
          )}
        </div>

        {loading ? (
          <p className="py-12 text-center text-sm text-neutral-500">
            Loading meal plans...
          </p>
        ) : viewType === "week" ? (
          /* Week View */
          <div className="space-y-3">
            {(currentDateRange.dates as string[]).map((date) => {
              const { day, date: num, isToday } = formatDate(date, todayKey);
              return (
                <div
                  key={date}
                  className={`rounded-2xl border bg-white p-4 ${
                    isToday
                      ? "border-[#800020]/30 ring-1 ring-amber-200"
                      : "border-neutral-200"
                  }`}
                >
                  {/* Day header */}
                  <div className="mb-3 flex items-center gap-2">
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold ${
                        isToday
                          ? "bg-[#17131f] text-white"
                          : "bg-neutral-100 text-neutral-700"
                      }`}
                    >
                      {num}
                    </div>
                    <span className="text-sm font-medium text-neutral-700">
                      {day}
                    </span>
                    {isToday && (
                      <span className="rounded-full bg-[#800020]/10 px-2 py-0.5 text-[10px] font-medium text-[#800020]">
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
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <p className="text-[10px] font-medium uppercase tracking-wide text-neutral-400">
                              {MEAL_LABELS[mealType]}
                            </p>
                            {onCookMeals && slotPlans.filter((plan) => !plan.cookedAt).length > 1 && (
                              <button
                                type="button"
                                onClick={() =>
                                  onCookMeals(
                                    slotPlans
                                      .filter((plan) => !plan.cookedAt)
                                      .map((plan) => ({ recipeId: plan.recipeId, mealPlanId: plan.id }))
                                  )
                                }
                                className="inline-flex h-7 items-center gap-1 rounded-full bg-[#17131f] px-2.5 text-[10px] font-semibold text-white transition hover:bg-[#800020]"
                              >
                                <ChefHat className="h-3 w-3" />
                                Cook together
                              </button>
                            )}
                          </div>
                          <div className="space-y-1.5">
                          {slotPlans.map((plan) => (
                            <div
                              key={plan.id}
                              className="group flex items-center gap-2 rounded-md bg-white px-2.5 py-2 text-xs shadow-sm"
                            >
                              <div className="min-w-0 flex-1">
                                <span className={`block truncate text-neutral-800 ${plan.cookedAt ? "line-through decoration-neutral-300" : ""}`}>
                                  {plan.recipe?.title || "Unknown recipe"}
                                </span>
                                {plan.cookedAt && (
                                  <span className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700">
                                    <CheckCircle2 className="h-3 w-3" />
                                    Cooked
                                  </span>
                                )}
                              </div>
                              {onCookMeal && !plan.cookedAt && (
                                <button
                                  type="button"
                                  onClick={() => onCookMeal(plan.recipeId, plan.id)}
                                  className="flex h-7 items-center gap-1 rounded-full bg-[#17131f] px-2.5 text-[10px] font-semibold text-white opacity-100 transition hover:bg-[#800020] sm:opacity-0 sm:group-hover:opacity-100"
                                  aria-label={`Cook ${plan.recipe?.title || "planned meal"}`}
                                >
                                  <ChefHat className="h-3 w-3" />
                                  Cook
                                </button>
                              )}
                              <IconButton
                                variant="ghost"
                                size="1"
                                color="red"
                                className="h-4 w-4 opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                                onClick={() => removePlan(plan.id)}
                              >
                                <Cross2Icon className="h-3 w-3" />
                              </IconButton>
                            </div>
                          ))}
                          </div>
                          <button
                            onClick={() => openAddDialog(date, mealType)}
                            className="mt-1 flex w-full items-center justify-center gap-1 rounded-md border border-dashed border-neutral-200 py-1 text-[10px] text-neutral-400 transition-colors hover:border-[#800020]/30 hover:text-[#800020]"
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
        ) : (
          /* Month View */
          <div className="rounded-2xl border border-neutral-200 bg-white">
            {/* Calendar header */}
            <div className="grid grid-cols-7 border-b border-neutral-100 bg-neutral-50">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                <div key={day} className="p-2 text-center">
                  <span className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                    {day}
                  </span>
                </div>
              ))}
            </div>
            
            {/* Calendar grid */}
            {currentDateRange.weeks?.map((week, weekIndex) => (
              <div key={weekIndex} className="grid grid-cols-7 border-b border-neutral-100 last:border-b-0">
                {week.map((date) => {
                  const { date: num, isToday, month } = formatDate(date, todayKey);
                  const dayPlans = getPlansForDate(date);
                  const baseDate = dateFromKey(todayKey);
                  const currentMonth = new Date(
                    baseDate.getFullYear(),
                    baseDate.getMonth() + offset,
                    1
                  ).getMonth();
                  const isCurrentMonth = month === currentMonth;
                  
                  return (
                    <button
                      key={date}
                      onClick={() => setSelectedDayDate(date)}
                      className={`min-h-[80px] p-2 text-left transition-colors hover:bg-neutral-50 ${
                        isToday
                          ? "bg-[#800020]/5"
                          : !isCurrentMonth
                            ? "bg-neutral-50/50 text-neutral-400"
                            : ""
                      } ${isToday ? "ring-1 ring-amber-200" : ""} border-r border-neutral-100 last:border-r-0`}
                    >
                      <div className="flex flex-col h-full">
                        <span
                          className={`mb-1 text-sm font-medium ${
                            isToday
                              ? "flex h-6 w-6 items-center justify-center rounded-full bg-[#17131f] text-white"
                              : isCurrentMonth
                                ? "text-neutral-900"
                                : "text-neutral-400"
                          }`}
                        >
                          {num}
                        </span>
                        <div className="flex-1 space-y-0.5">
                          {dayPlans.slice(0, 3).map((plan) => (
                            <div
                              key={plan.id}
                              className={`h-1.5 rounded-full ${MEAL_COLORS[plan.mealType]} opacity-80`}
                              title={`${MEAL_LABELS[plan.mealType]}: ${plan.recipe?.title}`}
                            />
                          ))}
                          {dayPlans.length > 3 && (
                            <div className="text-[9px] text-neutral-500">
                              +{dayPlans.length - 3} more
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        )}

        {/* Month day planner */}
        {selectedDayDate && !addingSlot && (
          <>
            <div
              className="fixed inset-0 z-30 bg-neutral-950/30 backdrop-blur-sm"
              onClick={() => setSelectedDayDate(null)}
            />
            <div className="fixed inset-x-4 bottom-20 z-40 mx-auto max-w-lg rounded-xl bg-white p-5 shadow-xl md:bottom-auto md:top-1/2 md:-translate-y-1/2">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-neutral-900">
                    Plan {formatDate(selectedDayDate, todayKey).full}
                  </h3>
                  <p className="mt-1 text-xs text-neutral-500">
                    Add meals without leaving month view.
                  </p>
                </div>
                <IconButton
                  variant="ghost"
                  size="1"
                  color="gray"
                  onClick={() => setSelectedDayDate(null)}
                  aria-label="Close day planner"
                >
                  <Cross2Icon />
                </IconButton>
              </div>
              <div className="space-y-2">
                {MEAL_TYPES.map((mealType) => {
                  const slotPlans = getPlansForSlot(selectedDayDate, mealType);

                  return (
                    <div
                      key={mealType}
                      className="rounded-lg border border-neutral-100 bg-neutral-50/70 p-3"
                    >
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <p className="text-[10px] font-medium uppercase tracking-wide text-neutral-500">
                          {MEAL_LABELS[mealType]}
                        </p>
                        <div className="flex items-center gap-2">
                          {onCookMeals && slotPlans.filter((plan) => !plan.cookedAt).length > 1 && (
                            <button
                              type="button"
                              onClick={() =>
                                onCookMeals(
                                  slotPlans
                                    .filter((plan) => !plan.cookedAt)
                                    .map((plan) => ({ recipeId: plan.recipeId, mealPlanId: plan.id }))
                                )
                              }
                              className="inline-flex h-7 items-center gap-1 rounded-md bg-[#17131f] px-2.5 text-[11px] font-semibold text-white transition hover:bg-[#800020]"
                            >
                              <ChefHat className="h-3 w-3" />
                              Cook together
                            </button>
                          )}
                        <button
                          type="button"
                          onClick={() => openAddDialog(selectedDayDate, mealType)}
                          className="inline-flex h-7 items-center gap-1 rounded-md border border-dashed border-neutral-300 px-2.5 text-[11px] font-medium text-neutral-600 transition hover:border-[#800020]/40 hover:text-[#800020]"
                        >
                          <PlusIcon className="h-3 w-3" />
                          Add meal
                        </button>
                        </div>
                      </div>

                      {slotPlans.length === 0 ? (
                        <p className="rounded-md bg-white px-3 py-2 text-xs text-neutral-400">
                          No meal planned.
                        </p>
                      ) : (
                        <div className="space-y-1.5">
                          {slotPlans.map((plan) => (
                            <div
                              key={plan.id}
                              className="group flex items-center gap-2 rounded-md bg-white px-3 py-2 text-xs shadow-sm"
                            >
                              <div className="min-w-0 flex-1">
                                <span
                                  className={
                                    "block truncate text-neutral-800 " +
                                    (plan.cookedAt
                                      ? "line-through decoration-neutral-300"
                                      : "")
                                  }
                                >
                                  {plan.recipe?.title || "Unknown recipe"}
                                </span>
                                {plan.cookedAt && (
                                  <span className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700">
                                    <CheckCircle2 className="h-3 w-3" />
                                    Cooked
                                  </span>
                                )}
                              </div>
                              {onCookMeal && !plan.cookedAt && (
                                <button
                                  type="button"
                                  onClick={() => onCookMeal(plan.recipeId, plan.id)}
                                  className="flex h-7 items-center gap-1 rounded-full bg-[#17131f] px-2.5 text-[10px] font-semibold text-white transition hover:bg-[#800020]"
                                  aria-label={
                                    "Cook " + (plan.recipe?.title || "planned meal")
                                  }
                                >
                                  <ChefHat className="h-3 w-3" />
                                  Cook
                                </button>
                              )}
                              <IconButton
                                variant="ghost"
                                size="1"
                                color="red"
                                className="h-4 w-4"
                                onClick={() => removePlan(plan.id)}
                              >
                                <Cross2Icon className="h-3 w-3" />
                              </IconButton>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* Add meal dialog */}
        {addingSlot && (
          <>
            <div
              className="fixed inset-0 z-40 bg-neutral-950/40 backdrop-blur-sm"
              onClick={closeAddDialog}
            />
            <div className="fixed inset-x-3 bottom-16 z-50 mx-auto max-h-[82vh] max-w-2xl overflow-hidden rounded-xl bg-white shadow-xl md:bottom-auto md:top-1/2 md:-translate-y-1/2">
              <div className="border-b border-neutral-100 p-5 pb-4">
                <h3 className="mb-1 text-sm font-semibold text-neutral-900">
                  Add to meal plan
                </h3>
                <p className="text-xs text-neutral-500">
                  {formatDate(addingSlot.date, todayKey).full} - {MEAL_LABELS[addingSlot.mealType]}
                </p>
              </div>

              <div className="space-y-3 p-5">
                <FilterBar
                  id="planner-recipe-search"
                  label="Search recipes to add to the meal plan"
                  query={recipeQuery}
                  onQueryChange={setRecipeQuery}
                  placeholder="Search recipes, ingredients, notes"
                  filters={cuisineFilterOptions}
                  activeFilter={cuisineFilter}
                  onFilterChange={setCuisineFilter}
                  resultCount={filteredRecipes.length}
                  resultLabel={filteredRecipes.length === 1 ? "recipe" : "recipes"}
                />

                {selectedRecipe && (
                  <div className="rounded-lg border border-[#800020]/15 bg-[#800020]/5 px-3 py-2">
                    <p className="text-xs font-semibold text-[#521224]">
                      {selectedRecipe.title}
                    </p>
                    <p className="mt-0.5 text-[11px] text-[#6b3b45]">
                      {[...getRecipeFlagBadges(selectedRecipe), getLastCookedLabel(selectedRecipe.lastCookedAt)].join(" · ")}
                    </p>
                  </div>
                )}

                <div className="max-h-[42vh] space-y-2 overflow-y-auto pr-1">
                  {recipes.length === 0 ? (
                    <EmptyState
                      title="No recipes yet"
                      description="Create or capture a recipe first, then come back to add it to your plan."
                    />
                  ) : filteredRecipes.length === 0 ? (
                    <EmptyState
                      title="No recipes match"
                      description="Try another ingredient, recipe name, or category."
                    />
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          const random =
                            filteredRecipes[
                              Math.floor(Math.random() * filteredRecipes.length)
                            ];
                          if (random) setSelectedRecipeId(random.id);
                        }}
                        className="flex w-full items-center justify-between gap-3 rounded-lg border border-dashed border-[var(--ui-accent)]/30 bg-[var(--ui-accent-muted)] px-3 py-2 text-left text-sm font-semibold text-[var(--ui-accent)] transition hover:bg-[var(--ui-accent-muted)]/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-focus)] focus-visible:ring-offset-2"
                      >
                        <span>Surprise me from these results</span>
                        <span className="text-[11px] text-[var(--ui-muted)]">
                          Flags first, then least recent
                        </span>
                      </button>

                      {filteredRecipes.map((recipe) => (
                        <RecipeResultRow
                          key={recipe.id}
                          title={recipe.title}
                          cuisine={recipe.cuisine}
                          ingredients={recipe.ingredients}
                          lastCookedLabel={getLastCookedLabel(recipe.lastCookedAt)}
                          badges={getRecipeFlagBadges(recipe)}
                          selected={selectedRecipeId === recipe.id}
                          matchEvidence={getRecipeMatchEvidence(recipe, recipeQuery)}
                          onSelect={() => setSelectedRecipeId(recipe.id)}
                        />
                      ))}
                    </>
                  )}
                </div>
              </div>

              <div className="flex gap-2 border-t border-[var(--ui-border)] p-5 pt-4">
                <UiButton
                  disabled={!selectedRecipeId}
                  onClick={addPlan}
                  className="flex-1"
                >
                  Add meal
                </UiButton>
                <UiButton
                  variant="secondary"
                  onClick={closeAddDialog}
                >
                  Cancel
                </UiButton>
              </div>
            </div>
          </>
        )}
        {showExportModal && (
          <CalendarExport
            events={exportEvents}
            title={exportTitle}
            onClose={() => setShowExportModal(false)}
          />
        )}
      </div>
    </div>
  );
}