import Link from "next/link";
import { db, recipeBooks, bookMembers } from "@/db";
import { eq, desc } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getCurrentUserId } from "@/lib/auth";
import { BookPrinciplesSection } from "@/components/BookTipsSection";
import { BookOpen, Users, UtensilsCrossed, Clock } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function BookDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const userId = await getCurrentUserId();

  const book = await db.query.recipeBooks.findFirst({
    where: eq(recipeBooks.id, id),
    with: {
      members: {
        with: { user: true },
      },
      recipes: {
        orderBy: (r, { desc }) => [desc(r.createdAt)],
      },
      tips: {
        with: { author: true },
        orderBy: (t, { desc }) => [desc(t.createdAt)],
      },
    },
  });

  if (!book) {
    notFound();
  }

  // Check membership
  const membership = userId
    ? book.members.find((m) => m.userId === userId)
    : null;

  const isOwner = membership?.role === "owner";
  const isMember = !!membership;

  // Serialize tips for client component (dates must be strings or serializable)
  const serializedTips = book.tips.map((tip) => ({
    ...tip,
    createdAt: tip.createdAt?.toISOString?.() ?? String(tip.createdAt),
  }));

  return (
    <div className="max-w-4xl mx-auto space-y-10">
      {/* Back link */}
      <Link
        href="/books"
        className="inline-flex items-center gap-2 text-stone-500 hover:text-stone-800 text-base font-medium transition-colors"
      >
        ← Back to Books
      </Link>

      {/* Book header */}
      <div className="bg-white rounded-3xl overflow-hidden border border-stone-200">
        {/* Cover image */}
        <div className="aspect-[16/7] bg-stone-100 relative overflow-hidden">
          {book.coverImageUrl ? (
            <img
              src={book.coverImageUrl}
              alt={book.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-stone-100 to-stone-200 flex items-center justify-center">
              <BookOpen className="w-20 h-20 text-stone-300" />
            </div>
          )}
        </div>

        <div className="p-8 md:p-10">
          <h1 className="text-4xl md:text-5xl font-bold text-stone-900 font-heading mb-4 leading-tight">
            {book.name}
          </h1>

          {book.description && (
            <p className="text-lg text-stone-500 leading-relaxed mb-6">{book.description}</p>
          )}

          <div className="flex flex-wrap items-center gap-6 text-sm text-stone-400">
            <span className="flex items-center gap-1.5">
              <UtensilsCrossed className="w-4 h-4" />
              {book.recipes.length} {book.recipes.length === 1 ? "recipe" : "recipes"}
            </span>
            <span className="flex items-center gap-1.5">
              <Users className="w-4 h-4" />
              {book.members.length} {book.members.length === 1 ? "member" : "members"}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              Created {new Date(book.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "long" })}
            </span>
          </div>

          {/* Members */}
          {book.members.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-2">
              {book.members.map((m) => (
                <span
                  key={m.id}
                  className="inline-flex items-center gap-2 bg-stone-50 border border-stone-100 text-stone-600 text-sm px-3 py-1.5 rounded-full"
                >
                  {m.user?.avatarUrl ? (
                    <img src={m.user.avatarUrl} alt={m.user.name} className="w-5 h-5 rounded-full object-cover" />
                  ) : (
                    <span className="w-5 h-5 bg-terracotta/20 text-terracotta rounded-full text-xs flex items-center justify-center font-semibold">
                      {m.user?.name?.[0]?.toUpperCase() ?? "?"}
                    </span>
                  )}
                  {m.user?.name}
                  {m.role === "owner" && (
                    <span className="text-xs text-stone-400">(owner)</span>
                  )}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recipes in this book */}
      <section>
        <h2 className="text-3xl font-bold text-stone-900 font-heading mb-6">Recipes</h2>

        {book.recipes.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-stone-200">
            <UtensilsCrossed className="w-10 h-10 text-stone-300 mx-auto mb-3" />
            <p className="text-stone-500">No recipes in this book yet.</p>
            {isMember && (
              <Link
                href="/recipes/new"
                className="inline-flex items-center gap-2 mt-6 bg-terracotta text-white px-6 py-3 rounded-2xl font-semibold hover:bg-terracotta-600 transition-colors text-base"
              >
                Add a Recipe
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {book.recipes.map((recipe) => (
              <Link
                key={recipe.id}
                href={`/recipes/${recipe.id}`}
                className="bg-white rounded-3xl overflow-hidden border border-stone-200 hover:shadow-lg transition-shadow duration-300"
              >
                <div className="aspect-[4/3] bg-stone-100">
                  {recipe.imageUrl ? (
                    <img
                      src={recipe.imageUrl}
                      alt={recipe.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-stone-100" />
                  )}
                </div>
                <div className="p-5">
                  <h3 className="text-lg font-semibold text-stone-800 font-heading mb-2 leading-snug">
                    {recipe.title}
                  </h3>
                  {recipe.cuisine && (
                    <span className="inline-block bg-amber-50 text-amber-700 px-3 py-1 rounded-full text-sm">
                      {recipe.cuisine}
                    </span>
                  )}
                  {recipe.familyMember && (
                    <p className="text-stone-400 text-sm mt-2">From: {recipe.familyMember}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Cooking Principles — client component for interactivity */}
      <BookPrinciplesSection
        bookId={id}
        initialPrinciples={serializedTips}
        currentUserId={isMember ? userId : null}
        isOwner={isOwner}
      />
    </div>
  );
}
