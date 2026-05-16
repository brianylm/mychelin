import type { Metadata } from "next";
import { Playfair_Display, DM_Sans } from "next/font/google";
import Script from "next/script";
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
  manifest: "/manifest.json",
  themeColor: "#C2714F",
  appleWebApp: {
    capable: true,
    title: "Mychelin",
    statusBarStyle: "default",
  },
  icons: {
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${dmSans.variable} ${playfair.variable} font-sans bg-stone-50 min-h-screen`}>
        {/* Floating glassmorphism nav — desktop */}
        <header className="hidden md:block fixed top-5 left-1/2 -translate-x-1/2 z-50">
          <nav className="flex items-center gap-4 px-5 py-3 rounded-full bg-white/70 backdrop-blur-xl ring-1 ring-stone-200/60 [box-shadow:inset_0_1px_1px_rgba(255,255,255,0.8),0_4px_24px_rgba(0,0,0,0.06)]">
            <a href="/" className="flex items-center gap-2 shrink-0">
              <ChefHat className="w-6 h-6 text-terracotta" />
              <span className="text-lg font-bold text-stone-800 font-heading">Mychelin</span>
            </a>
            <div className="w-px h-5 bg-stone-200" />
            <a href="/recipes" className="flex items-center gap-1 text-sm font-medium text-stone-500 hover:text-stone-900 transition-colors">
              <BookOpen className="w-4 h-4" />
              Recipes
            </a>
            <a href="/fridge" className="flex items-center gap-1 text-sm font-medium text-stone-500 hover:text-stone-900 transition-colors">
              <Box className="w-4 h-4" />
              Fridge
            </a>
            <a href="/planner" className="flex items-center gap-1 text-sm font-medium text-stone-500 hover:text-stone-900 transition-colors">
              <Calendar className="w-4 h-4" />
              Planner
            </a>
            <div className="w-px h-5 bg-stone-200" />
            <UserNav />
          </nav>
        </header>

        {/* Mobile Nav */}
        <MobileNav />

        <main className="pb-24 md:pb-8">
          {children}
        </main>
        <Script id="sw-register" strategy="afterInteractive">
          {`
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', function() {
                navigator.serviceWorker.register('/sw.js').catch(function() {});
              });
            }
          `}
        </Script>
      </body>
    </html>
  );
}
