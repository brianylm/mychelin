"use client";

import { useEffect } from "react";
import { AuthScreen } from "@/components/auth/AuthScreen";
import { LoadingAnimation } from "@/components/ui/LoadingAnimation";
import { useAuth } from "@/context/AuthContext";

interface LoginPageClientProps {
  authenticatedDestination: string;
  defaultMode: "login" | "signup";
}

export function LoginPageClient({
  authenticatedDestination,
  defaultMode,
}: LoginPageClientProps) {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (user) {
      window.location.href = authenticatedDestination;
    }
  }, [authenticatedDestination, user]);

  if (loading || user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <LoadingAnimation />
      </div>
    );
  }

  return <AuthScreen defaultMode={defaultMode} />;
}
