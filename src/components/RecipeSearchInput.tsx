"use client";

import { useState, useEffect, useRef } from "react";

interface Recipe {
  id: string;
  title: string;
  cuisine: string | null;
  category: string | null;
}

interface RecipeSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onSelectRecipe?: (recipe: Recipe) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
}

export function RecipeSearchInput({
  value,
  onChange,
  onSelectRecipe,
  onKeyDown,
  placeholder = "Search recipes or type meal...",
  autoFocus,
  className = "",
}: RecipeSearchInputProps) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/recipes")
      .then((r) => r.json())
      .then((data) => setRecipes(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  const filteredRecipes = recipes.filter((recipe) =>
    recipe.title.toLowerCase().includes(value.toLowerCase())
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    setShowDropdown(newValue.length > 0 && filteredRecipes.length > 0);
    setSelectedIndex(-1);
  };

  const selectRecipe = (recipe: Recipe) => {
    onChange(recipe.title);
    onSelectRecipe?.(recipe);
    setShowDropdown(false);
    setSelectedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showDropdown && filteredRecipes.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, filteredRecipes.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, -1));
      } else if (e.key === "Enter" && selectedIndex >= 0) {
        e.preventDefault();
        selectRecipe(filteredRecipes[selectedIndex]);
        return;
      } else if (e.key === "Escape") {
        setShowDropdown(false);
        setSelectedIndex(-1);
      }
    }
    
    onKeyDown?.(e);
  };

  const handleBlur = () => {
    setTimeout(() => setShowDropdown(false), 150);
  };

  const handleFocus = () => {
    if (value.length > 0 && filteredRecipes.length > 0) {
      setShowDropdown(true);
    }
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className={className}
      />

      {showDropdown && filteredRecipes.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 z-10 mt-1 bg-white border border-stone-200 rounded-xl max-h-60 overflow-y-auto"
        >
          {filteredRecipes.slice(0, 8).map((recipe, index) => (
            <button
              key={recipe.id}
              onClick={() => selectRecipe(recipe)}
              className={`w-full text-left px-4 py-3 hover:bg-stone-50 transition-colors border-b border-stone-100 last:border-0 ${
                index === selectedIndex ? "bg-stone-100" : ""
              }`}
            >
              <div className="font-medium text-stone-800">{recipe.title}</div>
              {(recipe.cuisine || recipe.category) && (
                <div className="flex gap-2 mt-1">
                  {recipe.cuisine && (
                    <span className="text-xs bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full">
                      {recipe.cuisine}
                    </span>
                  )}
                  {recipe.category && (
                    <span className="text-xs bg-stone-100 text-stone-500 px-2 py-0.5 rounded-full">
                      {recipe.category}
                    </span>
                  )}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
