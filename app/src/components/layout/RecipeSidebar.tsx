"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { useRecipeStore } from "@/store/RecipeStore";
import { RecipeSearchHeader } from "./sidebar/RecipeSearchHeader";
import { RecipeListItem } from "./sidebar/RecipeListItem";
import { SidebarToolbar } from "./sidebar/SidebarToolbar";
import { ShareModal } from "@/components/sharing/ShareModal";

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
  onPasteText?: () => void;
  onImportUrl?: () => void;
  onCookRecipe?: (recipeId: number) => void;
  onCaptureConversation?: () => void;
  onAiDraft?: () => void;
}

export function RecipeSidebar({
  isOpen,
  onClose,
  onPasteText,
  onImportUrl,
  onCookRecipe,
  onCaptureConversation,
  onAiDraft,
}: RecipeSidebarProps) {
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
  const [shareTarget, setShareTarget] = useState<{ id: number; name: string } | null>(null);

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

  // Handler that creates a blank recipe and navigates straight to it,
  // skipping the "enter a name first" step. Used by the sidebar New
  // Recipe button AND the mobile "New" button event. RecipeView will
  // auto-focus and select the title so the user can immediately rename.
  const handleCreateBlank = useCallback(async () => {
    try {
      await createRecipe();
      onClose();
    } catch (err) {
      console.error("Failed to create recipe:", err);
    }
  }, [createRecipe, onClose]);

  // Listen for create-recipe event from mobile "New" button
  useEffect(() => {
    const handler = () => {
      handleCreateBlank();
    };
    window.addEventListener("mychelin:create-recipe", handler);
    return () => window.removeEventListener("mychelin:create-recipe", handler);
  }, [handleCreateBlank]);

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

  // When the user types in the search box we hit /api/recipes/search,
  // which matches against both recipe titles AND ingredient names —
  // so "chilli" returns Arrabiata (because it has chilli in the
  // ingredient list) as well as anything called "Chilli Crab".
  // When the query is empty we fall back to the full recipe list.
  const [searchResults, setSearchResults] = useState<
    Array<{ recipe: typeof recipes[number]; matchedIngredient: string | null }>
  >([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/recipes/search?q=${encodeURIComponent(trimmed)}`
        );
        if (!res.ok) throw new Error("Search failed");
        const data = (await res.json()) as {
          results: Array<{
            recipe: typeof recipes[number];
            matchedIngredient: string | null;
          }>;
        };
        setSearchResults(data.results ?? []);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 200);
    return () => clearTimeout(t);
  }, [query]);

  const hasQuery = query.trim().length > 0;
  const filteredRecipes = hasQuery
    ? searchResults.map((r) => r.recipe)
    : recipes;
  const matchedIngredientById = new Map<number, string>();
  for (const r of searchResults) {
    if (r.matchedIngredient)
      matchedIngredientById.set(r.recipe.id, r.matchedIngredient);
  }

  // Split drafts from active recipes. Drafts get their own collapsible
  // section above "All Recipes" so in-progress captures don't pollute
  // the main list. When the user is searching, skip the split — search
  // results appear as a flat list regardless of status.
  const draftRecipes = hasQuery
    ? []
    : filteredRecipes.filter((r) => r.status === "draft");
  const activeRecipes = hasQuery
    ? filteredRecipes
    : filteredRecipes.filter((r) => r.status !== "draft");

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
          "fixed inset-y-0 left-0 z-40 flex w-[85vw] max-w-sm flex-col border-r border-[#800020]/10 bg-[#fffdfb]/95 shadow-[0_24px_80px_rgba(60,43,25,0.16)] backdrop-blur-xl transition-transform md:static md:z-auto md:h-full md:w-80 md:translate-x-0 md:shadow-none",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Header + search + toolbar */}
        <div className="space-y-3 border-b border-[#800020]/10 bg-white/45 px-5 py-3">
          <RecipeSearchHeader
            query={query}
            onQueryChange={setQuery}
            isExpanded={isSearchExpanded}
            onExpandToggle={setIsSearchExpanded}
            onClose={onClose}
          />

          {(loading || error) && (
            <div className="rounded-xl border border-[#800020]/10 bg-[#800020]/5 px-3 py-2 text-xs text-[#521224]">
              {loading ? "Loading recipes…" : error}
            </div>
          )}

          <SidebarToolbar
            onCreateOpen={handleCreateBlank}
            onPasteText={onPasteText}
            onImportUrl={onImportUrl}
            onCaptureConversation={onCaptureConversation}
            onAiDraft={onAiDraft}
          />
        </div>

        {/* Recipe list + Books: peer sections under Create recipe. */}
        <div className="flex-1 overflow-y-auto px-2 py-3">
          <section className="mb-4">
            <div className="flex items-center justify-between px-3 pb-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#800020]/60">
                {hasQuery ? "Search results" : "Recipes"}
              </span>
              {!hasQuery && filteredRecipes.length > 0 && (
                <span className="rounded-full bg-[#800020]/10 px-1.5 text-[10px] font-medium text-[#800020]">
                  {filteredRecipes.length}
                </span>
              )}
            </div>

            {draftRecipes.length > 0 && (
              <div className="mb-3">
                <div className="flex items-center justify-between px-3 pb-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                    Drafts
                  </span>
                  <span className="rounded-full bg-[#800020]/10 px-1.5 text-[10px] font-medium text-[#800020]">
                    {draftRecipes.length}
                  </span>
                </div>
                <ul className="space-y-0.5">
                  {draftRecipes.map((recipe) => (
                    <RecipeListItem
                      key={recipe.id}
                      recipe={recipe}
                      isSelected={selectedRecipeId === recipe.id}
                      onSelect={(id) => {
                        selectRecipe(id);
                        onClose();
                      }}
                      onShare={(r) => setShareTarget({ id: r.id, name: r.title })}
                      onDelete={deleteRecipe}
                      onCook={onCookRecipe}
                      matchedIngredient={matchedIngredientById.get(recipe.id)}
                    />
                  ))}
                </ul>
              </div>
            )}

            {activeRecipes.length === 0 && !loading && !searching ? (
              <p className="px-3 py-6 text-center text-sm text-neutral-500">
                {query
                  ? "No recipes match your search."
                  : draftRecipes.length > 0
                    ? "All your recipes are drafts. Add ingredients or steps to save them as complete recipes."
                    : "No recipes yet. Use Create recipe above to start one."}
              </p>
            ) : (
              <ul className="space-y-0.5">
                {activeRecipes.map((recipe) => (
                  <RecipeListItem
                    key={recipe.id}
                    recipe={recipe}
                    isSelected={selectedRecipeId === recipe.id}
                    onSelect={(id) => {
                      selectRecipe(id);
                      onClose();
                    }}
                    onShare={(r) => setShareTarget({ id: r.id, name: r.title })}
                    onDelete={deleteRecipe}
                    onCook={onCookRecipe}
                    matchedIngredient={matchedIngredientById.get(recipe.id)}
                  />
                ))}
              </ul>
            )}
          </section>

          <section className="border-t border-[#800020]/10 pt-3">
            <div className="flex items-center justify-between px-3 pb-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#800020]/60">
                Books
              </span>
              <button
                onClick={() => {
                  window.dispatchEvent(new CustomEvent("mychelin:create-book"));
                }}
                className="text-[10px] font-medium text-[#800020] hover:text-[#800020]"
              >
                + New
              </button>
            </div>
            {books.length > 0 ? (
              <ul className="space-y-0.5">
                {books.map((book) => (
                  <li key={book.id}>
                    <button
                      onClick={() => toggleBook(book.id)}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition-colors hover:bg-[#800020]/5",
                        expandedBooks.has(book.id) && "bg-[#800020]/10 text-[#521224]"
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
                      <ul className="ml-5 space-y-0.5 border-l border-neutral-200 py-1 pl-3">
                        {!bookRecipes[book.id] ? (
                          <li className="px-2 py-1.5 text-xs text-neutral-400">
                            Loading...
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
                                  "w-full rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-[#800020]/5",
                                  selectedRecipeId === r.id
                                    ? "bg-[#800020]/10 font-medium text-[#521224]"
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
            ) : (
              <p className="px-3 py-2 text-xs text-neutral-400">
                No books yet. Create one to organize recipes.
              </p>
            )}
          </section>
        </div>
      </aside>

      {shareTarget && (
        <ShareModal
          resourceType="recipe"
          resourceId={shareTarget.id}
          resourceName={shareTarget.name}
          onClose={() => setShareTarget(null)}
        />
      )}
    </>
  );
}
