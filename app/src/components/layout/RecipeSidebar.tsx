"use client";

import { useCallback, useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Plus,
  Refrigerator,
  ShoppingBasket,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRecipeStore } from "@/store/RecipeStore";
import type { AppView } from "./BottomNav";
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
  currentView?: AppView;
  onViewChange?: (view: AppView) => void;
  onSelectRecipe?: (recipeId: number) => void;
  onWriteOrPaste?: () => void;
  onImportUrl?: () => void;
  onCookRecipe?: (recipeId: number) => void;
  onCaptureConversation?: () => void;
  onAiDraft?: () => void;
  onManualRecipe?: () => void;
  mobileOnly?: boolean;
}

const primaryNav: Array<{
  id: AppView;
  label: string;
  icon: LucideIcon;
}> = [
  { id: "recipes", label: "Recipe library", icon: BookOpen },
  { id: "plan", label: "Meal plan", icon: CalendarDays },
  { id: "shopping", label: "Shopping", icon: ShoppingBasket },
  { id: "fridge", label: "Fridge", icon: Refrigerator },
  { id: "activity", label: "Activity", icon: ClipboardList },
];

export function RecipeSidebar({
  isOpen,
  onClose,
  currentView = "recipes",
  onViewChange,
  onSelectRecipe,
  onWriteOrPaste,
  onImportUrl,
  onCookRecipe,
  onCaptureConversation,
  onAiDraft,
  onManualRecipe,
  mobileOnly = false,
}: RecipeSidebarProps) {
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
  const [shareTarget, setShareTarget] = useState<{
    id: number;
    name: string;
  } | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [expandedBooks, setExpandedBooks] = useState<Set<number>>(new Set());
  const [bookRecipes, setBookRecipes] = useState<
    Record<number, BookRecipe[]>
  >({});
  const [searchResults, setSearchResults] = useState<
    Array<{
      recipe: (typeof recipes)[number];
      matchedIngredient: string | null;
    }>
  >([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    fetch("/api/books")
      .then((response) => (response.ok ? response.json() : []))
      .then((data) => setBooks(data))
      .catch(() => {});
  }, []);

  const handleManualRecipe = useCallback(() => {
    onManualRecipe?.();
    onClose();
  }, [onClose, onManualRecipe]);

  useEffect(() => {
    const handler = () => handleManualRecipe();
    window.addEventListener("mychelin:create-recipe", handler);
    return () => window.removeEventListener("mychelin:create-recipe", handler);
  }, [handleManualRecipe]);

  const handleViewSelect = useCallback(
    (view: AppView) => {
      onViewChange?.(view);
      onClose();
    },
    [onClose, onViewChange]
  );

  const handleRecipeSelect = useCallback(
    (recipeId: number) => {
      if (onSelectRecipe) onSelectRecipe(recipeId);
      else selectRecipe(recipeId);
      onClose();
    },
    [onClose, onSelectRecipe, selectRecipe]
  );

  const toggleBook = useCallback(
    async (bookId: number) => {
      setExpandedBooks((current) => {
        const next = new Set(current);
        if (next.has(bookId)) {
          next.delete(bookId);
        } else {
          next.add(bookId);
          if (!bookRecipes[bookId]) {
            fetch(`/api/books/${bookId}/recipes`)
              .then((response) => (response.ok ? response.json() : []))
              .then((data) => {
                setBookRecipes((existing) => ({
                  ...existing,
                  [bookId]: data,
                }));
              })
              .catch(() => {});
          }
        }
        return next;
      });
    },
    [bookRecipes]
  );

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/recipes/search?q=${encodeURIComponent(trimmed)}`
        );
        if (!response.ok) throw new Error("Search failed");
        const data = (await response.json()) as {
          results: Array<{
            recipe: (typeof recipes)[number];
            matchedIngredient: string | null;
          }>;
        };
        setSearchResults(data.results ?? []);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 250);

    return () => window.clearTimeout(timer);
  }, [query, recipes]);

  const hasQuery = query.trim().length > 0;

  useEffect(() => {
    if (hasQuery) setIsRecipesOpen(true);
  }, [hasQuery]);

  const filteredRecipes = hasQuery
    ? searchResults.map((result) => result.recipe)
    : recipes;
  const matchedIngredientById = new Map<number, string>();
  for (const result of searchResults) {
    if (result.matchedIngredient) {
      matchedIngredientById.set(result.recipe.id, result.matchedIngredient);
    }
  }

  const draftRecipes = hasQuery
    ? []
    : filteredRecipes.filter((recipe) => recipe.status === "draft");
  const activeRecipes = hasQuery
    ? filteredRecipes
    : filteredRecipes.filter((recipe) => recipe.status !== "draft");

  return (
    <>
      {isOpen && (
        <div
          role="presentation"
          className="fixed inset-0 z-30 bg-neutral-950/35 md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-[min(88vw,20rem)] max-w-full flex-col border-r border-[var(--ui-border-strong)] bg-[var(--ui-surface)] shadow-[0_20px_50px_rgba(40,26,19,0.14)] transition-transform duration-200",
          mobileOnly
            ? "md:hidden"
            : "md:static md:z-auto md:h-full md:w-72 md:translate-x-0 md:shadow-none",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
        aria-label="Mychelin navigation"
      >
        <div className="border-b border-[var(--ui-border)] px-4 py-3">
          <RecipeSearchHeader
            query={query}
            onQueryChange={setQuery}
            isExpanded={isSearchExpanded}
            onExpandToggle={setIsSearchExpanded}
            onClose={onClose}
          />
        </div>

        <nav
          className="grid gap-0.5 border-b border-[var(--ui-border)] px-3 py-3"
          aria-label="Primary"
        >
          {primaryNav.map((item) => {
            const Icon = item.icon;
            const active = currentView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleViewSelect(item.id)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-11 items-center gap-3 rounded-lg px-3 text-left text-sm font-semibold transition-colors duration-200",
                  active
                    ? "bg-[var(--ui-action)] text-[var(--ui-action-text)]"
                    : "text-[var(--ui-muted-strong)] hover:bg-[var(--ui-surface-subtle)] hover:text-[var(--ui-text)]"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="border-b border-[var(--ui-border)] px-4 py-3">
          <SidebarToolbar
            onCreateOpen={handleManualRecipe}
            onWriteOrPaste={onWriteOrPaste}
            onImportUrl={onImportUrl}
            onCaptureConversation={onCaptureConversation}
            onAiDraft={onAiDraft}
          />
          {(loading || error) && (
            <p
              className={cn(
                "mt-3 border-l-2 px-3 py-2 text-xs leading-5",
                error
                  ? "border-[var(--ui-danger)] bg-[var(--ui-danger-soft)] text-[var(--ui-danger)]"
                  : "border-[var(--ui-accent)] bg-[var(--ui-accent-muted)] text-[var(--ui-muted-strong)]"
              )}
              role={error ? "alert" : "status"}
            >
              {loading ? "Loading recipes..." : error}
            </p>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-3">
          <section>
            <button
              type="button"
              className="flex min-h-11 w-full items-center justify-between gap-3 rounded-lg px-2 text-left transition-colors duration-200 hover:bg-[var(--ui-surface-subtle)]"
              aria-expanded={isRecipesOpen}
              onClick={() => setIsRecipesOpen((value) => !value)}
            >
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ui-muted-strong)]">
                {hasQuery ? "Search results" : "Recipe library"}
              </span>
              <span className="flex items-center gap-2">
                {!hasQuery && filteredRecipes.length > 0 && (
                  <span className="rounded-md bg-[var(--ui-accent-muted)] px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-[var(--ui-accent)]">
                    {filteredRecipes.length}
                  </span>
                )}
                <ChevronDown
                  className={cn(
                    "h-4 w-4 text-[var(--ui-muted)] transition-transform duration-200",
                    isRecipesOpen && "rotate-180"
                  )}
                  aria-hidden="true"
                />
              </span>
            </button>

            {isRecipesOpen && draftRecipes.length > 0 && (
              <div className="mb-3">
                <div className="flex min-h-9 items-center justify-between px-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--ui-muted)]">
                    Drafts
                  </span>
                  <span className="text-[11px] font-semibold tabular-nums text-[var(--ui-accent)]">
                    {draftRecipes.length}
                  </span>
                </div>
                <ul>
                  {draftRecipes.map((recipe) => (
                    <RecipeListItem
                      key={recipe.id}
                      recipe={recipe}
                      isSelected={selectedRecipeId === recipe.id}
                      onSelect={handleRecipeSelect}
                      onShare={(target) =>
                        setShareTarget({ id: target.id, name: target.title })
                      }
                      onDelete={deleteRecipe}
                      onCook={onCookRecipe}
                      matchedIngredient={matchedIngredientById.get(recipe.id)}
                    />
                  ))}
                </ul>
              </div>
            )}

            {isRecipesOpen &&
              (activeRecipes.length === 0 && !loading && !searching ? (
                <p className="px-2 py-6 text-sm leading-6 text-[var(--ui-muted)]">
                  {query
                    ? "No recipes match this search."
                    : draftRecipes.length > 0
                      ? "All recipes are still drafts. Add ingredients or steps to make one ready to cook."
                      : "No recipes yet. Open Create recipe above to begin."}
                </p>
              ) : (
                <ul>
                  {activeRecipes.map((recipe) => (
                    <RecipeListItem
                      key={recipe.id}
                      recipe={recipe}
                      isSelected={selectedRecipeId === recipe.id}
                      onSelect={handleRecipeSelect}
                      onShare={(target) =>
                        setShareTarget({ id: target.id, name: target.title })
                      }
                      onDelete={deleteRecipe}
                      onCook={onCookRecipe}
                      matchedIngredient={matchedIngredientById.get(recipe.id)}
                    />
                  ))}
                </ul>
              ))}
          </section>

          <section className="mt-3 border-t border-[var(--ui-border)] pt-3">
            <div className="flex items-center gap-1">
              <button
                type="button"
                className="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-lg px-2 text-left transition-colors duration-200 hover:bg-[var(--ui-surface-subtle)]"
                aria-expanded={isBooksOpen}
                onClick={() => setIsBooksOpen((value) => !value)}
              >
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ui-muted-strong)]">
                  Books
                </span>
                {books.length > 0 && (
                  <span className="rounded-md bg-[var(--ui-accent-muted)] px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-[var(--ui-accent)]">
                    {books.length}
                  </span>
                )}
                <ChevronDown
                  className={cn(
                    "ml-auto h-4 w-4 shrink-0 text-[var(--ui-muted)] transition-transform duration-200",
                    isBooksOpen && "rotate-180"
                  )}
                  aria-hidden="true"
                />
              </button>
              <button
                type="button"
                onClick={() => {
                  window.dispatchEvent(
                    new CustomEvent("mychelin:create-book")
                  );
                }}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-[var(--ui-accent)] transition-colors duration-200 hover:bg-[var(--ui-accent-muted)]"
                aria-label="Create book"
                title="Create book"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            {isBooksOpen &&
              (books.length > 0 ? (
                <ul>
                  {books.map((book) => {
                    const expanded = expandedBooks.has(book.id);
                    return (
                      <li key={book.id}>
                        <button
                          type="button"
                          onClick={() => toggleBook(book.id)}
                          aria-expanded={expanded}
                          className={cn(
                            "flex min-h-11 w-full items-center gap-2 rounded-lg px-2 text-left text-sm transition-colors duration-200 hover:bg-[var(--ui-surface-subtle)]",
                            expanded &&
                              "bg-[var(--ui-accent-muted)] text-[#521224]"
                          )}
                        >
                          <ChevronRight
                            className={cn(
                              "h-4 w-4 shrink-0 text-[var(--ui-muted)] transition-transform duration-200",
                              expanded && "rotate-90"
                            )}
                            aria-hidden="true"
                          />
                          <span aria-hidden="true">{book.coverEmoji}</span>
                          <span className="truncate font-medium">
                            {book.title}
                          </span>
                          <span className="ml-auto shrink-0 text-[11px] tabular-nums text-[var(--ui-muted)]">
                            {book.recipeCount}
                          </span>
                        </button>

                        {expanded && (
                          <ul className="ml-4 border-l border-[var(--ui-border)] py-1 pl-3">
                            {!bookRecipes[book.id] ? (
                              <li className="px-2 py-2 text-xs text-[var(--ui-muted)]">
                                Loading...
                              </li>
                            ) : bookRecipes[book.id].length === 0 ? (
                              <li className="px-2 py-2 text-xs text-[var(--ui-muted)]">
                                No recipes in this book
                              </li>
                            ) : (
                              bookRecipes[book.id].map((recipe) => (
                                <li key={recipe.id}>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleRecipeSelect(recipe.id)
                                    }
                                    className={cn(
                                      "min-h-10 w-full rounded-md px-2 text-left text-sm transition-colors duration-200 hover:bg-[var(--ui-surface-subtle)]",
                                      selectedRecipeId === recipe.id
                                        ? "bg-[var(--ui-accent-muted)] font-semibold text-[#521224]"
                                        : "text-[var(--ui-muted-strong)]"
                                    )}
                                  >
                                    {recipe.title}
                                  </button>
                                </li>
                              ))
                            )}
                          </ul>
                        )}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="px-2 py-3 text-xs leading-5 text-[var(--ui-muted)]">
                  No books yet. Create one when you want to group recipes for a household or occasion.
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
