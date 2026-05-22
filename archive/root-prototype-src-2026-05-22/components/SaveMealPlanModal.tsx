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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
        <div className="text-center mb-6">
          <div className="text-4xl mb-3">💾</div>
          <h2 className="text-xl font-bold text-amber-900 mb-2">Save your meal plan?</h2>
          <p className="text-amber-600">
            You have {mealCount} meal{mealCount !== 1 ? "s" : ""} planned. Would you like to save your progress?
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={onSave}
            className="w-full bg-amber-600 text-white py-3 rounded-xl text-lg font-semibold hover:bg-amber-700 transition-colors"
          >
            Save & Continue
          </button>
          <button
            onClick={onDiscard}
            className="w-full bg-red-600 text-white py-3 rounded-xl text-lg font-semibold hover:bg-red-700 transition-colors"
          >
            Discard Changes
          </button>
          <button
            onClick={onCancel}
            className="w-full bg-gray-200 text-gray-700 py-3 rounded-xl text-lg font-semibold hover:bg-gray-300 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}