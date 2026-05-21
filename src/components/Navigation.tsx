"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { ChefHat, BookOpen, Box, Calendar, User, Sparkles } from "lucide-react";
import { UserNav } from "./UserNav";

export function Navigation() {
  const pathname = usePathname();

  // Landing page nav (only on /)
  if (pathname === "/") {
    return (
      <header className="hidden md:block fixed top-5 left-1/2 -translate-x-1/2 z-50">
        <nav className="flex items-center gap-6 px-6 py-3 rounded-full bg-white/70 backdrop-blur-xl ring-1 ring-stone-200/60 [box-shadow:inset_0_1px_1px_rgba(255,255,255,0.8),0_4px_24px_rgba(0,0,0,0.06)]">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <span
              className="text-lg font-bold tracking-tight"
              style={{
                fontFamily: "'Libre Baskerville', 'Georgia', serif",
                fontWeight: 700,
                letterSpacing: "-0.015em",
                textTransform: "lowercase",
              }}
            >
              <span style={{ color: "#7A1C22" }}>my</span>
              <span style={{ color: "#262626" }}>chelin</span>
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/signup"
              className="text-sm font-medium text-stone-600 hover:text-stone-900 transition-colors"
            >
              Get started
            </Link>
            <Link
              href="/login"
              className="text-sm font-medium text-stone-600 hover:text-stone-900 transition-colors"
            >
              Sign in
            </Link>
          </div>
        </nav>
      </header>
    );
  }

  // App nav (on /app/* and auth pages)
  const isAppRoute = pathname?.startsWith("/app");
  const isAuthRoute = pathname === "/login" || pathname === "/signup";

  // Don't show nav on auth pages
  if (isAuthRoute) return null;

  // App nav
  return (
    <>
      {/* Desktop floating nav */}
      <header className="hidden md:block fixed top-5 left-1/2 -translate-x-1/2 z-50">
        <nav className="flex items-center gap-4 px-5 py-3 rounded-full bg-white/70 backdrop-blur-xl ring-1 ring-stone-200/60 [box-shadow:inset_0_1px_1px_rgba(255,255,255,0.8),0_4px_24px_rgba(0,0,0,0.06)]">
          <Link href="/app" className="flex items-center gap-2 shrink-0">
            <ChefHat className="w-6 h-6 text-terracotta" />
            <span className="text-lg font-bold text-stone-800 font-heading">Mychelin</span>
          </Link>
          <div className="w-px h-5 bg-stone-200" />
          <Link href="/app/recipes" className="flex items-center gap-1 text-sm font-medium text-stone-500 hover:text-stone-900 transition-colors">
            <BookOpen className="w-4 h-4" />
            Recipes
          </Link>
          <Link href="/app/fridge" className="flex items-center gap-1 text-sm font-medium text-stone-500 hover:text-stone-900 transition-colors">
            <Box className="w-4 h-4" />
            Fridge
          </Link>
          <Link href="/app/planner" className="flex items-center gap-1 text-sm font-medium text-stone-500 hover:text-stone-900 transition-colors">
            <Calendar className="w-4 h-4" />
            Planner
          </Link>
          <div className="w-px h-5 bg-stone-200" />
          <UserNav />
        </nav>
      </header>

      {/* Mobile nav — only on app routes */}
      {isAppRoute && <MobileAppNav />}
    </>
  );
}

function MobileAppNav() {
  const pathname = usePathname();

  const isActive = (path: string) => {
    if (path === "/app") return pathname === "/app" || (pathname !== "/app/recipes" && pathname !== "/app/fridge" && pathname !== "/app/planner" && pathname !== "/app/profile" && !pathname.startsWith("/app/recipes") && !pathname.startsWith("/app/fridge") && !pathname.startsWith("/app/planner") && !pathname.startsWith("/app/profile"));
    return pathname.startsWith(path);
  };

  const navItems = [
    { href: "/app", label: "Home", icon: Sparkles },
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
          <Link href="/app" className="flex items-center gap-2">
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
