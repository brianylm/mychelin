"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { AuthScreen } from "@/components/auth/AuthScreen";
import { LoadingAnimation } from "@/components/ui/LoadingAnimation";

export default function LoginPage() {
  const { user, loading } = useAuth();
  const [mode] = useState<"login" | "signup">(() => {
    if (typeof window === "undefined") return "login";
    return new URLSearchParams(window.location.search).get("mode") === "signup"
      ? "signup"
      : "login";
  });

  useEffect(() => {
    if (user) {
      window.location.href = "/app";
    }
  }, [user]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <LoadingAnimation />
      </div>
    );
  }

  if (user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <LoadingAnimation />
      </div>
    );
  }

  return <AuthScreen defaultMode={mode} />;
}
