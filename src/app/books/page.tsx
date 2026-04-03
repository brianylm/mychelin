import Link from "next/link";
import { db, bookMembers, recipeBooks } from "@/db";
import { eq, desc } from "drizzle-orm";
import { getCurrentUserId } from "@/lib/auth";
import { CreateBookButton } from "@/components/CreateBookModal";
import { BookOpen, Users, UtensilsCrossed } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function BooksPage() {
  const userId = await getCurrentUserId();

  if (!userId) {
    return (
      <div className="space-y-10">
        <h1 className="text-4xl font-bold text-stone-900 font-heading">Recipe Books</h1>
        <div className="text-center py-20 bg-white rounded-3xl border border-stone-200">
          <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <BookOpen className="w-8 h-8 text-stone-400" />
          </div>
          <h2 className="text-2xl font-bold text-stone-800 mb-3 font-heading">Sign in to see your books</h2>
          <p className="text-stone-500 mb-8 leading-relaxed">
            Recipe books let you organise and share recipes with your family.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 bg-terracotta text-white px-8 py-4 rounded-2xl text-lg font-semibold hover:bg-terracotta-600 transition-colors"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  const memberships = await db.query.bookMembers.findMany({
    where: eq(bookMembers.userId, userId),
    with: {
      book: {
        with: {
          members: true,
          recipes: true,
        },
      },
    },
  });

  const books = memberships.map((m) => ({
    ...m.book,
    memberCount: m.book.members.length,
    recipeCount: m.book.recipes.length,
    userRole: m.role,
  }));

  return (
    <div className="space-y-10">
      <div className="flex items-end justify-between">
        <h1 className="text-4xl font-bold text-stone-900 font-heading">Recipe Books</h1>
        <CreateBookButton />
      </div>

      {books.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-stone-200">
          <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <BookOpen className="w-8 h-8 text-stone-400" />
          </div>
          <h2 className="text-2xl font-bold text-stone-800 mb-3 font-heading">No recipe books yet</h2>
          <p className="text-stone-500 mb-8 leading-relaxed">
            Create your first book to start organising and sharing family recipes.
          </p>
          <CreateBookButton />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {books.map((book) => (
            <Link
              key={book.id}
              href={`/books/${book.id}`}
              className="bg-white rounded-3xl overflow-hidden border border-stone-200 hover:shadow-lg transition-shadow duration-300 group"
            >
              {/* Cover image or gradient placeholder */}
              <div className="aspect-[16/7] bg-stone-100 relative overflow-hidden">
                {book.coverImageUrl ? (
                  <img
                    src={book.coverImageUrl}
                    alt={book.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-stone-100 to-stone-200 flex items-center justify-center">
                    <BookOpen className="w-12 h-12 text-stone-300" />
                  </div>
                )}
                {book.userRole === "owner" && (
                  <span className="absolute top-3 right-3 bg-white/90 text-stone-600 text-xs font-semibold px-3 py-1 rounded-full shadow-sm">
                    Owner
                  </span>
                )}
              </div>

              <div className="p-6">
                <h3 className="text-xl font-semibold text-stone-800 mb-2 font-heading">{book.name}</h3>
                {book.description && (
                  <p className="text-stone-500 text-sm leading-relaxed mb-4 line-clamp-2">
                    {book.description}
                  </p>
                )}
                <div className="flex items-center gap-5 text-sm text-stone-400">
                  <span className="flex items-center gap-1.5">
                    <UtensilsCrossed className="w-4 h-4" />
                    {book.recipeCount} {book.recipeCount === 1 ? "recipe" : "recipes"}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Users className="w-4 h-4" />
                    {book.memberCount} {book.memberCount === 1 ? "member" : "members"}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
