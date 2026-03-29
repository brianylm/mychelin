"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { useRecipeStore } from "@/store/RecipeStore";
import { RecipeSearchHeader } from "./sidebar/RecipeSearchHeader";
import { RecipeListItem } from "./sidebar/RecipeListItem";
import { SidebarToolbar } from "./sidebar/SidebarToolbar";
import { CreateRecipeForm } from "./sidebar/CreateRecipeForm";

interface Book {
  id: number;
  title: string;
  coverEmoji: string;
  recipeCount: number;
}

interface BookRecipe {
  id: number;
  title: string;
}

interface RecipeSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onOpen: () => void;
}

export function RecipeSidebar({ isOpen, onClose, onOpen }: RecipeSidebarProps) {
  const {
    recipes,
    loading,
    error,
    selectedRecipeId,
    selectRecipe,
    createRecipe,
    deleteRecipe,
  } = useRecipeStore();

  const [query, setQuery] = useState("");
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [creationError, setCreationError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Books state
  const [books, setBooks] = useState<Book[]>([]);
  const [expandedBooks, setExpandedBooks] = useState<Set<number>>(new Set());
  const [bookRecipes, setBookRecipes] = useState<Record<number, BookRecipe[]>>({});

  useEffect(() => {
    fetch("/api/books")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setBooks(data))
      .catch(() => {});
  }, []);

  const toggleBook = useCallback(async (bookId: number) => {
    setExpandedBooks((prev) => {
      const next = new Set(prev);
      if (next.has(bookId)) {
        next.delete(bookId);
      } else {
        next.add(bookId);
        // Fetch recipes for this book if not already loaded
        if (!bookRecipes[bookId]) {
          fetch(`/api/books/${bookId}/recipes`)
            .then((res) => (res.ok ? res.json() : []))
            .then((data) => {
              setBookRecipes((prev) => ({ ...prev, [bookId]: data }));
            })
            .catch(() => {});
        }
      }
      return next;
    });
  }, [bookRecipes]);

  const filteredRecipes = recipes.filter((r) =>
    r.title.toLowerCase().includes(query.toLowerCase())
  );

  const handleCreate = async () => {
    if (!draftName.trim()) return;
    setIsSaving(true);
    setCreationError(null);
    try {
      await createRecipe(draftName.trim());
      setIsCreating(false);
      setDraftName("");
      onClose();
    } catch (err) {
      setCreationError(
        err instanceof Error ? err.message : "Failed to create recipe"
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          role="presentation"
          className="fixed inset-0 z-30 bg-neutral-950/40 backdrop-blur-sm md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-[85vw] max-w-sm flex-col border-r border-neutral-200 bg-white shadow-xl transition-transform md:static md:z-auto md:h-full md:w-80 md:translate-x-0 md:shadow-none",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Header + search + toolbar */}
        <div className="space-y-3 border-b border-neutral-200 px-5 py-3">
          <RecipeSearchHeader
            query={query}
            onQueryChange={setQuery}
            isExpanded={isSearchExpanded}
            onExpandToggle={setIsSearchExpanded}
            onClose={onClose}
          />

          {(loading || error) && (
            <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-600">
              {loading ? "Loading recipes…" : error}
            </div>
          )}

          <SidebarToolbar
            onCreateOpen={() => {
              setIsCreating(true);
              onOpen();
            }}
          />

          {isCreating && (
            <CreateRecipeForm
              name={draftName}
              onNameChange={setDraftName}
              error={creationError}
              isSaving={isSaving}
              onSave={handleCreate}
              onCancel={() => {
                setIsCreating(false);
                setDraftName("");
                setCreationError(null);
              }}
            />
          )}
        </div>

        {/* Books + Recipe list */}
        <div className="flex-1 overflow-y-auto px-2 py-3">
          {/* Books section */}
          {books.length > 0 && (
            <div className="mb-3">
              <div className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                Books
              </div>
              <ul className="space-y-0.5">
                {books.map((book) => (
                  <li key={book.id}>
                    <button
                      onClick={() => toggleBook(book.id)}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-amber-50",
                        expandedBooks.has(book.id) && "bg-amber-50/60"
                      )}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className={cn(
                          "shrink-0 text-neutral-400 transition-transform",
                          expandedBooks.has(book.id) && "rotate-90"
                        )}
                      >
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                      <span>{book.coverEmoji}</span>
                      <span className="truncate font-medium text-neutral-700">
                        {book.title}
                      </span>
                      <span className="ml-auto shrink-0 text-[10px] text-neutral-400">
                        {book.recipeCount}
                      </span>
                    </button>
                    {expandedBooks.has(book.id) && (
                      <ul className="ml-5 border-l border-neutral-200 pl-3 py-1 space-y-0.5">
                        {!bookRecipes[book.id] ? (
                          <li className="px-2 py-1.5 text-xs text-neutral-400">
                            Loading…
                          </li>
                        ) : bookRecipes[book.id].length === 0 ? (
                          <li className="px-2 py-1.5 text-xs text-neutral-400">
                            No recipes in this book
                          </li>
                        ) : (
                          bookRecipes[book.id].map((r) => (
                            <li key={r.id}>
                              <button
                                onClick={() => {
                                  selectRecipe(r.id);
                                  onClose();
                                }}
                                className={cn(
                                  "w-full rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-amber-50",
                                  selectedRecipeId === r.id
                                    ? "bg-amber-100 font-medium text-amber-800"
                                    : "text-neutral-600"
                                )}
                              >
                                {r.title}
                              </button>
                            </li>
                          ))
                        )}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* All recipes */}
          {books.length > 0 && (
            <div className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
              All Recipes
            </div>
          )}
          {filteredRecipes.length === 0 && !loading ? (
            <p className="px-3 py-6 text-center text-sm text-neutral-500">
              {query ? "No recipes match your search." : "No recipes yet. Create one!"}
            </p>
          ) : (
            <ul className="space-y-0.5">
              {filteredRecipes.map((recipe) => (
                <RecipeListItem
                  key={recipe.id}
                  recipe={recipe}
                  isSelected={selectedRecipeId === recipe.id}
                  onSelect={(id) => {
                    selectRecipe(id);
                    onClose();
                  }}
                  onDelete={deleteRecipe}
                />
              ))}
            </ul>
          )}
        </div>
      </aside>
    </>
  );
}
