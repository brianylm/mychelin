export interface BookRecipeMembership {
  bookId: number;
  recipeId: number;
}

export function mergeBookRecipeMemberships(
  linkedRows: readonly BookRecipeMembership[],
  directRows: readonly BookRecipeMembership[]
): Map<number, number[]> {
  const recipeIdsByBook = new Map<number, Set<number>>();

  for (const row of [...linkedRows, ...directRows]) {
    const recipeIds = recipeIdsByBook.get(row.bookId) ?? new Set<number>();
    recipeIds.add(row.recipeId);
    recipeIdsByBook.set(row.bookId, recipeIds);
  }

  return new Map(
    Array.from(recipeIdsByBook, ([bookId, recipeIds]) => [bookId, Array.from(recipeIds)])
  );
}

export function mergeBookRecipeRows<
  L extends { id: number },
  D extends { id: number },
>(
  linkedRows: readonly L[],
  directRows: readonly D[]
): Array<L | D> {
  const seen = new Set<number>();
  const merged: Array<L | D> = [];

  // The junction table carries the book-specific sort order and added metadata,
  // so keep its row when a legacy direct membership also exists.
  for (const row of [...linkedRows, ...directRows]) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    merged.push(row);
  }

  return merged;
}
