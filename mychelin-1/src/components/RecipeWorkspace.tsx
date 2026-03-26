"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { RecipeStoreProvider } from "@/store/RecipeStore";
import { RecipeSidebar } from "@/components/layout/RecipeSidebar";
import { RecipeView } from "@/components/recipes/RecipeView";
import { Header } from "@/components/layout/Header";
import { AuthScreen } from "@/components/auth/AuthScreen";
import { LoadingAnimation } from "@/components/ui/LoadingAnimation";

export function RecipeWorkspace() {
  const { user, loading } = useAuth();
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <LoadingAnimation />
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  return (
    <RecipeStoreProvider>
      <Header onMenuClick={() => setSidebarOpen(true)} />
      <div className="flex h-[calc(100dvh-50px)] w-full bg-surface text-foreground">
        <RecipeSidebar
          isOpen={isSidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onOpen={() => setSidebarOpen(true)}
        />
        <RecipeView onOpenSidebar={() => setSidebarOpen(true)} />
      </div>
    </RecipeStoreProvider>
  );
}
