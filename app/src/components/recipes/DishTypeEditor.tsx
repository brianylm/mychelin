"use client";

import { useEffect, useRef, useState } from "react";
import { DISH_TYPES, DISH_TYPE_LABELS, type DishType } from "@/lib/dish-type";
import { useToast } from "@/context/ToastContext";
import { DishTypeBadges } from "./DishTypeBadges";

interface DishTypeResponse {
  dishTypes: DishType[];
  overridden: boolean;
}

export function DishTypeEditor({
  recipeId,
  editable,
}: {
  recipeId: number;
  editable: boolean;
}) {
  const [dishTypes, setDishTypes] = useState<DishType[]>([]);
  const [overridden, setOverridden] = useState(false);
  const latestRequest = useRef(0);
  const { addToast } = useToast();

  useEffect(() => {
    latestRequest.current += 1;
    let active = true;
    setDishTypes([]);
    setOverridden(false);
    void fetch(`/api/recipes/${recipeId}/dish-types`)
      .then(async (response) => {
        if (!response.ok) throw new Error("Failed to load dish types");
        return (await response.json()) as DishTypeResponse;
      })
      .then((data) => {
        if (active) {
          setDishTypes(data.dishTypes ?? []);
          setOverridden(data.overridden);
        }
      })
      .catch(() => {
        if (active) addToast("Couldn't load dish type", "error");
      });
    return () => {
      active = false;
    };
  }, [recipeId, addToast]);

  const save = async (nextTypes: DishType[] | null) => {
    const requestId = ++latestRequest.current;
    const previousTypes = dishTypes;
    const previousOverridden = overridden;
    setDishTypes(nextTypes ?? []);
    setOverridden(nextTypes !== null);
    try {
      const response = await fetch(`/api/recipes/${recipeId}/dish-types`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dishTypes: nextTypes }),
      });
      if (!response.ok) throw new Error("Failed to save dish types");
      const data = (await response.json()) as DishTypeResponse;
      if (requestId !== latestRequest.current) return;
      setDishTypes(data.dishTypes ?? []);
      setOverridden(data.overridden);
    } catch {
      if (requestId !== latestRequest.current) return;
      setDishTypes(previousTypes);
      setOverridden(previousOverridden);
      addToast("Couldn't save dish type", "error");
    }
  };

  const toggle = (type: DishType) => {
    const next = dishTypes.includes(type)
      ? dishTypes.filter((item) => item !== type)
      : [...dishTypes, type];
    void save(next);
  };

  return (
    <section className="space-y-2">
      <p className="text-xs font-medium text-ui-muted">Dish type</p>
      {editable ? (
        <>
          <div className="flex flex-wrap gap-2">
            {DISH_TYPES.map((type) => {
              const pressed = dishTypes.includes(type);
              return (
                <button
                  key={type}
                  type="button"
                  aria-pressed={pressed}
                  onClick={() => toggle(type)}
                  className={`min-h-11 rounded-full border px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-action ${
                    pressed
                      ? "border-ui-action bg-ui-action text-ui-action-text"
                      : "border-ui-border bg-ui-surface-raised text-ui-text hover:bg-ui-surface-subtle"
                  }`}
                >
                  {DISH_TYPE_LABELS[type]}
                </button>
              );
            })}
            {overridden && (
              <button
                type="button"
                onClick={() => void save(null)}
                className="min-h-11 rounded-full px-3 text-sm text-ui-muted underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-action"
              >
                Automatic
              </button>
            )}
          </div>
          <p className="text-xs text-ui-muted">
            {overridden
              ? "Set by you."
              : "Worked out from the ingredients — tap to correct."}
          </p>
        </>
      ) : dishTypes.length > 0 ? (
        <DishTypeBadges types={dishTypes} />
      ) : (
        <p className="text-xs text-ui-muted">Not set</p>
      )}
    </section>
  );
}
