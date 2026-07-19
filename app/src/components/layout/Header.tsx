"use client";

import Image from "next/image";
import { Menu, Search } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface HeaderProps {
  onMenuClick?: () => void;
  onProfileClick?: () => void;
  onLogoClick?: () => void;
  onSearchClick?: () => void;
  profileActive?: boolean;
  children?: React.ReactNode;
}

export function Header({
  onMenuClick,
  onProfileClick,
  onLogoClick,
  onSearchClick,
  profileActive = false,
  children,
}: HeaderProps) {
  const { user } = useAuth();

  return (
    <header className="sticky inset-x-0 top-0 z-30 flex h-[68px] items-center bg-transparent px-3 py-2">
      <div className="mx-auto flex h-full w-full min-w-0 items-center gap-1 rounded-full border border-[var(--ui-border)] bg-[var(--ui-surface-raised)] px-2 shadow-[0_8px_24px_rgba(40,26,19,0.1)] sm:gap-2 sm:px-3">
        <div className="flex shrink-0 items-center gap-1">
          {onMenuClick && (
            <button
              type="button"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[var(--ui-text)] transition-colors duration-150 hover:bg-[var(--ui-surface-subtle)] md:hidden"
              onClick={onMenuClick}
              aria-label="Open library panel"
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>
          )}

          <button
            type="button"
            onClick={onLogoClick}
            className="flex h-11 shrink-0 items-center gap-1.5 rounded-full px-1.5 transition-colors duration-150 hover:bg-[var(--ui-surface-subtle)] sm:gap-2 sm:px-2"
            aria-label="Open recipe library"
          >
            <Image
              src="/images/mychelin-icon-96.webp"
              alt=""
              aria-hidden="true"
              width={28}
              height={28}
              className="h-7 w-7 object-contain"
            />
            <span className="logo-serif text-[17px] font-bold leading-none tracking-normal sm:text-lg md:hidden lg:inline">
              <span className="text-[var(--ui-accent)]">my</span>
              <span className="text-[var(--ui-text)]">chelin</span>
            </span>
          </button>
        </div>

        <div className="hidden min-w-0 flex-1 items-center justify-center md:flex">
          {children}
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-1 md:ml-0">
          {onSearchClick && (
            <button
              type="button"
              onClick={onSearchClick}
              className="flex h-11 w-11 items-center justify-center rounded-full text-[var(--ui-text)] transition-colors duration-150 hover:bg-[var(--ui-surface-subtle)] hover:text-[var(--ui-accent)]"
              aria-label="Search recipes"
              title="Search by recipe or ingredient"
            >
              <Search className="h-[18px] w-[18px]" aria-hidden="true" />
            </button>
          )}

          {user && (
            <button
              type="button"
              onClick={onProfileClick}
              aria-label={`Open profile for ${user.name}`}
              aria-current={profileActive ? "page" : undefined}
              className={`flex h-11 items-center gap-2 rounded-full px-1.5 transition-colors duration-150 ${
                profileActive
                  ? "bg-[var(--ui-action)] text-[var(--ui-action-text)]"
                  : "text-[var(--ui-text)] hover:bg-[var(--ui-surface-subtle)]"
              }`}
            >
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold ${
                  profileActive
                    ? "bg-white/15 text-white"
                    : "bg-[var(--ui-accent-muted)] text-[var(--ui-accent)]"
                }`}
              >
                {user.name.charAt(0).toUpperCase()}
              </span>
              <span className="hidden max-w-28 truncate text-sm font-medium xl:inline">
                {user.name}
              </span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
