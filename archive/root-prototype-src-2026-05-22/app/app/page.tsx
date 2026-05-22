import Link from "next/link";
import { BookOpen, Box, Calendar, Sparkles, ChefHat } from "lucide-react";

export default function AppDashboard() {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center py-12">
        <ChefHat className="w-12 h-12 text-terracotta mx-auto mb-4" />
        <h1 className="text-4xl font-bold text-stone-900 mb-2">Welcome back</h1>
        <p className="text-stone-500 text-lg">What are we cooking today?</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          href="/app/recipes"
          className="bg-white rounded-2xl p-6 shadow-md border border-stone-200 hover:shadow-xl hover:scale-[1.02] transition-all duration-200"
        >
          <div className="flex items-center gap-4 mb-3">
            <div className="w-12 h-12 bg-terracotta/10 rounded-xl flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-terracotta" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-stone-900">Recipes</h2>
              <p className="text-stone-500">Browse and manage your collection</p>
            </div>
          </div>
        </Link>

        <Link
          href="/app/planner"
          className="bg-white rounded-2xl p-6 shadow-md border border-stone-200 hover:shadow-xl hover:scale-[1.02] transition-all duration-200"
        >
          <div className="flex items-center gap-4 mb-3">
            <div className="w-12 h-12 bg-terracotta/10 rounded-xl flex items-center justify-center">
              <Calendar className="w-6 h-6 text-terracotta" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-stone-900">Meal Planner</h2>
              <p className="text-stone-500">Plan your week ahead</p>
            </div>
          </div>
        </Link>

        <Link
          href="/app/fridge"
          className="bg-white rounded-2xl p-6 shadow-md border border-stone-200 hover:shadow-xl hover:scale-[1.02] transition-all duration-200"
        >
          <div className="flex items-center gap-4 mb-3">
            <div className="w-12 h-12 bg-terracotta/10 rounded-xl flex items-center justify-center">
              <Box className="w-6 h-6 text-terracotta" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-stone-900">My Fridge</h2>
              <p className="text-stone-500">Track what you have at home</p>
            </div>
          </div>
        </Link>

        <Link
          href="/app/discover"
          className="bg-white rounded-2xl p-6 shadow-md border border-stone-200 hover:shadow-xl hover:scale-[1.02] transition-all duration-200"
        >
          <div className="flex items-center gap-4 mb-3">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-stone-900">Surprise Me</h2>
              <p className="text-stone-500">Let us pick a random recipe</p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
