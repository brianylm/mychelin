export interface BookSummary {
  id: number;
  title: string;
  description: string | null;
  coverEmoji: string;
  coverColor: string;
  recipeCount: number;
  memberCount?: number;
  userRole?: string;
  isOwner?: boolean;
}

export function booksQueryKey(userId: number) {
  return ["books", userId] as const;
}

export function adjustBookRecipeCounts(
  books: BookSummary[] | undefined,
  deltas: ReadonlyMap<number, number>
): BookSummary[] | undefined {
  if (!books) return books;

  return books.map((book) => {
    const delta = deltas.get(book.id);
    if (!delta) return book;

    return {
      ...book,
      recipeCount: Math.max(0, book.recipeCount + delta),
    };
  });
}

export async function fetchBooks(): Promise<BookSummary[]> {
  const response = await fetch("/api/books");
  if (!response.ok) throw new Error("Failed to load books");
  return response.json();
}
