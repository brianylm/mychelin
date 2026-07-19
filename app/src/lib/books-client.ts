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

export async function fetchBooks(): Promise<BookSummary[]> {
  const response = await fetch("/api/books");
  if (!response.ok) throw new Error("Failed to load books");
  return response.json();
}
