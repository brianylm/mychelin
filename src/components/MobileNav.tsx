"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, BookOpen, Calendar, Box, ChefHat, User } from "lucide-react";

export function MobileNav() {
  const pathname = usePathname();

  const isActive = (path: string) => {
    if (path === "/") return pathname === "/" || (pathname !== "/recipes" && pathname !== "/fridge" && pathname !== "/discover" && pathname !== "/planner" && pathname !== "/profile" && !pathname.startsWith("/recipes") && !pathname.startsWith("/fridge") && !pathname.startsWith("/discover") && !pathname.startsWith("/planner") && !pathname.startsWith("/profile"));
    return pathname.startsWith(path);
  };

  const navItems = [
    { href: "/", label: "Home", icon: Home },
    { href: "/app/recipes", label: "Recipes", icon: BookOpen },
    { href: "/app/fridge", label: "Fridge", icon: Box },
    { href: "/app/planner", label: "Planner", icon: Calendar },
    { href: "/app/profile", label: "Profile", icon: User },
  ];

  return (
    <>
      {/* Mobile Header */}
      <header className="md:hidden bg-white/80 backdrop-blur-lg shadow-sm border-b border-stone-200 sticky top-0 z-40">
        <div className="px-4 py-3 flex items-center justify-center">
          <Link href="/" className="flex items-center gap-2">
            <ChefHat className="w-7 h-7 text-terracotta" />
            <span className="text-xl font-bold text-stone-800 font-heading">Mychelin</span>
          </Link>
        </div>
      </header>

      {/* Mobile Bottom Tab Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t border-stone-200 z-50 safe-area-pb">
        <div className="grid grid-cols-5 gap-1 px-1 py-1">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-col items-center py-2 px-1 rounded-xl transition-all duration-200 ${
                  active
                    ? "bg-stone-100 text-terracotta"
                    : "text-stone-400 hover:text-stone-600"
                }`}
              >
                <Icon className={`w-6 h-6 transition-all duration-200 ${active ? "text-terracotta" : ""}`} />
                <span className={`text-xs mt-1 font-medium transition-all duration-200 ${active ? "text-terracotta" : ""}`}>{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
