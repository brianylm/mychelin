"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function MobileNav() {
  const pathname = usePathname();

  const isActive = (path: string) => {
    if (path === "/") return pathname === "/";
    return pathname.startsWith(path);
  };

  return (
    <>
      {/* Mobile Header - Simple */}
      <header className="md:hidden bg-white shadow-sm border-b border-amber-200 sticky top-0 z-40">
        <div className="px-4 py-3 flex items-center justify-center">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">🍲</span>
            <span className="text-xl font-bold text-amber-800">Mychelin</span>
          </Link>
        </div>
      </header>

      {/* Mobile Bottom Tab Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-amber-200 z-50 safe-area-pb">
        <div className="grid grid-cols-4 gap-1">
          <Link
            href="/"
            className={`flex flex-col items-center py-3 px-2 ${
              isActive("/") && !isActive("/recipes") && !isActive("/fridge") && !isActive("/discover")
                ? "text-amber-600"
                : "text-amber-400"
            }`}
          >
            <span className="text-2xl">🏠</span>
            <span className="text-xs mt-1 font-medium">Home</span>
          </Link>

          <Link
            href="/recipes"
            className={`flex flex-col items-center py-3 px-2 ${
              isActive("/recipes") ? "text-amber-600" : "text-amber-400"
            }`}
          >
            <span className="text-2xl">📖</span>
            <span className="text-xs mt-1 font-medium">Recipes</span>
          </Link>

          <Link
            href="/fridge"
            className={`flex flex-col items-center py-3 px-2 ${
              isActive("/fridge") ? "text-amber-600" : "text-amber-400"
            }`}
          >
            <span className="text-2xl">🧊</span>
            <span className="text-xs mt-1 font-medium">Fridge</span>
          </Link>

          <Link
            href="/discover"
            className={`flex flex-col items-center py-3 px-2 ${
              isActive("/discover") ? "text-amber-600" : "text-amber-400"
            }`}
          >
            <span className="text-2xl">🎲</span>
            <span className="text-xs mt-1 font-medium">Surprise</span>
          </Link>
        </div>
      </nav>
    </>
  );
}
