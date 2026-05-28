"use client";

import { useState, useEffect } from "react";
import { CreateBookModal } from "./CreateBookModal";
import { BookDetailView } from "./BookDetailView";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";

interface Book {
  id: number;
  title: string;
  description: string | null;
  coverEmoji: string;
  coverColor: string;
  createdBy: number;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  memberCount: number;
  recipeCount: number;
  userRole: "owner" | "editor" | "viewer";
  isOwner: boolean;
}

interface BooksViewProps {
  onNavigateToRecipe?: (recipeId: number) => void;
}

export function BooksView({ onNavigateToRecipe }: BooksViewProps = {}) {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);

  const fetchBooks = async () => {
    try {
      const response = await fetch("/api/books");
      if (!response.ok) {
        if (response.status === 401) {
          addToast("Please log in to view your books", "error");
          return;
        }
        throw new Error("Failed to fetch books");
      }
      const data = await response.json();
      setBooks(data);
    } catch (error) {
      console.error("Error fetching books:", error);
      addToast("Failed to load books", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooks();
  }, []);

  const handleCreateBook = async (bookData: {
    title: string;
    description?: string;
    coverEmoji?: string;
    coverColor?: string;
  }) => {
    try {
      const response = await fetch("/api/books", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(bookData),
      });

      if (!response.ok) {
        throw new Error("Failed to create book");
      }

      const newBook = await response.json();
      setBooks(prev => [newBook, ...prev]);
      setShowCreateModal(false);
      addToast("Book created successfully!", "success");
    } catch (error) {
      console.error("Error creating book:", error);
      addToast("Failed to create book", "error");
    }
  };

  const getColorClass = (color: string) => {
    const colorMap: Record<string, string> = {
      amber: "bg-[#800020]/10",
      rose: "bg-rose-100",
      emerald: "bg-emerald-100",
      sky: "bg-sky-100",
      violet: "bg-violet-100",
      slate: "bg-slate-100",
    };
    return colorMap[color] || "bg-[#800020]/10";
  };

  if (selectedBook) {
    return (
      <BookDetailView
        book={selectedBook}
        onBack={() => setSelectedBook(null)}
        onBookUpdated={(updatedBook) => {
          setBooks(prev =>
            prev.map(b => b.id === updatedBook.id ? { ...b, ...updatedBook } : b)
          );
          setSelectedBook({ ...selectedBook, ...updatedBook });
        }}
        onBookDeleted={() => {
          setBooks(prev => prev.filter(b => b.id !== selectedBook.id));
          setSelectedBook(null);
          addToast("Book deleted successfully", "success");
        }}
        onNavigateToRecipe={onNavigateToRecipe}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#800020] border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 p-4 pb-20 md:pb-4">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">My Recipe Books</h1>
            <p className="text-sm text-neutral-600">
              Organize and share your favorite recipes
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 rounded-xl bg-[#17131f] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#800020]"
          >
            <span className="text-lg">+</span>
            Create Book
          </button>
        </div>

        {/* Books Grid */}
        {books.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="mb-4 text-6xl">📚</div>
            <h2 className="mb-2 text-xl font-semibold text-neutral-900">
              No recipe books yet
            </h2>
            <p className="mb-6 text-center text-neutral-600">
              Create your first recipe book to start organizing and sharing your favorite recipes
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 rounded-xl bg-[#17131f] px-6 py-3 font-medium text-white transition-colors hover:bg-[#800020]"
            >
              <span className="text-lg">+</span>
              Create Your First Book
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {books.map((book) => (
              <button
                key={book.id}
                onClick={() => setSelectedBook(book)}
                className="group rounded-2xl border border-neutral-200 bg-white p-5 text-left transition-all hover:border-[#800020]/15 hover:shadow-lg"
              >
                <div
                  className={`mb-3 flex h-16 w-16 items-center justify-center rounded-xl text-2xl ${getColorClass(book.coverColor)}`}
                >
                  {book.coverEmoji}
                </div>
                <h3 className="mb-1 font-semibold text-neutral-900 group-hover:text-[#800020]">
                  {book.title}
                </h3>
                {book.description && (
                  <p className="mb-3 line-clamp-2 text-sm text-neutral-600">
                    {book.description}
                  </p>
                )}
                <div className="flex items-center gap-4 text-xs text-neutral-500">
                  <span>{book.recipeCount} recipes</span>
                  <span>{book.memberCount} members</span>
                  {book.isOwner && (
                    <span className="rounded-full bg-[#800020]/5 px-2 py-0.5 text-[#800020]">
                      Owner
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Create Book Modal */}
      {showCreateModal && (
        <CreateBookModal
          onClose={() => setShowCreateModal(false)}
          onCreateBook={handleCreateBook}
        />
      )}
    </div>
  );
}