export interface BookSummary {
  id: number;
  title: string;
  description: string | null;
  coverEmoji: string;
  coverColor: string;
  recipeCount: number;
  recipeIds: number[];
  memberCount?: number;
  userRole?: string;
  isOwner?: boolean;
}

export function booksQueryKey(userId: number) {
  return ["books", userId] as const;
}

export function addBookRecipeMemberships(
  books: BookSummary[] | undefined,
  additions: ReadonlyMap<number, readonly number[]>
): BookSummary[] | undefined {
  if (!books) return books;

  return books.map((book) => {
    const addedRecipeIds = additions.get(book.id);
    if (!addedRecipeIds?.length) return book;

    const recipeIds = Array.from(new Set([...book.recipeIds, ...addedRecipeIds]));
    return { ...book, recipeIds, recipeCount: recipeIds.length };
  });
}

export function removeBookRecipeMemberships(
  books: BookSummary[] | undefined,
  removals: ReadonlyMap<number, readonly number[]>
): BookSummary[] | undefined {
  if (!books) return books;

  return books.map((book) => {
    const removedRecipeIds = removals.get(book.id);
    if (!removedRecipeIds?.length) return book;

    const removed = new Set(removedRecipeIds);
    const recipeIds = book.recipeIds.filter((recipeId) => !removed.has(recipeId));
    return { ...book, recipeIds, recipeCount: recipeIds.length };
  });
}

export function bookTitlesForRecipe(books: readonly BookSummary[], recipeId: number): string[] {
  return books
    .filter((book) => book.recipeIds.includes(recipeId))
    .map((book) => book.title);
}

export async function fetchBooks(): Promise<BookSummary[]> {
  const response = await fetch("/api/books");
  if (!response.ok) throw new Error("Failed to load books");
  return response.json();
}
