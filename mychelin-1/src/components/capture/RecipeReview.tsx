import { useState } from "react";
import { Button } from "@radix-ui/themes";
import { PlusIcon, Cross2Icon, CheckIcon } from "@radix-ui/react-icons";
import { cn } from "@/lib/utils";

interface ExtractedRecipe {
  title: string;
  description: string;
  ingredients: Array<{
    name: string;
    quantity?: number | null;
    unit?: string | null;
    notes?: string;
  }>;
  instructions: Array<{
    stepNumber: number;
    content: string;
    tip?: string;
  }>;
  yield?: string;
  prepTime?: string;
  cookTime?: string;
  cuisine?: string;
  origin?: string;
  dialect?: string;
  occasion?: string;
  familyMember?: string;
  story?: string;
}

interface RecipeReviewProps {
  recipe: ExtractedRecipe;
  onSave: (recipe: ExtractedRecipe) => void;
  onBack: () => void;
  isSaving?: boolean;
}

export function RecipeReview({ 
  recipe, 
  onSave, 
  onBack, 
  isSaving = false 
}: RecipeReviewProps) {
  const [editedRecipe, setEditedRecipe] = useState<ExtractedRecipe>(recipe);

  const updateField = (field: keyof ExtractedRecipe, value: any) => {
    setEditedRecipe(prev => ({ ...prev, [field]: value }));
  };

  const addIngredient = () => {
    setEditedRecipe(prev => ({
      ...prev,
      ingredients: [...prev.ingredients, { name: "", quantity: null, unit: null, notes: "" }]
    }));
  };

  const removeIngredient = (index: number) => {
    setEditedRecipe(prev => ({
      ...prev,
      ingredients: prev.ingredients.filter((_, i) => i !== index)
    }));
  };

  const updateIngredient = (index: number, field: string, value: any) => {
    setEditedRecipe(prev => ({
      ...prev,
      ingredients: prev.ingredients.map((ing, i) => 
        i === index ? { ...ing, [field]: value } : ing
      )
    }));
  };

  const addInstruction = () => {
    setEditedRecipe(prev => ({
      ...prev,
      instructions: [...prev.instructions, { 
        stepNumber: prev.instructions.length + 1, 
        content: "", 
        tip: "" 
      }]
    }));
  };

  const removeInstruction = (index: number) => {
    setEditedRecipe(prev => ({
      ...prev,
      instructions: prev.instructions
        .filter((_, i) => i !== index)
        .map((inst, i) => ({ ...inst, stepNumber: i + 1 }))
    }));
  };

  const updateInstruction = (index: number, field: string, value: string) => {
    setEditedRecipe(prev => ({
      ...prev,
      instructions: prev.instructions.map((inst, i) => 
        i === index ? { ...inst, [field]: value } : inst
      )
    }));
  };

  return (
    <div className="h-full flex flex-col bg-neutral-50">
      {/* Header */}
      <div className="flex-shrink-0 bg-white border-b border-neutral-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="text-neutral-600 hover:text-neutral-800 transition-colors"
          >
            ← Back to Chat
          </button>
          <h1 className="text-lg font-semibold text-neutral-900">Review Recipe</h1>
          <Button
            onClick={() => onSave(editedRecipe)}
            disabled={isSaving || !editedRecipe.title.trim()}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            {isSaving ? "Saving..." : (
              <>
                <CheckIcon />
                Save Recipe
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Basic Info */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="font-semibold text-neutral-900 mb-3">Recipe Details</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Title</label>
              <input
                type="text"
                value={editedRecipe.title}
                onChange={(e) => updateField('title', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                placeholder="Recipe name"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Description</label>
              <textarea
                value={editedRecipe.description}
                onChange={(e) => updateField('description', e.target.value)}
                rows={2}
                className="w-full px-3 py-2 rounded-lg border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
                placeholder="Brief description"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Yield</label>
                <input
                  type="text"
                  value={editedRecipe.yield || ''}
                  onChange={(e) => updateField('yield', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="e.g., 4 servings"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Cuisine</label>
                <input
                  type="text"
                  value={editedRecipe.cuisine || ''}
                  onChange={(e) => updateField('cuisine', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="e.g., Chinese"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Ingredients */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-neutral-900">Ingredients</h2>
            <Button onClick={addIngredient} variant="soft" size="1">
              <PlusIcon />
              Add
            </Button>
          </div>
          <div className="space-y-2">
            {editedRecipe.ingredients.map((ingredient, index) => (
              <div key={index} className="flex gap-2 items-start">
                <div className="flex-1 grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={ingredient.name}
                    onChange={(e) => updateIngredient(index, 'name', e.target.value)}
                    placeholder="Ingredient"
                    className="px-3 py-2 rounded-lg border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
                  />
                  <input
                    type="number"
                    value={ingredient.quantity || ''}
                    onChange={(e) => updateIngredient(index, 'quantity', e.target.value ? parseFloat(e.target.value) : null)}
                    placeholder="Qty"
                    className="px-3 py-2 rounded-lg border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
                  />
                  <input
                    type="text"
                    value={ingredient.unit || ''}
                    onChange={(e) => updateIngredient(index, 'unit', e.target.value)}
                    placeholder="Unit"
                    className="px-3 py-2 rounded-lg border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
                  />
                </div>
                <button
                  onClick={() => removeIngredient(index)}
                  className="p-2 text-neutral-400 hover:text-red-500 transition-colors"
                >
                  <Cross2Icon />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-neutral-900">Instructions</h2>
            <Button onClick={addInstruction} variant="soft" size="1">
              <PlusIcon />
              Add Step
            </Button>
          </div>
          <div className="space-y-3">
            {editedRecipe.instructions.map((instruction, index) => (
              <div key={index} className="flex gap-3 items-start">
                <div className="flex-shrink-0 w-6 h-6 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center text-sm font-medium">
                  {index + 1}
                </div>
                <div className="flex-1 space-y-2">
                  <textarea
                    value={instruction.content}
                    onChange={(e) => updateInstruction(index, 'content', e.target.value)}
                    placeholder="Instruction step"
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm resize-none"
                  />
                  <input
                    type="text"
                    value={instruction.tip || ''}
                    onChange={(e) => updateInstruction(index, 'tip', e.target.value)}
                    placeholder="Cooking tip (optional)"
                    className="w-full px-3 py-2 rounded-lg border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
                  />
                </div>
                <button
                  onClick={() => removeInstruction(index)}
                  className="p-2 text-neutral-400 hover:text-red-500 transition-colors"
                >
                  <Cross2Icon />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Story & Cultural Context */}
        {editedRecipe.story && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h2 className="font-semibold text-neutral-900 mb-3">Story & Cultural Context</h2>
            <textarea
              value={editedRecipe.story}
              onChange={(e) => updateField('story', e.target.value)}
              rows={4}
              className="w-full px-3 py-2 rounded-lg border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none text-sm"
              placeholder="Family memories, cultural significance, cooking stories..."
            />
          </div>
        )}
      </div>
    </div>
  );
}