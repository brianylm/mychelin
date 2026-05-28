"use client";

import { IconButton } from "@radix-ui/themes";
import { useAuth } from "@/context/AuthContext";

interface HeaderProps {
  onMenuClick?: () => void;
  onProfileClick?: () => void;
  onLogoClick?: () => void;
  onSearchClick?: () => void;
  children?: React.ReactNode;
}

export function Header({
  onMenuClick,
  onProfileClick,
  onLogoClick,
  onSearchClick,
  children,
}: HeaderProps) {
  const { user } = useAuth();

  return (
    <header className="sticky left-0 right-0 top-0 z-20 flex h-[60px] items-center justify-between border-b border-white/60 bg-white/55 px-4 shadow-[0_18px_55px_rgba(40,26,19,0.08)] backdrop-blur-2xl backdrop-saturate-150">
      <div className="flex items-center gap-3">
        {/* Hamburger — mobile only */}
        {onMenuClick && (
          <IconButton
            variant="ghost"
            size="2"
            className="md:hidden"
            onClick={onMenuClick}
            aria-label="Open recipes menu"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </IconButton>
        )}

        {/* Logo */}
        <button
          onClick={onLogoClick}
          className="flex items-center gap-2 rounded-full px-2 py-1 transition-colors hover:bg-white/45"
        >
          <img
            src="/images/mychelin-icon.png"
            alt="Mychelin"
            className="h-8 w-8 object-contain"
          />
          <div className="flex flex-col text-left">
            <span className="logo-serif text-base font-bold leading-tight tracking-[-0.015em]">
              <span className="text-[#800020]">my</span><span className="text-[#1A1A1A]">chelin</span>
            </span>
            <span className="text-[10px] leading-tight text-stone-500">
              cook like home
            </span>
          </div>
        </button>
      </div>

      {/* Desktop nav */}
      {children}

      <div className="flex items-center gap-1">
        {/* Search button — opens the recipe search modal */}
        {onSearchClick && (
          <IconButton
            variant="ghost"
            size="2"
            onClick={onSearchClick}
            aria-label="Search recipes"
            title="Search by recipe or ingredient"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </IconButton>
        )}

        {/* Profile button */}
        {user && (
          <button
            onClick={onProfileClick}
            className="flex items-center gap-2 rounded-full px-2 py-1 transition-colors hover:bg-white/45"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#800020]/10 text-xs font-semibold text-[#800020]">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <span className="hidden text-sm font-medium text-stone-700 sm:inline">{user.name}</span>
          </button>
        )}
      </div>
    </header>
  );
}
