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
import { CalendarExport } from "@/components/CalendarExport";
import { getMealDateTime, getDefaultMealEndTime, CalendarEvent } from "@/lib/calendar";

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

const MEAL_COLORS: Record<string, string> = {
  breakfast: "bg-orange-400",
  lunch: "bg-yellow-400", 
  dinner: "bg-blue-400",
  snack: "bg-purple-400",
};

type ViewType = "week" | "month";

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

function getMonthDates(offset: number): string[][] {
  const now = new Date();
  const targetMonth = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const firstDay = new Date(targetMonth);
  const lastDay = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0);
  
  // Start from the Monday of the week containing the first day
  const startDate = new Date(firstDay);
  startDate.setDate(firstDay.getDate() - firstDay.getDay() + 1);
  
  const weeks: string[][] = [];
  const currentDate = new Date(startDate);
  
  while (weeks.length < 6) {
    const week: string[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(currentDate.toISOString().split("T")[0]);
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

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return {
    day: d.toLocaleDateString("en-SG", { weekday: "short" }),
    date: d.getDate(),
    full: d.toLocaleDateString("en-SG", { day: "numeric", month: "short" }),
    isToday: dateStr === new Date().toISOString().split("T")[0],
    month: d.getMonth(),
    year: d.getFullYear(),
  };
}

function getRandomRecipe(recipes: Recipe[], usedRecipes: Set<number>): Recipe | null {
  const availableRecipes = recipes.filter(r => !usedRecipes.has(r.id));
  if (availableRecipes.length === 0) {
    // If all recipes used, cycle through all recipes
    return recipes[Math.floor(Math.random() * recipes.length)];
  }
  return availableRecipes[Math.floor(Math.random() * availableRecipes.length)];
}

export function MealPlanView() {
  const { addToast } = useToast();
  const [viewType, setViewType] = useState<ViewType>("week");
  const [offset, setOffset] = useState(0);
  const [plans, setPlans] = useState<MealPlan[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [randomising, setRandomising] = useState(false);
  const [addingSlot, setAddingSlot] = useState<{
    date: string;
    mealType: string;
  } | null>(null);
  const [selectedRecipeId, setSelectedRecipeId] = useState<number | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportEvents, setExportEvents] = useState<CalendarEvent[]>([]);
  const [exportTitle, setExportTitle] = useState("");

  // Get current date range based on view type
  const getCurrentDates = useCallback(() => {
    if (viewType === "week") {
      const weekDates = getWeekDates(offset);
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
      const monthWeeks = getMonthDates(offset);
      const allDates = monthWeeks.flat();
      const startDate = allDates[0];
      const endDate = allDates[allDates.length - 1];
      const monthDate = new Date(new Date().getFullYear(), new Date().getMonth() + offset, 1);
      return {
        dates: allDates,
        weeks: monthWeeks,
        startDate,
        endDate,
        title: monthDate.toLocaleDateString("en-SG", { month: "long", year: "numeric" }),
      };
    }
  }, [viewType, offset]);

  const currentDateRange = getCurrentDates();

  // Fetch meal plans
  useEffect(() => {
    setLoading(true);
    fetch(`/api/meal-plans?startDate=${currentDateRange.startDate}&endDate=${currentDateRange.endDate}`)
      .then((r) => r.json())
      .then((data) => setPlans(Array.isArray(data) ? data : []))
      .catch(() => setPlans([]))
      .finally(() => setLoading(false));
  }, [currentDateRange.startDate, currentDateRange.endDate]);

  // Fetch recipes for the add dialog and randomise
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

  const randomiseMeals = useCallback(async () => {
    if (recipes.length === 0) {
      addToast("No recipes available", "error");
      return;
    }

    setRandomising(true);
    const emptySlots: Array<{ date: string; mealType: string }> = [];
    
    // Find all empty slots in current view
    currentDateRange.dates.forEach(date => {
      MEAL_TYPES.forEach(mealType => {
        const hasPlans = plans.some(p => p.date === date && p.mealType === mealType);
        if (!hasPlans) {
          emptySlots.push({ date, mealType });
        }
      });
    });

    if (emptySlots.length === 0) {
      addToast("No empty meal slots to fill", "info");
      setRandomising(false);
      return;
    }

    try {
      const newPlans: MealPlan[] = [];
      const usedRecipesPerDay: Record<string, Set<number>> = {};
      
      for (const slot of emptySlots) {
        if (!usedRecipesPerDay[slot.date]) {
          usedRecipesPerDay[slot.date] = new Set();
        }
        
        const randomRecipe = getRandomRecipe(recipes, usedRecipesPerDay[slot.date]);
        if (!randomRecipe) continue;
        
        usedRecipesPerDay[slot.date].add(randomRecipe.id);
        
        const res = await fetch("/api/meal-plans", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date: slot.date,
            mealType: slot.mealType,
            recipeId: randomRecipe.id,
            servings: 1,
          }),
        });
        
        if (res.ok) {
          const newPlan = await res.json();
          newPlans.push(newPlan);
        }
      }
      
      setPlans((prev) => [...prev, ...newPlans]);
      addToast(`Added ${newPlans.length} random meals`, "success");
    } catch {
      addToast("Failed to randomise meals", "error");
    }
    
    setRandomising(false);
  }, [recipes, plans, currentDateRange.dates, addToast]);

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
      };
    });
  };

  const switchToWeekView = (targetDate: string) => {
    const target = new Date(targetDate + "T00:00:00");
    const now = new Date();
    const currentMonday = new Date(now);
    currentMonday.setDate(now.getDate() - now.getDay() + 1);
    
    const targetMonday = new Date(target);
    targetMonday.setDate(target.getDate() - target.getDay() + 1);
    
    const weeksDiff = Math.round((targetMonday.getTime() - currentMonday.getTime()) / (7 * 24 * 60 * 60 * 1000));
    
    setViewType("week");
    setOffset(weeksDiff);
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
            <div className="mt-4 flex justify-center">
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
              const { day, date: num, isToday } = formatDate(date);

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
                  const { date: num, isToday, month } = formatDate(date);
                  const dayPlans = getPlansForDate(date);
                  const currentMonth = new Date().getMonth() + offset;
                  const isCurrentMonth = month === currentMonth;
                  
                  return (
                    <button
                      key={date}
                      onClick={() => switchToWeekView(date)}
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
                  <>
                    {/* Surprise Me */}
                    <button
                      onClick={() => {
                        const random = recipes[Math.floor(Math.random() * recipes.length)];
                        setSelectedRecipeId(random.id);
                      }}
                      className={`flex w-full items-center gap-2 rounded-lg border border-dashed border-[#800020]/30 bg-[#800020]/5 px-3 py-2 text-left text-sm font-medium text-[#800020] transition-colors hover:bg-[#800020]/10`}
                    >
                      <span className="text-base">🎲</span>
                      Surprise me!
                    </button>
                    {recipes.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => setSelectedRecipeId(r.id)}
                        className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                          selectedRecipeId === r.id
                            ? "bg-[#800020]/5 font-medium text-[#521224]"
                            : "hover:bg-neutral-100"
                        }`}
                      >
                        <span className="text-base">🍳</span>
                        {r.title}
                      </button>
                    ))}
                  </>
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