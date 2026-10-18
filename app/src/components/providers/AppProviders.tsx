"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { ToastProvider } from "@/context/ToastContext";
import { AuthProvider } from "@/context/AuthContext";

export function AppProviders({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000,
            // Tab views keep their last response here while unmounted
            // (lib/view-cache.ts); keep it long enough for a session.
            gcTime: 30 * 60 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  if (pathname === "/") {
    return children;
  }

  // /app supplies its own AuthProvider with the server-verified session so
  // the shell does not wait on (or duplicate) a client /api/auth/me request.
  const content = pathname === "/app" ? (
    children
  ) : (
    <AuthProvider>{children}</AuthProvider>
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        {content}
      </ToastProvider>
    </QueryClientProvider>
  );
}
