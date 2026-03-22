"use client";

import { useEffect } from "react";

interface SaveMealPlanModalProps {
  isOpen: boolean;
  onSave: () => void;
  onDiscard: () => void;
  onCancel: () => void;
  mealCount: number;
}

export function SaveMealPlanModal({ isOpen, onSave, onDiscard, onCancel, mealCount }: SaveMealPlanModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }

    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-3xl p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <h2 className="text-xl font-bold text-stone-900 mb-3 font-heading">Save your meal plan?</h2>
          <p className="text-stone-500 leading-relaxed">
            You have {mealCount} meal{mealCount !== 1 ? "s" : ""} planned. Would you like to save your progress?
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={onSave}
            className="w-full bg-terracotta text-white py-3.5 rounded-xl text-base font-semibold hover:bg-terracotta-600 transition-colors"
          >
            Save & Continue
          </button>
          <button
            onClick={onDiscard}
            className="w-full bg-red-50 text-red-600 py-3.5 rounded-xl text-base font-semibold hover:bg-red-100 transition-colors"
          >
            Discard Changes
          </button>
          <button
            onClick={onCancel}
            className="w-full bg-stone-100 text-stone-600 py-3.5 rounded-xl text-base font-semibold hover:bg-stone-200 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
