"use client";

import { useState, useCallback, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Toast } from "@/components/Toast";
import { ImageUpload } from "@/components/ImageUpload";

interface Ingredient {
  name: string;
  amount: string;
  unit: string;
}

interface Step {
  step: number;
  text: string;
}

export default function NewRecipePage() {
  return (
    <Suspense fallback={<div className="max-w-3xl mx-auto py-8 text-center text-amber-600">Loading...</div>}>
      <RecipeForm />
    </Suspense>
  );
}

function RecipeForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const recipeId = searchParams.get("id"); // Get the 'id' parameter

  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ show: boolean; message: string; type: "success" | "error" }>({
    show: false,
    message: "",
    type: "success",
  });

  // State for all form fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [story, setStory] = useState("");
  const [origin, setOrigin] = useState("");
  const [familyMember, setFamilyMember] = useState("");
  const [cuisine, setCuisine] = useState("");
  const [category, setCategory] = useState("");
  const [prepTime, setPrepTime] = useState<number | null>(null);
  const [cookTime, setCookTime] = useState<number | null>(null);
  const [servings, setServings] = useState<number | null>(null);
  const [difficulty, setDifficulty] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [ingredients, setIngredients] = useState<Ingredient[]>([{ name: "", amount: "", unit: "" }]);
  const [instructions, setInstructions] = useState<Step[]>([{ step: 1, text: "" }]);

  const hideToast = useCallback(() => setToast((t) => ({ ...t, show: false })), []);

  // Fetch recipe data if recipeId exists
  useEffect(() => {
    if (recipeId) {
      const fetchRecipe = async () => {
        try {
          const res = await fetch(`/api/recipes/${recipeId}`); // Assuming API endpoint for single recipe is /api/recipes/[id]
          if (res.ok) {
            const data = await res.json();
            // Populate all state variables with fetched data
            setTitle(data.title || "");
            setDescription(data.description || "");
            setStory(data.story || "");
            setOrigin(data.origin || "");
            setFamilyMember(data.familyMember || "");
            setCuisine(data.cuisine || "");
            setCategory(data.category || "");
            setPrepTime(data.prepTime || null);
            setCookTime(data.cookTime || null);
            setServings(data.servings || null);
            setDifficulty(data.difficulty || "");
            setImageUrl(data.imageUrl || null);
            setIngredients(data.ingredients?.length ? data.ingredients : [{ name: "", amount: "", unit: "" }]);
            setInstructions(data.instructions?.length ? data.instructions : [{ step: 1, text: "" }]);
          } else {
            setToast({ show: true, message: "Failed to load recipe.", type: "error" });
          }
        } catch (error) {
          console.error("Error fetching recipe:", error);
          setToast({ show: true, message: "Failed to load recipe.", type: "error" });
        }
      };
      fetchRecipe();
    }
  }, [recipeId]); // Rerun when recipeId changes

  const addIngredient = () => {
    setIngredients([...ingredients, { name: "", amount: "", unit: "" }]);
  };

  const updateIngredient = (index: number, field: keyof Ingredient, value: string) => {
    const updated = [...ingredients];
    updated[index][field] = value;
    setIngredients(updated);
  };

  const removeIngredient = (index: number) => {
    if (ingredients.length > 1) {
      setIngredients(ingredients.filter((_, i) => i !== index));
    }
  };

  const addStep = () => {
    setInstructions([...instructions, { step: instructions.length + 1, text: "" }]);
  };

  const updateStep = (index: number, text: string) => {
    const updated = [...instructions];
    updated[index].text = text;
    setInstructions(updated);
  };

  const removeStep = (index: number) => {
    if (instructions.length > 1) {
      const updated = instructions.filter((_, i) => i !== index);
      // Renumber steps
      updated.forEach((s, i) => (s.step = i + 1));
      setInstructions(updated);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    
    const recipe = {
      title,
      description,
      story,
      origin,
      familyMember,
      cuisine,
      category,
      imageUrl,
      prepTime,
      cookTime,
      servings,
      difficulty,
      ingredients: ingredients.filter(i => i.name.trim()),
      instructions: instructions.filter(i => i.text.trim()),
    };

    const method = recipeId ? "PUT" : "POST";
    const url = recipeId ? `/api/recipes/${recipeId}` : "/api/recipes";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(recipe),
      });

      if (res.ok) {
        const data = await res.json();
        setToast({ show: true, message: recipeId ? "Recipe updated successfully! 🎉" : "Recipe saved successfully! 🎉", type: "success" });
        setTimeout(() => router.push(`/app/recipes/${data.id || recipeId}`), 1500);
      } else {
        setToast({ show: true, message: "Failed to save recipe. Please try again.", type: "error" });
      }
    } catch {
      setToast({ show: true, message: "Failed to save recipe. Please try again.", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <Toast message={toast.message} type={toast.type} show={toast.show} onClose={hideToast} />
      <h1 className="text-3xl font-bold text-amber-900 mb-2">{recipeId ? "Edit Recipe" : "Add a New Recipe"}</h1>
      <p className="text-amber-600 mb-6 text-lg">
        {recipeId ? "Update your family recipe" : "Write down a family recipe before it's forgotten"}
      </p>

      {/* AI Live Conversation CTA */}
      <div className="bg-gradient-to-r from-purple-100 to-blue-100 rounded-2xl p-6 mb-8 border border-purple-200">
        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="text-5xl">🤖💬</div>
          <div className="flex-1 text-center md:text-left">
            <h3 className="text-xl font-bold text-purple-900 mb-2">
              Getting this recipe from a family member?
            </h3>
            <p className="text-purple-700 mb-4">
              Use our AI-powered live conversation feature! It translates between dialects and English in real-time, 
              helping you capture recipes through natural conversation.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/app/capture"
                className="inline-flex items-center justify-center gap-2 bg-purple-600 text-white px-6 py-3 rounded-xl text-lg font-semibold hover:bg-purple-700 transition-colors"
              >
                <span className="text-xl">🎙️</span>
                Start Live Conversation
              </Link>
              <div className="text-sm text-purple-600 flex items-center gap-2">
                <span>✓ Real-time translation</span>
                <span>✓ Speech recognition</span>
                <span>✓ Cultural context</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Recipe Photo */}
        <section className="bg-white rounded-2xl p-6 shadow-sm border border-amber-200">
          <h2 className="text-xl font-semibold text-amber-800 mb-4">📸 Recipe Photo</h2>
          <ImageUpload
            currentImageUrl={imageUrl}
            onImageUploaded={(url) => setImageUrl(url)}
            onImageRemoved={() => setImageUrl(null)}
          />
        </section>

        {/* Basic Info */}
        <section className="bg-white rounded-2xl p-6 shadow-sm border border-amber-200">
          <h2 className="text-xl font-semibold text-amber-800 mb-4">📝 Basic Information</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-lg font-medium text-amber-800 mb-2">
                Recipe Name *
              </label>
              <input
                type="text"
                name="title"
                required
                placeholder="e.g., Grandma's Chicken Rice"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-3 text-lg border border-amber-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-lg font-medium text-amber-800 mb-2">
                Short Description
              </label>
              <textarea
                name="description"
                rows={2}
                placeholder="What makes this dish special?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-3 text-lg border border-amber-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-lg font-medium text-amber-800 mb-2">
                  Cuisine Type
                </label>
                <select
                  name="cuisine"
                  value={cuisine}
                  onChange={(e) => setCuisine(e.target.value)}
                  className="w-full px-4 py-3 text-lg border border-amber-300 rounded-xl focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">Select...</option>
                  <option value="Peranakan">Peranakan</option>
                  <option value="Teochew">Teochew</option>
                  <option value="Hokkien">Hokkien</option>
                  <option value="Cantonese">Cantonese</option>
                  <option value="Hakka">Hakka</option>
                  <option value="Malay">Malay</option>
                  <option value="Indian">Indian</option>
                  <option value="Eurasian">Eurasian</option>
                  <option value="Western">Western</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-lg font-medium text-amber-800 mb-2">
                  Category
                </label>
                <select
                  name="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-3 text-lg border border-amber-300 rounded-xl focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">Select...</option>
                  <option value="Main Dish">Main Dish</option>
                  <option value="Side Dish">Side Dish</option>
                  <option value="Soup">Soup</option>
                  <option value="Dessert">Dessert</option>
                  <option value="Snack">Snack</option>
                  <option value="Drink">Drink</option>
                  <option value="Sauce">Sauce / Condiment</option>
                </select>
              </div>
            </div>
          </div>
        </section>

        {/* Family Story */}
        <section className="bg-white rounded-2xl p-6 shadow-sm border border-amber-200">
          <h2 className="text-xl font-semibold text-amber-800 mb-4">👨‍👩‍👧 The Story Behind This Dish</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-lg font-medium text-amber-800 mb-2">
                Who passed down this recipe?
              </label>
              <input
                type="text"
                name="familyMember"
                placeholder="e.g., Grandma, Ah Ma, Mum"
                value={familyMember}
                onChange={(e) => setFamilyMember(e.target.value)}
                className="w-full px-4 py-3 text-lg border border-amber-300 rounded-xl focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-lg font-medium text-amber-800 mb-2">
                Where does this recipe come from?
              </label>
              <input
                type="text"
                name="origin"
                placeholder="e.g., Our old house in Tiong Bahru, 1970s"
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                className="w-full px-4 py-3 text-lg border border-amber-300 rounded-xl focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-lg font-medium text-amber-800 mb-2">
                Share the story or memory
              </label>
              <textarea
                name="story"
                rows={4}
                placeholder="What memories do you have of this dish? When would your family make it?"
                value={story}
                onChange={(e) => setStory(e.target.value)}
                className="w-full px-4 py-3 text-lg border border-amber-300 rounded-xl focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>
        </section>

        {/* Cooking Details */}
        <section className="bg-white rounded-2xl p-6 shadow-sm border border-amber-200">
          <h2 className="text-xl font-semibold text-amber-800 mb-4">⏱️ Cooking Details</h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-lg font-medium text-amber-800 mb-2">
                Prep Time
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  name="prepTime"
                  placeholder="30"
                  value={prepTime ?? ""}
                  onChange={(e) => setPrepTime(e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full px-4 py-3 text-lg border border-amber-300 rounded-xl focus:ring-2 focus:ring-amber-500"
                />
                <span className="text-amber-600">min</span>
              </div>
            </div>

            <div>
              <label className="block text-lg font-medium text-amber-800 mb-2">
                Cook Time
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  name="cookTime"
                  placeholder="45"
                  value={cookTime ?? ""}
                  onChange={(e) => setCookTime(e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full px-4 py-3 text-lg border border-amber-300 rounded-xl focus:ring-2 focus:ring-amber-500"
                />
                <span className="text-amber-600">min</span>
              </div>
            </div>

            <div>
              <label className="block text-lg font-medium text-amber-800 mb-2">
                Servings
              </label>
              <input
                type="number"
                name="servings"
                placeholder="4"
                value={servings ?? ""}
                onChange={(e) => setServings(e.target.value ? parseInt(e.target.value) : null)}
                className="w-full px-4 py-3 text-lg border border-amber-300 rounded-xl focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-lg font-medium text-amber-800 mb-2">
                Difficulty
              </label>
              <select
                name="difficulty"
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="w-full px-4 py-3 text-lg border border-amber-300 rounded-xl focus:ring-2 focus:ring-amber-500"
              >
                <option value="">Select...</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
          </div>
        </section>

        {/* Ingredients */}
        <section className="bg-white rounded-2xl p-6 shadow-sm border border-amber-200">
          <h2 className="text-xl font-semibold text-amber-800 mb-4">🥬 Ingredients</h2>
          
          <div className="space-y-3">
            {ingredients.map((ing, index) => (
              <div key={index} className="flex flex-col sm:flex-row gap-2 sm:gap-3 items-start relative pb-4 mb-4 border-b border-amber-100 last-of-type:border-b-0 last-of-type:pb-0 last-of-type:mb-0">
                <div className="flex gap-2 w-full sm:flex-1 order-1 sm:order-none">
                  <input
                    type="text"
                    placeholder="Ingredient name"
                    value={ing.name}
                    onChange={(e) => updateIngredient(index, "name", e.target.value)}
                    className="flex-1 px-3 py-3 text-lg border border-amber-300 rounded-xl focus:ring-2 focus:ring-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => removeIngredient(index)}
                    className="px-3 py-3 text-red-500 hover:bg-red-50 rounded-xl flex-shrink-0"
                  >
                    ✕
                  </button>
                </div>
                <div className="flex gap-2 w-full sm:w-auto order-2 sm:order-none">
                  <input
                    type="text"
                    placeholder="Amount"
                    value={ing.amount}
                    onChange={(e) => updateIngredient(index, "amount", e.target.value)}
                    className="w-1/2 sm:w-24 px-3 py-3 text-lg border border-amber-300 rounded-xl focus:ring-2 focus:ring-amber-500"
                  />
                  <select
                    value={ing.unit}
                    onChange={(e) => updateIngredient(index, "unit", e.target.value)}
                    className="w-1/2 sm:w-24 px-3 py-3 text-lg border border-amber-300 rounded-xl focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="">Unit</option>
                    <option value="g">g</option>
                    <option value="kg">kg</option>
                    <option value="ml">ml</option>
                    <option value="L">L</option>
                    <option value="tsp">tsp</option>
                    <option value="tbsp">tbsp</option>
                    <option value="cup">cup</option>
                    <option value="pcs">pcs</option>
                    <option value="pinch">pinch</option>
                    <option value="dash">dash</option>
                    <option value="oz">oz</option>
                    <option value="lb">lb</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
          
          <button
            type="button"
            onClick={addIngredient}
            className="mt-4 px-4 py-2 text-amber-600 border border-amber-300 rounded-xl hover:bg-amber-50"
          >
            + Add Ingredient
          </button>
        </section>

        {/* Instructions */}
        <section className="bg-white rounded-2xl p-6 shadow-sm border border-amber-200">
          <h2 className="text-xl font-semibold text-amber-800 mb-4">📋 Cooking Steps</h2>
          
          <div className="space-y-4">
            {instructions.map((step, index) => (
              <div key={index} className="flex gap-3 items-start">
                <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center text-amber-700 font-bold flex-shrink-0">
                  {step.step}
                </div>
                <textarea
                  placeholder={`Step ${step.step}: What do you do?`}
                  value={step.text}
                  onChange={(e) => updateStep(index, e.target.value)}
                  rows={2}
                  className="flex-1 px-4 py-3 text-lg border border-amber-300 rounded-xl focus:ring-2 focus:ring-amber-500"
                />
                <button
                  type="button"
                  onClick={() => removeStep(index)}
                  className="px-3 py-3 text-red-500 hover:bg-red-50 rounded-xl"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          
          <button
            type="button"
            onClick={addStep}
            className="mt-4 px-4 py-2 text-amber-600 border border-amber-300 rounded-xl hover:bg-amber-50"
          >
            + Add Step
          </button>
        </section>

        {/* Submit */}
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 bg-amber-600 text-white py-4 rounded-xl text-xl font-semibold hover:bg-amber-700 disabled:bg-amber-400"
          >
            {saving ? "Saving..." : "Save Recipe"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-8 py-4 border border-amber-300 text-amber-700 rounded-xl text-xl font-semibold hover:bg-amber-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
