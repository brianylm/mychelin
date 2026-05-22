"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { User, LogOut, ChevronDown } from "lucide-react";
import Link from "next/link";

interface UserData {
  id: string;
  name: string;
  email: string;
}

export function UserNav() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<UserData | null>(null);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        }
      } catch {
        // Not logged in
      }
    }
    fetchUser();
  }, [pathname]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    setOpen(false);
    router.push("/login");
    router.refresh();
  }

  if (!user) {
    return (
      <Link
        href="/login"
        className="flex items-center gap-1.5 text-lg text-stone-600 hover:text-stone-900 transition-colors"
      >
        <User className="w-5 h-5" />
        Sign In
      </Link>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-stone-600 hover:text-stone-900 transition-colors"
      >
        <div className="w-8 h-8 rounded-full bg-terracotta/10 flex items-center justify-center">
          <User className="w-4 h-4 text-terracotta" />
        </div>
        <span className="text-sm font-medium max-w-[120px] truncate">{user.name}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-lg border border-stone-200 py-2 z-50 animate-fade-in">
          <div className="px-4 py-2 border-b border-stone-100">
            <p className="font-medium text-stone-800 text-sm">{user.name}</p>
            <p className="text-stone-400 text-xs truncate">{user.email}</p>
          </div>
          <Link
            href="/app/profile"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-4 py-2.5 text-stone-600 hover:bg-stone-50 transition-colors text-sm"
          >
            <User className="w-4 h-4" />
            My Profile
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2.5 text-stone-600 hover:bg-stone-50 transition-colors text-sm w-full text-left"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}

export function MobileUserButton() {
  const [user, setUser] = useState<UserData | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        }
      } catch {
        // Not logged in
      }
    }
    fetchUser();
  }, [pathname]);

  if (!user) return null;

  return (
    <Link
      href="/app/profile"
      className="flex flex-col items-center py-2 px-1 rounded-xl transition-all duration-200 text-stone-400 hover:text-stone-600"
    >
      <User className="w-6 h-6" />
      <span className="text-xs mt-1 font-medium">Profile</span>
    </Link>
  );
}
