"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import Link from "next/link";

interface MealEntry {
  id: string;
  date: string; // YYYY-MM-DD
  meal: "breakfast" | "lunch" | "dinner";
  title: string;
  recipeId?: string;
}

interface Recipe {
  id: string;
  title: string;
  cuisine: string | null;
  category: string | null;
}

const MEAL_TYPES = [
  { key: "breakfast" as const, label: "Breakfast", emoji: "🌅" },
  { key: "lunch" as const, label: "Lunch", emoji: "☀️" },
  { key: "dinner" as const, label: "Dinner", emoji: "🌙" },
];

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function formatDateKey(d: Date): string {
  return d.toISOString().split("T")[0];
}

function isSameDay(a: Date, b: Date) {
  return formatDateKey(a) === formatDateKey(b);
}

function getWeekDays(date: Date): Date[] {
  const d = new Date(date);
  const day = d.getDay();
  const start = new Date(d);
  start.setDate(d.getDate() - day);
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const dd = new Date(start);
    dd.setDate(start.getDate() + i);
    days.push(dd);
  }
  return days;
}

type ViewMode = "month" | "week";

export default function PlannerPage() {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [meals, setMeals] = useState<MealEntry[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [editingMeal, setEditingMeal] = useState<{ date: string; meal: "breakfast" | "lunch" | "dinner" } | null>(null);
  const [mealInput, setMealInput] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [shuffling, setShuffling] = useState(false);

  const today = useMemo(() => new Date(), []);

  // Fetch recipes for surprise me
  useEffect(() => {
    fetch("/api/recipes")
      .then((r) => r.json())
      .then((data) => setRecipes(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  const pickRandomRecipe = useCallback((): Recipe | null => {
    if (recipes.length === 0) return null;
    return recipes[Math.floor(Math.random() * recipes.length)];
  }, [recipes]);

  // Surprise me for a single meal slot
  const surpriseMeal = useCallback(
    (dateKey: string, mealType: "breakfast" | "lunch" | "dinner") => {
      const recipe = pickRandomRecipe();
      if (!recipe) return;

      const existing = meals.find((m) => m.date === dateKey && m.meal === mealType);
      if (existing) {
        setMeals((prev) =>
          prev.map((m) => (m.id === existing.id ? { ...m, title: recipe.title, recipeId: recipe.id } : m))
        );
      } else {
        setMeals((prev) => [
          ...prev,
          { id: crypto.randomUUID(), date: dateKey, meal: mealType, title: recipe.title, recipeId: recipe.id },
        ]);
      }
    },
    [meals, pickRandomRecipe]
  );

  // Surprise me for a whole day (all 3 meals)
  const surpriseDay = useCallback(
    (dateKey: string) => {
      if (recipes.length === 0) return;
      const newMeals = [...meals];
      for (const { key } of MEAL_TYPES) {
        const recipe = recipes[Math.floor(Math.random() * recipes.length)];
        const existing = newMeals.findIndex((m) => m.date === dateKey && m.meal === key);
        if (existing >= 0) {
          newMeals[existing] = { ...newMeals[existing], title: recipe.title, recipeId: recipe.id };
        } else {
          newMeals.push({ id: crypto.randomUUID(), date: dateKey, meal: key, title: recipe.title, recipeId: recipe.id });
        }
      }
      setMeals(newMeals);
    },
    [meals, recipes]
  );

  // Randomise visible range (week or month)
  const randomiseRange = useCallback(() => {
    if (recipes.length === 0) return;
    setShuffling(true);

    const dates: string[] = [];
    if (viewMode === "week") {
      const weekDays = getWeekDays(currentDate);
      weekDays.forEach((d) => dates.push(formatDateKey(d)));
    } else {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const lastDay = new Date(year, month + 1, 0).getDate();
      for (let d = 1; d <= lastDay; d++) {
        dates.push(formatDateKey(new Date(year, month, d)));
      }
    }

    const newMeals = [...meals];
    for (const dateKey of dates) {
      for (const { key } of MEAL_TYPES) {
        const recipe = recipes[Math.floor(Math.random() * recipes.length)];
        const existing = newMeals.findIndex((m) => m.date === dateKey && m.meal === key);
        if (existing >= 0) {
          newMeals[existing] = { ...newMeals[existing], title: recipe.title, recipeId: recipe.id };
        } else {
          newMeals.push({ id: crypto.randomUUID(), date: dateKey, meal: key, title: recipe.title, recipeId: recipe.id });
        }
      }
    }
    setMeals(newMeals);
    setTimeout(() => setShuffling(false), 600);
  }, [meals, recipes, viewMode, currentDate]);

  // Calendar grid for month view
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPad = firstDay.getDay();
    const days: (Date | null)[] = [];
    for (let i = 0; i < startPad; i++) days.push(null);
    for (let d = 1; d <= lastDay.getDate(); d++) days.push(new Date(year, month, d));
    while (days.length % 7 !== 0) days.push(null);
    return days;
  }, [currentDate]);

  // Week days for week view
  const weekDays = useMemo(() => getWeekDays(currentDate), [currentDate]);

  const prevPeriod = () => {
    if (viewMode === "week") {
      const d = new Date(currentDate);
      d.setDate(d.getDate() - 7);
      setCurrentDate(d);
    } else {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    }
    setSelectedDate(null);
  };

  const nextPeriod = () => {
    if (viewMode === "week") {
      const d = new Date(currentDate);
      d.setDate(d.getDate() + 7);
      setCurrentDate(d);
    } else {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    }
    setSelectedDate(null);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(formatDateKey(new Date()));
  };

  const getMealsForDate = (dateKey: string) => meals.filter((m) => m.date === dateKey);

  const getMealForSlot = (dateKey: string, meal: "breakfast" | "lunch" | "dinner") =>
    meals.find((m) => m.date === dateKey && m.meal === meal);

  const saveMeal = () => {
    if (!editingMeal || !mealInput.trim()) return;
    const existing = getMealForSlot(editingMeal.date, editingMeal.meal);
    if (existing) {
      setMeals(meals.map((m) => (m.id === existing.id ? { ...m, title: mealInput.trim() } : m)));
    } else {
      setMeals([...meals, { id: crypto.randomUUID(), date: editingMeal.date, meal: editingMeal.meal, title: mealInput.trim() }]);
    }
    setEditingMeal(null);
    setMealInput("");
  };

  const removeMeal = (id: string) => setMeals(meals.filter((m) => m.id !== id));

  const startEditing = (dateKey: string, meal: "breakfast" | "lunch" | "dinner") => {
    const existing = getMealForSlot(dateKey, meal);
    setEditingMeal({ date: dateKey, meal });
    setMealInput(existing?.title || "");
  };

  const selectedDateObj = selectedDate ? new Date(selectedDate + "T00:00:00") : null;

  const headerLabel = useMemo(() => {
    if (viewMode === "week") {
      const start = weekDays[0];
      const end = weekDays[6];
      const sameMonth = start.getMonth() === end.getMonth();
      if (sameMonth) {
        return `${MONTH_NAMES[start.getMonth()]} ${start.getDate()} – ${end.getDate()}, ${start.getFullYear()}`;
      }
      return `${MONTH_NAMES[start.getMonth()].slice(0, 3)} ${start.getDate()} – ${MONTH_NAMES[end.getMonth()].slice(0, 3)} ${end.getDate()}`;
    }
    return `${MONTH_NAMES[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
  }, [viewMode, currentDate, weekDays]);

  const noRecipes = recipes.length === 0;

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-amber-900 mb-2">📅 Meal Planner</h1>
      <p className="text-amber-600 mb-6 text-lg">Plan your meals for the week ahead</p>

      {/* View toggle + Randomise CTA */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex bg-amber-100 rounded-xl p-1">
          <button
            onClick={() => setViewMode("month")}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              viewMode === "month" ? "bg-amber-600 text-white" : "text-amber-700 hover:bg-amber-200"
            }`}
          >
            Month
          </button>
          <button
            onClick={() => setViewMode("week")}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              viewMode === "week" ? "bg-amber-600 text-white" : "text-amber-700 hover:bg-amber-200"
            }`}
          >
            Week
          </button>
        </div>

        <button
          onClick={randomiseRange}
          disabled={noRecipes || shuffling}
          className={`ml-auto px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            noRecipes
              ? "bg-gray-200 text-gray-400 cursor-not-allowed"
              : shuffling
              ? "bg-purple-500 text-white animate-pulse"
              : "bg-purple-600 text-white hover:bg-purple-700 hover:scale-105"
          }`}
        >
          {shuffling ? "🎰 Shuffling..." : `🎲 Randomise ${viewMode === "week" ? "Week" : "Month"}`}
        </button>
      </div>

      {/* Calendar */}
      <div className="bg-white rounded-2xl shadow-sm border border-amber-200 mb-6 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 bg-amber-600 text-white">
          <button onClick={prevPeriod} className="p-2 hover:bg-amber-700 rounded-xl text-xl">◀</button>
          <div className="text-center">
            <h2 className="text-lg sm:text-2xl font-bold">{headerLabel}</h2>
            <button onClick={goToToday} className="text-amber-200 text-sm hover:text-white">Today</button>
          </div>
          <button onClick={nextPeriod} className="p-2 hover:bg-amber-700 rounded-xl text-xl">▶</button>
        </div>

        {viewMode === "month" ? (
          <>
            {/* Day headers */}
            <div className="grid grid-cols-7 bg-amber-50 border-b border-amber-200">
              {DAY_NAMES.map((day) => (
                <div key={day} className="py-2 text-center text-sm font-semibold text-amber-700">{day}</div>
              ))}
            </div>

            {/* Month grid */}
            <div className="grid grid-cols-7">
              {calendarDays.map((day, i) => {
                if (!day) return <div key={`empty-${i}`} className="h-16 sm:h-20 bg-gray-50 border-b border-r border-amber-100" />;
                const dateKey = formatDateKey(day);
                const dayMeals = getMealsForDate(dateKey);
                const isToday = isSameDay(day, today);
                const isSelected = selectedDate === dateKey;
                return (
                  <button
                    key={dateKey}
                    onClick={() => setSelectedDate(dateKey)}
                    className={`h-16 sm:h-20 border-b border-r border-amber-100 p-1 text-left transition-colors relative ${
                      isSelected ? "bg-amber-100 ring-2 ring-amber-500 ring-inset" : isToday ? "bg-amber-50" : "hover:bg-amber-50"
                    }`}
                  >
                    <span className={`text-xs sm:text-sm font-medium ${isToday ? "bg-amber-600 text-white w-6 h-6 rounded-full flex items-center justify-center" : "text-amber-800"}`}>
                      {day.getDate()}
                    </span>
                    {dayMeals.length > 0 && (
                      <div className="flex gap-0.5 mt-1 flex-wrap">
                        {dayMeals.map((m) => (
                          <span key={m.id} className={`w-2 h-2 rounded-full ${m.meal === "breakfast" ? "bg-orange-400" : m.meal === "lunch" ? "bg-yellow-400" : "bg-indigo-400"}`} />
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          /* Week view */
          <div className="divide-y divide-amber-100">
            {weekDays.map((day) => {
              const dateKey = formatDateKey(day);
              const dayMeals = getMealsForDate(dateKey);
              const isToday = isSameDay(day, today);
              const isSelected = selectedDate === dateKey;
              return (
                <button
                  key={dateKey}
                  onClick={() => setSelectedDate(dateKey)}
                  className={`w-full flex items-center gap-4 px-4 sm:px-6 py-3 text-left transition-colors ${
                    isSelected ? "bg-amber-100" : isToday ? "bg-amber-50" : "hover:bg-amber-50"
                  }`}
                >
                  <div className={`w-12 text-center flex-shrink-0 ${isToday ? "font-bold" : ""}`}>
                    <div className="text-xs text-amber-500 uppercase">{DAY_NAMES[day.getDay()]}</div>
                    <div className={`text-lg font-bold ${isToday ? "bg-amber-600 text-white w-8 h-8 rounded-full flex items-center justify-center mx-auto" : "text-amber-800"}`}>
                      {day.getDate()}
                    </div>
                  </div>
                  <div className="flex-1 flex flex-wrap gap-2 min-w-0">
                    {MEAL_TYPES.map(({ key, emoji }) => {
                      const m = dayMeals.find((meal) => meal.meal === key);
                      return m ? (
                        <span key={key} className="inline-flex items-center gap-1 text-sm bg-amber-100 text-amber-800 px-2 py-1 rounded-lg truncate max-w-[140px]">
                          {emoji} {m.title}
                        </span>
                      ) : (
                        <span key={key} className="inline-flex items-center gap-1 text-sm text-amber-300 px-2 py-1">
                          {emoji} —
                        </span>
                      );
                    })}
                  </div>
                  <span className="text-amber-400 flex-shrink-0">›</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Legend */}
        <div className="flex gap-4 px-4 sm:px-6 py-3 bg-amber-50 border-t border-amber-200 text-sm text-amber-600">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-400" /> Breakfast</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400" /> Lunch</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-indigo-400" /> Dinner</span>
        </div>
      </div>

      {/* Selected Day Detail */}
      {selectedDate && selectedDateObj && (
        <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-amber-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-amber-900">
              {selectedDateObj.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </h3>
            <button
              onClick={() => surpriseDay(selectedDate)}
              disabled={noRecipes}
              className={`px-3 py-2 rounded-xl text-sm font-semibold transition-all ${
                noRecipes ? "bg-gray-200 text-gray-400 cursor-not-allowed" : "bg-purple-600 text-white hover:bg-purple-700 hover:scale-105"
              }`}
            >
              🎲 Surprise whole day
            </button>
          </div>

          <div className="space-y-4">
            {MEAL_TYPES.map(({ key, label, emoji }) => {
              const meal = getMealForSlot(selectedDate, key);
              const isEditing = editingMeal?.date === selectedDate && editingMeal?.meal === key;

              return (
                <div
                  key={key}
                  className={`rounded-xl border p-4 ${
                    key === "breakfast" ? "border-orange-200 bg-orange-50" : key === "lunch" ? "border-yellow-200 bg-yellow-50" : "border-indigo-200 bg-indigo-50"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-lg text-amber-900">{emoji} {label}</h4>
                    <div className="flex items-center gap-2">
                      {!isEditing && (
                        <button
                          onClick={() => surpriseMeal(selectedDate, key)}
                          disabled={noRecipes}
                          className={`text-sm px-2 py-1 rounded-lg transition-colors ${
                            noRecipes ? "text-gray-300 cursor-not-allowed" : "text-purple-500 hover:bg-purple-100 hover:text-purple-700"
                          }`}
                          title="Surprise me!"
                        >
                          🎲
                        </button>
                      )}
                      {meal && !isEditing && (
                        <button onClick={() => removeMeal(meal.id)} className="text-red-400 hover:text-red-600 text-sm px-2 py-1 rounded-lg hover:bg-red-50">
                          Remove
                        </button>
                      )}
                    </div>
                  </div>

                  {isEditing ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={mealInput}
                        onChange={(e) => setMealInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && saveMeal()}
                        placeholder="What are you having?"
                        autoFocus
                        className="flex-1 min-w-0 px-4 py-2 text-lg border border-amber-300 rounded-xl focus:ring-2 focus:ring-amber-500 bg-white"
                      />
                      <button onClick={saveMeal} className="px-4 py-2 bg-amber-600 text-white rounded-xl font-semibold hover:bg-amber-700 flex-shrink-0">
                        Save
                      </button>
                      <button
                        onClick={() => { setEditingMeal(null); setMealInput(""); }}
                        className="px-3 py-2 text-amber-600 hover:bg-amber-100 rounded-xl flex-shrink-0"
                      >
                        ✕
                      </button>
                    </div>
                  ) : meal ? (
                    <button onClick={() => startEditing(selectedDate, key)} className="text-lg text-amber-800 hover:underline text-left w-full">
                      {meal.title}
                    </button>
                  ) : (
                    <button
                      onClick={() => startEditing(selectedDate, key)}
                      className="w-full text-left px-4 py-3 border-2 border-dashed border-amber-300 rounded-xl text-amber-400 hover:text-amber-600 hover:border-amber-400 transition-colors text-lg"
                    >
                      + Add {label.toLowerCase()}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Quick links */}
          <div className="mt-6 pt-4 border-t border-amber-200 flex flex-wrap gap-3">
            <Link href="/recipes" className="text-amber-600 hover:text-amber-800 text-sm font-medium">📖 Browse recipes for ideas →</Link>
            <Link href="/discover" className="text-amber-600 hover:text-amber-800 text-sm font-medium">🎲 Get a random suggestion →</Link>
          </div>
        </div>
      )}

      {/* No date selected */}
      {!selectedDate && (
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-amber-200 text-center">
          <div className="text-5xl mb-4">👆</div>
          <h3 className="text-xl font-bold text-amber-800 mb-2">Select a day</h3>
          <p className="text-amber-600 text-lg">Tap a date on the calendar to plan your meals</p>
        </div>
      )}

      {/* No recipes warning */}
      {noRecipes && (
        <div className="mt-4 bg-amber-50 rounded-xl p-4 border border-amber-200 text-center">
          <p className="text-amber-700 text-sm">
            💡 <Link href="/recipes/new" className="font-semibold underline">Add some recipes</Link> to unlock the &quot;Surprise Me&quot; feature!
          </p>
        </div>
      )}
    </div>
  );
}
