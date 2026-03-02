import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

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
      <body className={`${inter.className} bg-amber-50 min-h-screen`}>
        <nav className="bg-white shadow-sm border-b border-amber-200">
          <div className="max-w-5xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <a href="/" className="flex items-center gap-2">
                <span className="text-3xl">🍲</span>
                <span className="text-2xl font-bold text-amber-800">Mychelin</span>
              </a>
              <div className="flex items-center gap-6">
                <a href="/recipes" className="text-lg text-amber-700 hover:text-amber-900">Recipes</a>
                <a href="/fridge" className="text-lg text-amber-700 hover:text-amber-900">My Fridge</a>
                <a href="/planner" className="text-lg text-amber-700 hover:text-amber-900">Meal Planner</a>
              </div>
            </div>
          </div>
        </nav>
        <main className="max-w-5xl mx-auto px-4 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
