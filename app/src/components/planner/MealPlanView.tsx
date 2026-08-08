"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { Button, IconButton } from "@radix-ui/themes";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  Cross2Icon,
} from "@radix-ui/react-icons";
import { CheckCircle2, ChefHat, ShoppingBasket, Dices, Ban, Undo2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
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
import {
  mergeLoggedAttempts,
  type LoggedAttempt,
} from "@/lib/planner-logged-meals";
import {
  pickRecipesForSlots,
  findFillableSlots,
  type SlotRef,
} from "@/lib/planner-randomize";
import {
  blockCoversSlot,
  blockedMembersForSlot,
  expandBlocksToSlots,
  type HouseholdBlockScope,
  type HouseholdMemberBlockView,
} from "@/lib/household-blocking";
import {
  formatServingLabel,
  parseYieldServings,
  scaleServingsForEaters,
} from "@/lib/household-portions";
import { RandomizeReviewDialog } from "./RandomizeReviewDialog";

interface MealPlan {
  id: number;
  date: string;
  mealType: string;
  recipeId: number;
  servings: number;
  notes: string | null;
  cookedAt: string | null;
  recipe?: { id: number; title: string; yield: string | null };
  // Household shared plan: who added this slot (null for solo plans).
  addedByName?: string | null;
  // True when this entry comes from a logged cook attempt rather than a
  // planned meal. Logged entries are read-only in the calendar.
  loggedAttempt?: boolean;
}

// Household summary returned by GET /api/meal-plans when the user is in
// a household — the plan is then shared across all members.
interface PlanHousehold {
  id: number;
  name: string;
  memberCount: number;
}

// A blocked meal slot ("eating out / something else"), as returned by
// GET /api/meal-plans.
interface MealPlanBlock {
  id: number;
  date: string;
  mealType: string;
  note: string | null;
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
  const { user } = useAuth();
  const [viewType, setViewType] = useState<ViewType>("week");
  const [offset, setOffset] = useState(0);
  const [plans, setPlans] = useState<MealPlan[]>([]);
  const [attempts, setAttempts] = useState<LoggedAttempt[]>([]);
  const [blocks, setBlocks] = useState<MealPlanBlock[]>([]);
  // Household shared-plan state: present only when the user is in a
  // household. memberBlocks are per-member "I'm out" blocks visible to
  // everyone with attribution.
  const [household, setHousehold] = useState<PlanHousehold | null>(null);
  const [memberBlocks, setMemberBlocks] = useState<HouseholdMemberBlockView[]>([]);
  const [blockMenuSlot, setBlockMenuSlot] = useState<{ date: string; mealType: string } | null>(null);
  const [randomizing, setRandomizing] = useState(false);
  const [review, setReview] = useState<{ slots: SlotRef[]; label: string } | null>(null);
  const [lastRandomized, setLastRandomized] = useState<{ planIds: number[]; label: string } | null>(null);
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

  // Fetch meal plans and logged cook attempts
  useEffect(() => {
    let cancelled = false;

    async function loadMealPlans() {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/meal-plans?startDate=${currentDateRange.startDate}&endDate=${currentDateRange.endDate}`
        );
        const data = await response.json();
        if (!cancelled) {
          // Tolerate the legacy bare-array response shape.
          if (Array.isArray(data)) {
            setPlans(data);
            setAttempts([]);
            setBlocks([]);
          } else {
            setPlans(Array.isArray(data?.plans) ? data.plans : []);
            setAttempts(Array.isArray(data?.attempts) ? data.attempts : []);
            setBlocks(Array.isArray(data?.blocks) ? data.blocks : []);
            setHousehold(data?.household ?? null);
            setMemberBlocks(Array.isArray(data?.memberBlocks) ? data.memberBlocks : []);
          }
        }
      } catch {
        if (!cancelled) {
          setPlans([]);
          setAttempts([]);
          setBlocks([]);
          setHousehold(null);
          setMemberBlocks([]);
        }
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
        // Planning a meal lifts any block on the slot (server-side too).
        setBlocks((prev) =>
          prev.filter((b) => !(b.date === addingSlot.date && b.mealType === addingSlot.mealType))
        );
        setMemberBlocks((prev) =>
          prev.filter(
            (b) =>
              !(
                b.userId === user?.id &&
                b.scope === "slot" &&
                b.date === addingSlot.date &&
                b.mealType === addingSlot.mealType
              )
          )
        );
        closeAddDialog();
        addToast("Meal added", "success");
      }
    } catch {
      addToast("Failed to add meal", "error");
    }
  }, [addingSlot, selectedRecipeId, closeAddDialog, addToast, user]);

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

  const getBlockForSlot = useCallback(
    (date: string, mealType: string) =>
      blocks.find((b) => b.date === date && b.mealType === mealType) ?? null,
    [blocks]
  );

  // ── Household shared plan ────────────────────────────────
  const getOutMembersForSlot = useCallback(
    (date: string, mealType: string) =>
      blockedMembersForSlot(memberBlocks, date, mealType),
    [memberBlocks]
  );

  // Slots the current member blocked stay out of time-frame randomize.
  const fillableBlocks = useMemo(() => {
    if (!household || !user) return blocks;
    return expandBlocksToSlots(memberBlocks, user.id, currentDateRange.dates, MEAL_TYPES);
  }, [household, user, blocks, memberBlocks, currentDateRange.dates]);

  // Per-member "I'm not eating" block at slot/day/week/month scope.
  const blockForMe = useCallback(
    async (date: string, mealType: string, scope: HouseholdBlockScope) => {
      try {
        const res = await fetch("/api/meal-plans/blocks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ date, mealType, scope }),
        });
        const block = await res.json();
        if (!res.ok) throw new Error(block?.error || "Failed to block");
        setMemberBlocks((prev) => [
          ...prev.filter(
            (b) =>
              !(
                b.userId === block.userId &&
                b.scope === block.scope &&
                b.date === block.date &&
                b.mealType === block.mealType
              )
          ),
          block,
        ]);
        addToast("Marked you as out", "success");
      } catch {
        addToast("Failed to mark you as out", "error");
      }
    },
    [addToast]
  );

  const unblockForMe = useCallback(
    async (block: HouseholdMemberBlockView) => {
      try {
        await fetch("/api/meal-plans/blocks", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date: block.date,
            mealType: block.mealType || undefined,
            scope: block.scope,
          }),
        });
        setMemberBlocks((prev) => prev.filter((b) => b.id !== block.id));
      } catch {
        addToast("Failed to unblock", "error");
      }
    },
    [addToast]
  );

  // Lifts every block of mine covering this slot (any scope).
  const unblockSlotForMe = useCallback(
    async (date: string, mealType: string) => {
      const mine = memberBlocks.filter(
        (b) => b.userId === user?.id && blockCoversSlot(b, date, mealType)
      );
      for (const block of mine) {
        await unblockForMe(block);
      }
    },
    [memberBlocks, user, unblockForMe]
  );

  // Display-side serving scale: recipe yield is the base for the full
  // household; it shrinks by the share of members still eating. Stored
  // quantities are never rewritten.
  const getServingLabel = useCallback(
    (plan: MealPlan, date: string, mealType: string): string | null => {
      if (!household) return null;
      const base = parseYieldServings(plan.recipe?.yield);
      if (!base) return null;
      const blockedCount = getOutMembersForSlot(date, mealType).length;
      if (blockedCount === 0) return null;
      return formatServingLabel(
        scaleServingsForEaters({
          baseServings: base * (plan.servings || 1),
          memberCount: household.memberCount,
          blockedCount,
        })
      );
    },
    [household, getOutMembersForSlot]
  );

  // 🎲 Per-slot randomize: re-rolls that one slot with a weighted pick.
  const randomizeSlot = useCallback(
    async (date: string, mealType: string) => {
      const [pick] = pickRecipesForSlots({ recipes, count: 1 });
      if (!pick) {
        addToast("No recipes to pick from", "error");
        return;
      }
      try {
        const slotPlans = plans.filter(
          (p) => p.date === date && p.mealType === mealType
        );
        await Promise.all(
          slotPlans.map((p) => fetch(`/api/meal-plans/${p.id}`, { method: "DELETE" }))
        );
        const res = await fetch("/api/meal-plans", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ date, mealType, recipeId: pick.id, servings: 1 }),
        });
        const newPlan = await res.json();
        if (!res.ok) throw new Error(newPlan?.error || "Failed to plan meal");
        setPlans((prev) => [
          ...prev.filter((p) => !(p.date === date && p.mealType === mealType)),
          newPlan,
        ]);
        addToast(`${MEAL_LABELS[mealType]}: ${pick.title}`, "success");
      } catch {
        addToast("Failed to randomize meal", "error");
      }
    },
    [recipes, plans, addToast]
  );

  const blockSlot = useCallback(
    async (date: string, mealType: string) => {
      try {
        const res = await fetch("/api/meal-plans/blocks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ date, mealType }),
        });
        const block = await res.json();
        if (!res.ok) throw new Error(block?.error || "Failed to block meal");
        setBlocks((prev) => [
          ...prev.filter((b) => !(b.date === date && b.mealType === mealType)),
          block,
        ]);
        // Blocking clears the slot's plans server-side too.
        setPlans((prev) => prev.filter((p) => !(p.date === date && p.mealType === mealType)));
        addToast("Meal blocked — eating something else", "success");
      } catch {
        addToast("Failed to block meal", "error");
      }
    },
    [addToast]
  );

  const unblockSlot = useCallback(
    async (date: string, mealType: string) => {
      try {
        await fetch("/api/meal-plans/blocks", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ date, mealType }),
        });
        setBlocks((prev) => prev.filter((b) => !(b.date === date && b.mealType === mealType)));
      } catch {
        addToast("Failed to unblock meal", "error");
      }
    },
    [addToast]
  );

  // Time-frame randomize goes through a review dialog first — the user
  // marks slots Fill vs Eating out before the roll.
  const openRandomizeReview = useCallback(
    (dates: string[], label: string) => {
      const slots = findFillableSlots({ dates, plans, blocks: fillableBlocks });
      if (slots.length === 0) {
        addToast("No empty slots to fill", "error");
        return;
      }
      setReview({ slots, label });
    },
    [plans, fillableBlocks, addToast]
  );

  const confirmRandomize = useCallback(
    async (fillSlots: SlotRef[], eatingOutSlots: SlotRef[]) => {
      const label = review?.label ?? "range";
      const picks = pickRecipesForSlots({ recipes, count: fillSlots.length });
      if (fillSlots.length > 0 && picks.length === 0) {
        addToast("No recipes to pick from", "error");
        return;
      }
      setRandomizing(true);
      try {
        // Mark eating-out slots as blocked. In a household this is a
        // per-member "I'm out" block (the shared slot's plans stay).
        for (const slot of eatingOutSlots) {
          const res = await fetch("/api/meal-plans/blocks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ date: slot.date, mealType: slot.mealType }),
          });
          const block = await res.json();
          if (res.ok) {
            if (household) {
              setMemberBlocks((prev) => [
                ...prev.filter(
                  (b) =>
                    !(
                      b.userId === block.userId &&
                      b.scope === block.scope &&
                      b.date === block.date &&
                      b.mealType === block.mealType
                    )
                ),
                block,
              ]);
            } else {
              setBlocks((prev) => [
                ...prev.filter((b) => !(b.date === slot.date && b.mealType === slot.mealType)),
                block,
              ]);
            }
          }
        }

        const newPlans: MealPlan[] = [];
        for (let i = 0; i < fillSlots.length; i++) {
          const res = await fetch("/api/meal-plans", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              date: fillSlots[i].date,
              mealType: fillSlots[i].mealType,
              recipeId: picks[i].id,
              servings: 1,
            }),
          });
          if (res.ok) newPlans.push(await res.json());
        }
        setPlans((prev) => [...prev, ...newPlans]);
        setReview(null);
        if (newPlans.length > 0) {
          setLastRandomized({ planIds: newPlans.map((p) => p.id), label });
        }
        const parts = [`Planned ${newPlans.length} meal${newPlans.length === 1 ? "" : "s"}`];
        if (eatingOutSlots.length > 0) parts.push(`${eatingOutSlots.length} marked eating out`);
        addToast(parts.join(" · "), "success");
      } catch {
        addToast("Randomize failed partway — some slots may be filled", "error");
      } finally {
        setRandomizing(false);
      }
    },
    [review, recipes, addToast, household]
  );

  // One-step undo for the last randomize roll.
  const undoRandomize = useCallback(async () => {
    if (!lastRandomized) return;
    const { planIds } = lastRandomized;
    setLastRandomized(null);
    try {
      await Promise.all(
        planIds.map((id) => fetch(`/api/meal-plans/${id}`, { method: "DELETE" }))
      );
      const removed = new Set(planIds);
      setPlans((prev) => prev.filter((p) => !removed.has(p.id)));
      addToast("Randomize undone", "success");
    } catch {
      addToast("Undo failed partway — some meals may remain", "error");
    }
  }, [lastRandomized, addToast]);

  // The undo banner is only meaningful for the scope it was created in.
  useEffect(() => {
    setLastRandomized(null);
  }, [offset, viewType]);

  // Logged cook attempts become read-only calendar entries so the plan
  // shows what was actually cooked, not just what was planned. Merge
  // rules live in @/lib/planner-logged-meals (unit-tested there).
  const loggedEntries = useMemo<MealPlan[]>(
    () =>
      mergeLoggedAttempts({
        plans,
        attempts,
        visibleDates: currentDateRange.dates,
      }),
    [attempts, plans, currentDateRange.dates]
  );

  const allEntries = useMemo(
    () => [...plans, ...loggedEntries],
    [plans, loggedEntries]
  );

  const getPlansForSlot = (date: string, mealType: string) =>
    allEntries.filter((p) => p.date === date && p.mealType === mealType);

  const getPlansForDate = (date: string) =>
    allEntries.filter((p) => p.date === date);

  const buildCalendarEvents = (mealPlans: MealPlan[]): CalendarEvent[] => {
    return mealPlans
      .filter((plan) => !plan.loggedAttempt)
      .map((plan) => {
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

          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Button
              variant="solid"
              color="gray"
              disabled={randomizing || recipes.length === 0}
              onClick={() => openRandomizeReview(currentDateRange.dates, `this ${viewType}`)}
            >
              <Dices className="mr-1 h-4 w-4" />
              {randomizing ? "Randomizing…" : `Randomize ${viewType}`}
            </Button>
            {plans.length > 0 && onOpenShoppingList && (
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
            {plans.length > 0 && (
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
            )}
          </div>

          {lastRandomized && (
            <div className="mt-3 flex items-center justify-center gap-3 rounded-xl border border-ui-accent/15 bg-ui-accent/5 px-3 py-2 text-xs text-ui-text">
              <span>
                Planned {lastRandomized.planIds.length} meal{lastRandomized.planIds.length === 1 ? "" : "s"} for {lastRandomized.label}
              </span>
              <button
                type="button"
                onClick={undoRandomize}
                className="inline-flex items-center gap-1 font-semibold text-[#800020] hover:underline"
              >
                <Undo2 className="h-3.5 w-3.5" />
                Undo
              </button>
              <button
                type="button"
                onClick={() => setLastRandomized(null)}
                className="text-neutral-400 hover:text-neutral-600"
                aria-label="Dismiss undo banner"
              >
                <Cross2Icon className="h-3 w-3" />
              </button>
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
                      const slotBlock = getBlockForSlot(date, mealType);
                      const outMembers = household ? getOutMembersForSlot(date, mealType) : [];
                      return (
                        <div
                          key={mealType}
                          className="rounded-lg border border-neutral-100 bg-neutral-50/50 p-2"
                        >
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <p className="text-[10px] font-medium uppercase tracking-wide text-neutral-400">
                              {MEAL_LABELS[mealType]}
                            </p>
                            <span className="flex items-center gap-1">
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
                              {!slotBlock && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => randomizeSlot(date, mealType)}
                                    disabled={recipes.length === 0}
                                    className="flex h-6 w-6 items-center justify-center rounded-md text-neutral-400 transition-colors hover:bg-white hover:text-[#800020] disabled:opacity-30"
                                    aria-label={`Randomize ${mealType}`}
                                    title={`Randomize ${mealType}`}
                                  >
                                    <Dices className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => household ? setBlockMenuSlot({ date, mealType }) : blockSlot(date, mealType)}
                                    className="flex h-6 w-6 items-center justify-center rounded-md text-neutral-400 transition-colors hover:bg-white hover:text-neutral-700"
                                    aria-label={household ? `Mark me as not eating ${mealType}` : `Block ${mealType} — eating something else`}
                                    title={household ? "I'm not eating" : "Block — eating something else"}
                                  >
                                    <Ban className="h-3.5 w-3.5" />
                                  </button>
                                </>
                              )}
                            </span>
                          </div>
                          {slotBlock ? (
                            <div className="flex items-center justify-between gap-2 rounded-md border border-dashed border-neutral-300 bg-neutral-100/60 px-2.5 py-2">
                              <span className="text-[11px] italic text-neutral-500">
                                {slotBlock.note || "Eating something else"}
                              </span>
                              <button
                                type="button"
                                onClick={() => unblockSlot(date, mealType)}
                                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-neutral-400 transition-colors hover:bg-white hover:text-neutral-700"
                                aria-label={`Unblock ${mealType}`}
                                title="Unblock"
                              >
                                <Undo2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ) : (
                            <>
                              {outMembers.length > 0 && (
                                <div className="mb-1.5 flex flex-wrap gap-1">
                                  {outMembers.map((m) => (
                                    <button
                                      key={m.userId}
                                      type="button"
                                      disabled={m.userId !== user?.id}
                                      onClick={() => unblockSlotForMe(date, mealType)}
                                      title={m.userId === user?.id ? "Tap to mark yourself back in" : undefined}
                                      className={`rounded-full bg-neutral-200/70 px-2 py-0.5 text-[10px] font-medium text-neutral-600 ${
                                        m.userId === user?.id ? "transition hover:bg-neutral-300" : "cursor-default"
                                      }`}
                                    >
                                      Out: {m.userName ?? "member"}
                                    </button>
                                  ))}
                                </div>
                              )}
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
                                        {plan.loggedAttempt ? "Logged" : "Cooked"}
                                      </span>
                                    )}
                                    {household && !plan.loggedAttempt && (() => {
                                      const servingLabel = getServingLabel(plan, date, mealType);
                                      if (!plan.addedByName && !servingLabel) return null;
                                      return (
                                        <span className="mt-0.5 block text-[10px] text-neutral-400">
                                          {[
                                            plan.addedByName ? `added by ${plan.addedByName}` : null,
                                            servingLabel,
                                          ].filter(Boolean).join(" · ")}
                                        </span>
                                      );
                                    })()}
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
                                  {!plan.loggedAttempt && (
                                    <IconButton
                                      variant="ghost"
                                      size="1"
                                      color="red"
                                      className="h-4 w-4 opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                                      onClick={() => removePlan(plan.id)}
                                    >
                                      <Cross2Icon className="h-3 w-3" />
                                    </IconButton>
                                  )}
                                </div>
                              ))}
                              </div>
                              <button
                                onClick={() => openAddDialog(date, mealType)}
                                className="mt-1 flex w-full items-center justify-center gap-1 rounded-md border border-dashed border-neutral-200 py-1 text-[10px] text-neutral-400 transition-colors hover:border-[#800020]/30 hover:text-[#800020]"
                              >
                                <PlusIcon className="h-3 w-3" />
                              </button>
                            </>
                          )}
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
                  const dayBlocks = blocks.filter((b) => b.date === date);
                  const baseDate = dateFromKey(todayKey);
                  const currentMonth = new Date(
                    baseDate.getFullYear(),
                    baseDate.getMonth() + offset,
                    1
                  ).getMonth();
                  const isCurrentMonth = month === currentMonth;
                  const dotCount = dayPlans.length + dayBlocks.length;

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
                          {dayBlocks.slice(0, Math.max(0, 3 - dayPlans.length)).map((block) => (
                            <div
                              key={block.id}
                              className="h-1.5 rounded-full bg-neutral-300 opacity-80"
                              title={`${MEAL_LABELS[block.mealType]}: blocked — eating something else`}
                            />
                          ))}
                          {dotCount > 3 && (
                            <div className="text-[9px] text-neutral-500">
                              +{dotCount - 3} more
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
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      openRandomizeReview(
                        [selectedDayDate],
                        formatDate(selectedDayDate, todayKey).full
                      )
                    }
                    disabled={recipes.length === 0}
                    className="inline-flex h-7 items-center gap-1 rounded-md border border-neutral-200 px-2 text-[11px] font-medium text-neutral-500 transition hover:border-[#800020]/40 hover:text-[#800020] disabled:opacity-40"
                  >
                    <Dices className="h-3 w-3" />
                    Randomize day
                  </button>
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
              </div>
              <div className="space-y-2">
                {MEAL_TYPES.map((mealType) => {
                  const slotPlans = getPlansForSlot(selectedDayDate, mealType);
                  const slotBlock = getBlockForSlot(selectedDayDate, mealType);
                  const outMembers = household ? getOutMembersForSlot(selectedDayDate, mealType) : [];

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
                          {!slotBlock && (
                            <>
                              <button
                                type="button"
                                onClick={() => randomizeSlot(selectedDayDate, mealType)}
                                disabled={recipes.length === 0}
                                className="inline-flex h-7 items-center gap-1 rounded-md border border-neutral-200 px-2 text-[11px] font-medium text-neutral-500 transition hover:border-[#800020]/40 hover:text-[#800020] disabled:opacity-40"
                              >
                                <Dices className="h-3 w-3" />
                                Random
                              </button>
                              <button
                                type="button"
                                onClick={() => openAddDialog(selectedDayDate, mealType)}
                                className="inline-flex h-7 items-center gap-1 rounded-md border border-dashed border-neutral-300 px-2.5 text-[11px] font-medium text-neutral-600 transition hover:border-[#800020]/40 hover:text-[#800020]"
                              >
                                <PlusIcon className="h-3 w-3" />
                                Add meal
                              </button>
                              <button
                                type="button"
                                onClick={() => household ? setBlockMenuSlot({ date: selectedDayDate, mealType }) : blockSlot(selectedDayDate, mealType)}
                                className="inline-flex h-7 w-7 items-center justify-center rounded-md text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-700"
                                aria-label={household ? `Mark me as not eating ${mealType}` : `Block ${mealType} — eating something else`}
                                title={household ? "I'm not eating" : "Block — eating something else"}
                              >
                                <Ban className="h-3.5 w-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {slotBlock ? (
                        <div className="flex items-center justify-between gap-2 rounded-md border border-dashed border-neutral-300 bg-neutral-100/60 px-3 py-2">
                          <span className="text-xs italic text-neutral-500">
                            {slotBlock.note || "Eating something else"}
                          </span>
                          <button
                            type="button"
                            onClick={() => unblockSlot(selectedDayDate, mealType)}
                            className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-[11px] font-medium text-neutral-500 transition hover:bg-white hover:text-neutral-700"
                          >
                            <Undo2 className="h-3 w-3" />
                            Unblock
                          </button>
                        </div>
                      ) : slotPlans.length === 0 ? (
                        <>
                          {outMembers.length > 0 && (
                            <div className="mb-1.5 flex flex-wrap gap-1">
                              {outMembers.map((m) => (
                                <button
                                  key={m.userId}
                                  type="button"
                                  disabled={m.userId !== user?.id}
                                  onClick={() => unblockSlotForMe(selectedDayDate, mealType)}
                                  title={m.userId === user?.id ? "Tap to mark yourself back in" : undefined}
                                  className={`rounded-full bg-neutral-200/70 px-2 py-0.5 text-[10px] font-medium text-neutral-600 ${
                                    m.userId === user?.id ? "transition hover:bg-neutral-300" : "cursor-default"
                                  }`}
                                >
                                  Out: {m.userName ?? "member"}
                                </button>
                              ))}
                            </div>
                          )}
                          <p className="rounded-md bg-white px-3 py-2 text-xs text-neutral-400">
                            No meal planned.
                          </p>
                        </>
                      ) : (
                        <div className="space-y-1.5">
                          {outMembers.length > 0 && (
                            <div className="mb-1.5 flex flex-wrap gap-1">
                              {outMembers.map((m) => (
                                <button
                                  key={m.userId}
                                  type="button"
                                  disabled={m.userId !== user?.id}
                                  onClick={() => unblockSlotForMe(selectedDayDate, mealType)}
                                  title={m.userId === user?.id ? "Tap to mark yourself back in" : undefined}
                                  className={`rounded-full bg-neutral-200/70 px-2 py-0.5 text-[10px] font-medium text-neutral-600 ${
                                    m.userId === user?.id ? "transition hover:bg-neutral-300" : "cursor-default"
                                  }`}
                                >
                                  Out: {m.userName ?? "member"}
                                </button>
                              ))}
                            </div>
                          )}
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
                                    {plan.loggedAttempt ? "Logged" : "Cooked"}
                                  </span>
                                )}
                                {household && !plan.loggedAttempt && (() => {
                                  const servingLabel = getServingLabel(plan, selectedDayDate, mealType);
                                  if (!plan.addedByName && !servingLabel) return null;
                                  return (
                                    <span className="mt-0.5 block text-[10px] text-neutral-400">
                                      {[
                                        plan.addedByName ? `added by ${plan.addedByName}` : null,
                                        servingLabel,
                                      ].filter(Boolean).join(" · ")}
                                    </span>
                                  );
                                })()}
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
                              {!plan.loggedAttempt && (
                                <IconButton
                                  variant="ghost"
                                  size="1"
                                  color="red"
                                  className="h-4 w-4"
                                  onClick={() => removePlan(plan.id)}
                                >
                                  <Cross2Icon className="h-3 w-3" />
                                </IconButton>
                              )}
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
        {/* Household per-member blocking: pick how long you're out.
            Only mounts for household members — solo users keep the
            one-tap slot block. */}
        {blockMenuSlot && (
          <>
            <div
              className="fixed inset-0 z-40 bg-neutral-950/40 backdrop-blur-sm"
              onClick={() => setBlockMenuSlot(null)}
            />
            <div className="fixed inset-x-4 bottom-20 z-50 mx-auto max-w-sm rounded-xl bg-white p-5 shadow-xl md:bottom-auto md:top-1/2 md:-translate-y-1/2">
              <h3 className="text-sm font-semibold text-neutral-900">
                I&rsquo;m not eating
              </h3>
              <p className="mt-1 text-xs text-neutral-500">
                {formatDate(blockMenuSlot.date, todayKey).full} · {MEAL_LABELS[blockMenuSlot.mealType]} — the plan stays for everyone else; you&rsquo;re just not counted in servings.
              </p>
              <div className="mt-4 space-y-2">
                {([
                  ["slot", "Just this meal"],
                  ["day", "This whole day"],
                  ["week", "This week"],
                  ["month", "This month"],
                ] as Array<[HouseholdBlockScope, string]>).map(([scope, label]) => (
                  <button
                    key={scope}
                    type="button"
                    onClick={() => {
                      void blockForMe(blockMenuSlot.date, blockMenuSlot.mealType, scope);
                      setBlockMenuSlot(null);
                    }}
                    className="flex w-full items-center justify-between rounded-lg border border-neutral-200 px-3 py-2.5 text-sm font-medium text-neutral-700 transition hover:border-[#800020]/40 hover:text-[#800020]"
                  >
                    {label}
                    <Ban className="h-3.5 w-3.5 text-neutral-300" />
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setBlockMenuSlot(null)}
                className="mt-3 w-full rounded-lg py-2 text-center text-xs font-medium text-neutral-500 transition hover:bg-neutral-50"
              >
                Cancel
              </button>
            </div>
          </>
        )}
        {review && (
          <RandomizeReviewDialog
            open
            onClose={() => setReview(null)}
            scopeLabel={review.label}
            slots={review.slots}
            busy={randomizing}
            onConfirm={confirmRandomize}
          />
        )}
      </div>
    </div>
  );
}