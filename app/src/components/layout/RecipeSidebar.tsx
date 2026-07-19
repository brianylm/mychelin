"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import { useRecipeStore } from "@/store/RecipeStore";
import { RecipeSearchHeader } from "./sidebar/RecipeSearchHeader";
import { RecipeListItem } from "./sidebar/RecipeListItem";
import { SidebarToolbar } from "./sidebar/SidebarToolbar";
import { ShareModal } from "@/components/sharing/ShareModal";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { booksQueryKey, fetchBooks } from "@/lib/books-client";

interface BookRecipe {
  id: number;
  title: string;
}

interface RecipeSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onWriteOrPaste?: () => void;
  onImportUrl?: () => void;
  onCookRecipe?: (recipeId: number) => void;
  onCaptureConversation?: () => void;
  onAiDraft?: () => void;
  onManualRecipe?: () => void;
  mobileOnly?: boolean;
}

export function RecipeSidebar({
  isOpen,
  onClose,
  onWriteOrPaste,
  onImportUrl,
  onCookRecipe,
  onCaptureConversation,
  onAiDraft,
  onManualRecipe,
  mobileOnly = false,
}: RecipeSidebarProps) {
  const { user } = useAuth();
  const {
    recipes,
    loading,
    error,
    selectedRecipeId,
    selectRecipe,
    deleteRecipe,
  } = useRecipeStore();

  const [query, setQuery] = useState("");
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [isRecipesOpen, setIsRecipesOpen] = useState(true);
  const [isBooksOpen, setIsBooksOpen] = useState(true);
  const sidebarRef = useRef<HTMLElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const [shareTarget, setShareTarget] = useState<{ id: number; name: string } | null>(null);

  // User-scoped query key prevents cached books crossing account sessions.
  const { data: books = [] } = useQuery({
    queryKey: booksQueryKey(user?.id ?? 0),
    queryFn: fetchBooks,
    enabled: Boolean(user?.id),
    staleTime: 60_000,
  });
  const [expandedBooks, setExpandedBooks] = useState<Set<number>>(new Set());
  const [bookRecipes, setBookRecipes] = useState<Record<number, BookRecipe[]>>({});

  useEffect(() => {
    if (!isOpen || !window.matchMedia("(max-width: 767px)").matches) return;

    returnFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusTimer = window.setTimeout(() => {
      const closeButton = sidebarRef.current?.querySelector<HTMLButtonElement>(
        'button[aria-label="Close library panel"]'
      );
      (closeButton ?? sidebarRef.current)?.focus();
    }, 50);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCloseRef.current();
    };
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      returnFocusRef.current?.focus();
    };
  }, [isOpen]);

  const handleManualRecipe = useCallback(() => {
    onManualRecipe?.();
    onClose();
  }, [onClose, onManualRecipe]);

  // Listen for create-recipe event from mobile "New" button
  useEffect(() => {
    const handler = () => {
      handleManualRecipe();
    };
    window.addEventListener("mychelin:create-recipe", handler);
    return () => window.removeEventListener("mychelin:create-recipe", handler);
  }, [handleManualRecipe]);

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

  useEffect(() => {
    if (hasQuery) setIsRecipesOpen(true);
  }, [hasQuery]);

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
        <button
          type="button"
          aria-label="Close library panel"
          className="fixed inset-0 z-30 bg-neutral-950/35 md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        ref={sidebarRef}
        tabIndex={-1}
        aria-label="Recipe library"
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-[85vw] max-w-sm flex-col border-r border-[var(--ui-border)] bg-[var(--ui-surface)] shadow-[0_24px_64px_rgba(60,43,25,0.16)] transition-[transform,visibility] duration-200 ease-out focus:outline-none",
          mobileOnly ? "md:hidden" : "md:static md:z-auto md:h-full md:w-72 md:translate-x-0 md:shadow-none lg:w-80",
          isOpen
            ? "visible translate-x-0"
            : "invisible pointer-events-none -translate-x-full md:visible md:pointer-events-auto"
        )}
      >
        {/* Header + search + toolbar */}
        <div className="space-y-3 border-b border-[var(--ui-border)] bg-[var(--ui-surface)] px-5 py-3">
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
            onCreateOpen={handleManualRecipe}
            onWriteOrPaste={onWriteOrPaste}
            onImportUrl={onImportUrl}
            onCaptureConversation={onCaptureConversation}
            onAiDraft={onAiDraft}
          />
        </div>

        {/* Recipe list + Books: peer sections under Create recipe. */}
        <div className="flex-1 overflow-y-auto px-2 py-3">
          <section className="mb-4">
            <button
              type="button"
              className="flex min-h-11 w-full items-center justify-between rounded-lg px-3 text-left transition-colors hover:bg-[#800020]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#800020]/30 focus-visible:ring-offset-1"
              aria-expanded={isRecipesOpen}
              onClick={() => setIsRecipesOpen((value) => !value)}
            >
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#800020]/60">
                {hasQuery ? "Search results" : "Recipe library"}
              </span>
              <span className="flex items-center gap-2">
                {!hasQuery && filteredRecipes.length > 0 && (
                  <span className="rounded-full bg-[#800020]/10 px-1.5 text-[10px] font-medium text-[#800020]">
                    {filteredRecipes.length}
                  </span>
                )}
                <ChevronDown
                  className={cn(
                    "h-4 w-4 text-[#800020] transition-transform",
                    isRecipesOpen && "rotate-180"
                  )}
                  aria-hidden="true"
                />
              </span>
            </button>

            {isRecipesOpen && draftRecipes.length > 0 && (
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

            {isRecipesOpen && (activeRecipes.length === 0 && !loading && !searching ? (
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
            ))}
          </section>

          <section className="border-t border-[#800020]/10 pt-3">
            <div className="flex items-center justify-between gap-2 px-3 pb-1.5">
              <button
                type="button"
                className="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-lg text-left transition-colors hover:text-[#800020] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#800020]/30 focus-visible:ring-offset-1"
                aria-expanded={isBooksOpen}
                onClick={() => setIsBooksOpen((value) => !value)}
              >
                <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#800020]/60">
                  Books
                </span>
                {books.length > 0 && (
                  <span className="rounded-full bg-[#800020]/10 px-1.5 text-[10px] font-medium text-[#800020]">
                    {books.length}
                  </span>
                )}
                <ChevronDown
                  className={cn(
                    "ml-auto h-4 w-4 shrink-0 text-[#800020] transition-transform",
                    isBooksOpen && "rotate-180"
                  )}
                  aria-hidden="true"
                />
              </button>
              <button
                type="button"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent("mychelin:create-book"));
                }}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-[#800020]/10 text-[#800020] transition-colors hover:border-[#800020]/25 hover:bg-[#800020]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#800020]/30 focus-visible:ring-offset-1"
                aria-label="Create book"
                title="Create book"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
            {isBooksOpen && (books.length > 0 ? (
              <ul className="space-y-0.5">
                {books.map((book) => (
                  <li key={book.id}>
                    <button
                      type="button"
                      onClick={() => toggleBook(book.id)}
                      aria-expanded={expandedBooks.has(book.id)}
                      className={cn(
                        "flex min-h-11 w-full items-center gap-2 rounded-lg px-3 text-left text-sm transition-colors hover:bg-[#800020]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#800020]/30 focus-visible:ring-offset-1",
                        expandedBooks.has(book.id) && "bg-[#800020]/10 text-[#521224]"
                      )}
                    >
                      <ChevronRight
                        className={cn(
                          "h-3.5 w-3.5 shrink-0 text-neutral-400 transition-transform",
                          expandedBooks.has(book.id) && "rotate-90"
                        )}
                        aria-hidden="true"
                      />
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
                                type="button"
                                onClick={() => {
                                  selectRecipe(r.id);
                                  onClose();
                                }}
                                className={cn(
                                  "min-h-11 w-full truncate rounded-md px-2 text-left text-sm transition-colors hover:bg-[#800020]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#800020]/30 focus-visible:ring-offset-1",
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
                No books yet. Use books later to organize recipes into collections.
              </p>
            ))}
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
