"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

interface MealEntry {
  id: string;
  date: string; // YYYY-MM-DD
  meal: "breakfast" | "lunch" | "dinner";
  title: string;
  recipeId?: string;
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

export default function PlannerPage() {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [meals, setMeals] = useState<MealEntry[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [editingMeal, setEditingMeal] = useState<{ date: string; meal: "breakfast" | "lunch" | "dinner" } | null>(null);
  const [mealInput, setMealInput] = useState("");

  const today = useMemo(() => new Date(), []);

  // Get calendar grid for current month
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPad = firstDay.getDay(); // 0=Sun
    const days: (Date | null)[] = [];

    // Pad start
    for (let i = 0; i < startPad; i++) days.push(null);
    // Days of month
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push(new Date(year, month, d));
    }
    // Pad end to fill last row
    while (days.length % 7 !== 0) days.push(null);

    return days;
  }, [currentDate]);

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    setSelectedDate(null);
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    setSelectedDate(null);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(formatDateKey(new Date()));
  };

  const getMealsForDate = (dateKey: string) => {
    return meals.filter((m) => m.date === dateKey);
  };

  const getMealForSlot = (dateKey: string, meal: "breakfast" | "lunch" | "dinner") => {
    return meals.find((m) => m.date === dateKey && m.meal === meal);
  };

  const saveMeal = () => {
    if (!editingMeal || !mealInput.trim()) return;

    const existing = getMealForSlot(editingMeal.date, editingMeal.meal);

    if (existing) {
      setMeals(meals.map((m) => (m.id === existing.id ? { ...m, title: mealInput.trim() } : m)));
    } else {
      setMeals([
        ...meals,
        {
          id: crypto.randomUUID(),
          date: editingMeal.date,
          meal: editingMeal.meal,
          title: mealInput.trim(),
        },
      ]);
    }

    setEditingMeal(null);
    setMealInput("");
  };

  const removeMeal = (id: string) => {
    setMeals(meals.filter((m) => m.id !== id));
  };

  const startEditing = (dateKey: string, meal: "breakfast" | "lunch" | "dinner") => {
    const existing = getMealForSlot(dateKey, meal);
    setEditingMeal({ date: dateKey, meal });
    setMealInput(existing?.title || "");
  };

  const selectedDateObj = selectedDate ? new Date(selectedDate + "T00:00:00") : null;

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-amber-900 mb-2">📅 Meal Planner</h1>
      <p className="text-amber-600 mb-6 text-lg">Plan your meals for the week ahead</p>

      {/* Calendar Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-amber-200 mb-6 overflow-hidden">
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 bg-amber-600 text-white">
          <button onClick={prevMonth} className="p-2 hover:bg-amber-700 rounded-xl text-xl">
            ◀
          </button>
          <div className="text-center">
            <h2 className="text-xl sm:text-2xl font-bold">
              {MONTH_NAMES[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>
            <button onClick={goToToday} className="text-amber-200 text-sm hover:text-white">
              Today
            </button>
          </div>
          <button onClick={nextMonth} className="p-2 hover:bg-amber-700 rounded-xl text-xl">
            ▶
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 bg-amber-50 border-b border-amber-200">
          {DAY_NAMES.map((day) => (
            <div key={day} className="py-2 text-center text-sm font-semibold text-amber-700">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7">
          {calendarDays.map((day, i) => {
            if (!day) {
              return <div key={`empty-${i}`} className="h-16 sm:h-20 bg-gray-50 border-b border-r border-amber-100" />;
            }

            const dateKey = formatDateKey(day);
            const dayMeals = getMealsForDate(dateKey);
            const isToday = isSameDay(day, today);
            const isSelected = selectedDate === dateKey;

            return (
              <button
                key={dateKey}
                onClick={() => setSelectedDate(dateKey)}
                className={`h-16 sm:h-20 border-b border-r border-amber-100 p-1 text-left transition-colors relative ${
                  isSelected
                    ? "bg-amber-100 ring-2 ring-amber-500 ring-inset"
                    : isToday
                    ? "bg-amber-50"
                    : "hover:bg-amber-50"
                }`}
              >
                <span
                  className={`text-xs sm:text-sm font-medium ${
                    isToday
                      ? "bg-amber-600 text-white w-6 h-6 rounded-full flex items-center justify-center"
                      : "text-amber-800"
                  }`}
                >
                  {day.getDate()}
                </span>
                {/* Meal dots */}
                {dayMeals.length > 0 && (
                  <div className="flex gap-0.5 mt-1 flex-wrap">
                    {dayMeals.map((m) => (
                      <span
                        key={m.id}
                        className={`w-2 h-2 rounded-full ${
                          m.meal === "breakfast"
                            ? "bg-orange-400"
                            : m.meal === "lunch"
                            ? "bg-yellow-400"
                            : "bg-indigo-400"
                        }`}
                      />
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>

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
          <h3 className="text-xl font-bold text-amber-900 mb-4">
            {selectedDateObj.toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </h3>

          <div className="space-y-4">
            {MEAL_TYPES.map(({ key, label, emoji }) => {
              const meal = getMealForSlot(selectedDate, key);
              const isEditing = editingMeal?.date === selectedDate && editingMeal?.meal === key;

              return (
                <div
                  key={key}
                  className={`rounded-xl border p-4 ${
                    key === "breakfast"
                      ? "border-orange-200 bg-orange-50"
                      : key === "lunch"
                      ? "border-yellow-200 bg-yellow-50"
                      : "border-indigo-200 bg-indigo-50"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-lg text-amber-900">
                      {emoji} {label}
                    </h4>
                    {meal && !isEditing && (
                      <button
                        onClick={() => removeMeal(meal.id)}
                        className="text-red-400 hover:text-red-600 text-sm px-2 py-1 rounded-lg hover:bg-red-50"
                      >
                        Remove
                      </button>
                    )}
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
                      <button
                        onClick={saveMeal}
                        className="px-4 py-2 bg-amber-600 text-white rounded-xl font-semibold hover:bg-amber-700 flex-shrink-0"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setEditingMeal(null);
                          setMealInput("");
                        }}
                        className="px-3 py-2 text-amber-600 hover:bg-amber-100 rounded-xl flex-shrink-0"
                      >
                        ✕
                      </button>
                    </div>
                  ) : meal ? (
                    <button
                      onClick={() => startEditing(selectedDate, key)}
                      className="text-lg text-amber-800 hover:underline text-left w-full"
                    >
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
            <Link
              href="/recipes"
              className="text-amber-600 hover:text-amber-800 text-sm font-medium"
            >
              📖 Browse recipes for ideas →
            </Link>
            <Link
              href="/discover"
              className="text-amber-600 hover:text-amber-800 text-sm font-medium"
            >
              🎲 Get a random suggestion →
            </Link>
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
    </div>
  );
}
