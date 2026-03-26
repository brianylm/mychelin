"use client";

import { Button, DropdownMenu, IconButton } from "@radix-ui/themes";
import { useAuth } from "@/context/AuthContext";

interface HeaderProps {
  onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { user, logout } = useAuth();

  return (
    <header className="sticky left-0 right-0 top-0 z-20 flex h-[50px] items-center justify-between border-b border-neutral-200 bg-white/80 px-4 backdrop-blur-sm">
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
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100">
            <span className="text-lg">🍜</span>
          </div>
          <div className="flex flex-col">
            <span className="text-base font-semibold leading-tight tracking-tight">
              Mychelin
            </span>
            <span className="text-[10px] leading-tight text-neutral-500">
              family recipe heritage
            </span>
          </div>
        </div>
      </div>

      {/* User menu */}
      {user && (
        <DropdownMenu.Root>
          <DropdownMenu.Trigger>
            <Button variant="ghost" size="2" color="gray">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-100 text-xs font-semibold text-amber-700">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <span className="hidden text-sm sm:inline">{user.name}</span>
            </Button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content>
            <DropdownMenu.Label>{user.email}</DropdownMenu.Label>
            <DropdownMenu.Separator />
            <DropdownMenu.Item color="red" onClick={() => logout()}>
              Log out
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Root>
      )}
    </header>
  );
}
