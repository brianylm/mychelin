"use client";

import Image from "next/image";
import { Menu, Search } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface HeaderProps {
  title?: string;
  onMenuClick?: () => void;
  onProfileClick?: () => void;
  onLogoClick?: () => void;
  onSearchClick?: () => void;
  children?: React.ReactNode;
}

export function Header({
  title,
  onMenuClick,
  onProfileClick,
  onLogoClick,
  onSearchClick,
  children,
}: HeaderProps) {
  const { user } = useAuth();

  return (
    <header className="sticky inset-x-0 top-0 z-20 h-16 border-b border-[var(--ui-border)] bg-[var(--ui-surface)]">
      <div className="flex h-full w-full items-center gap-2 px-3 sm:px-4">
        {onMenuClick && (
          <button
            type="button"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-[var(--ui-text)] transition-colors duration-200 hover:bg-[var(--ui-surface-subtle)] md:hidden"
            onClick={onMenuClick}
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>
        )}

        <button
          type="button"
          onClick={onLogoClick}
          className="flex h-11 shrink-0 items-center gap-2 rounded-lg px-2 transition-colors duration-200 hover:bg-[var(--ui-surface-subtle)]"
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
          <span className="logo-serif text-lg font-bold leading-none">
            <span className="text-[var(--ui-accent)]">my</span>
            <span className="text-[var(--ui-text)]">chelin</span>
          </span>
        </button>

        <div className="hidden min-w-0 flex-1 items-center gap-3 md:flex">
          <span className="h-5 w-px bg-[var(--ui-border-strong)]" aria-hidden="true" />
          {title && (
            <span className="truncate text-sm font-semibold text-[var(--ui-muted-strong)]">
              {title}
            </span>
          )}
          {children}
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-1">
          {onSearchClick && (
            <button
              type="button"
              onClick={onSearchClick}
              className="flex h-11 w-11 items-center justify-center rounded-lg text-[var(--ui-muted-strong)] transition-colors duration-200 hover:bg-[var(--ui-surface-subtle)] hover:text-[var(--ui-accent)]"
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
              className="flex h-11 items-center gap-2 rounded-lg px-1.5 transition-colors duration-200 hover:bg-[var(--ui-surface-subtle)]"
              aria-label={`Open profile for ${user.name}`}
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--ui-accent-muted)] text-xs font-semibold text-[var(--ui-accent)]">
                {user.name.charAt(0).toUpperCase()}
              </span>
              <span className="hidden max-w-32 truncate text-sm font-medium text-[var(--ui-muted-strong)] lg:inline">
                {user.name}
              </span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
