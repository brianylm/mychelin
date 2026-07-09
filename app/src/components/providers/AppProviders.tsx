"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Theme } from "@radix-ui/themes";
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
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  if (pathname === "/") {
    return children;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Theme accentColor="amber" grayColor="sand" radius="large" scaling="100%">
        <ToastProvider>
          <AuthProvider>{children}</AuthProvider>
        </ToastProvider>
      </Theme>
    </QueryClientProvider>
  );
}
