import type { Metadata } from "next";
import { Playfair_Display, DM_Sans } from "next/font/google";
import "./globals.css";
import { MobileNav } from "@/components/MobileNav";
import { UserNav } from "@/components/UserNav";
import { ChefHat, BookOpen, Box, Calendar } from "lucide-react";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-playfair",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-dm-sans",
});

export const metadata: Metadata = {
  title: "Mychelin - Family Recipe Keeper",
  description: "Preserve and share your family's culinary traditions across generations",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${dmSans.variable} ${playfair.variable} font-sans bg-stone-50 min-h-screen leading-relaxed`}>
        {/* Desktop Nav */}
        <nav className="hidden md:block bg-white border-b border-stone-200">
          <div className="max-w-5xl mx-auto px-8 py-5">
            <div className="flex items-center justify-between">
              <a href="/" className="flex items-center gap-3">
                <ChefHat className="w-8 h-8 text-terracotta" />
                <span className="text-2xl font-bold text-stone-800 font-heading">Mychelin</span>
              </a>
              <div className="flex items-center gap-8">
                <a href="/recipes" className="flex items-center gap-2 text-lg text-stone-500 hover:text-stone-900 transition-colors">
                  <BookOpen className="w-5 h-5" />
                  Recipes
                </a>
                <a href="/fridge" className="flex items-center gap-2 text-lg text-stone-500 hover:text-stone-900 transition-colors">
                  <Box className="w-5 h-5" />
                  My Fridge
                </a>
                <a href="/planner" className="flex items-center gap-2 text-lg text-stone-500 hover:text-stone-900 transition-colors">
                  <Calendar className="w-5 h-5" />
                  Meal Planner
                </a>
                <UserNav />
              </div>
            </div>
          </div>
        </nav>

        {/* Mobile Nav */}
        <MobileNav />

        <main className="max-w-5xl mx-auto px-6 py-10 pb-28 md:pb-12">
          {children}
        </main>
      </body>
    </html>
  );
}
