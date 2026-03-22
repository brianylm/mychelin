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
    { href: "/recipes", label: "Recipes", icon: BookOpen },
    { href: "/fridge", label: "Fridge", icon: Box },
    { href: "/planner", label: "Planner", icon: Calendar },
    { href: "/profile", label: "Profile", icon: User },
  ];

  return (
    <>
      {/* Mobile Header */}
      <header className="md:hidden bg-white border-b border-stone-200 sticky top-0 z-40">
        <div className="px-6 py-4 flex items-center justify-center">
          <Link href="/" className="flex items-center gap-2">
            <ChefHat className="w-7 h-7 text-terracotta" />
            <span className="text-xl font-bold text-stone-800 font-heading">Mychelin</span>
          </Link>
        </div>
      </header>

      {/* Mobile Bottom Tab Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 z-50 safe-area-pb">
        <div className="grid grid-cols-5 gap-1 px-2 py-2">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-col items-center py-2 px-1 rounded-xl transition-colors duration-200 ${
                  active
                    ? "text-terracotta"
                    : "text-stone-400 hover:text-stone-600"
                }`}
              >
                <Icon className={`w-6 h-6 ${active ? "text-terracotta" : ""}`} />
                <span className={`text-xs mt-1 font-medium ${active ? "text-terracotta" : ""}`}>{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
