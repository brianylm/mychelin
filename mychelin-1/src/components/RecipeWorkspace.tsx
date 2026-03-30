"use client";

import { useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { RecipeStoreProvider, useRecipeStore } from "@/store/RecipeStore";
import { RecipeSidebar } from "@/components/layout/RecipeSidebar";
import { RecipeView } from "@/components/recipes/RecipeView";
import { Header } from "@/components/layout/Header";
import { AuthScreen } from "@/components/auth/AuthScreen";
import { LoadingAnimation } from "@/components/ui/LoadingAnimation";
import { BottomNav, type AppView } from "@/components/layout/BottomNav";
import { DesktopNav } from "@/components/layout/DesktopNav";
import { MealPlanView } from "@/components/planner/MealPlanView";
import { ProfileView } from "@/components/profile/ProfileView";
import { DiscoverView } from "@/components/discover/DiscoverView";
import { FridgeView } from "@/components/fridge/FridgeView";
import { ShoppingListView } from "@/components/shopping/ShoppingListView";
import { ConversationCapture } from "@/components/capture/ConversationCapture";

export function RecipeWorkspace() {
  const { user, loading } = useAuth();
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [currentView, setCurrentView] = useState<AppView>("recipes");

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
      <RecipeWorkspaceContent 
        currentView={currentView}
        setCurrentView={setCurrentView}
        isSidebarOpen={isSidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />
    </RecipeStoreProvider>
  );
}

function RecipeWorkspaceContent({ 
  currentView, 
  setCurrentView, 
  isSidebarOpen, 
  setSidebarOpen 
}: {
  currentView: AppView;
  setCurrentView: (view: AppView) => void;
  isSidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}) {
  const { selectRecipe } = useRecipeStore();

  const handleNavigateToRecipe = useCallback((recipeId: number) => {
    selectRecipe(recipeId);
    setCurrentView("recipes");
  }, [selectRecipe, setCurrentView]);

  const handleViewChange = useCallback((view: AppView) => {
    // When clicking "Recipes" tab, go to card grid (deselect recipe)
    if (view === "recipes") {
      selectRecipe(null);
    }
    setCurrentView(view);
  }, [selectRecipe, setCurrentView]);

  return (
    <>
      <Header
        onMenuClick={
          currentView === "recipes"
            ? () => setSidebarOpen(true)
            : undefined
        }
        onProfileClick={() => handleViewChange("profile")}
        onLogoClick={() => handleViewChange("recipes")}
      >
        <DesktopNav current={currentView} onChange={handleViewChange} />
      </Header>

      <div className="flex h-[calc(100dvh-50px)] w-full bg-surface text-foreground">
        {currentView === "recipes" && (
          <>
            <RecipeSidebar
              isOpen={isSidebarOpen}
              onClose={() => setSidebarOpen(false)}
              onOpen={() => setSidebarOpen(true)}
            />
            <RecipeView onOpenSidebar={() => setSidebarOpen(true)} />
          </>
        )}
        {currentView === "fridge" && <FridgeView />}
        {currentView === "shopping" && <ShoppingListView />}
        {currentView === "plan" && <MealPlanView />}
        {currentView === "capture" && <ConversationCapture />}
        {currentView === "discover" && <DiscoverView onNavigateToRecipe={handleNavigateToRecipe} />}
        {currentView === "profile" && <ProfileView />}
      </div>

      <BottomNav current={currentView} onChange={handleViewChange} />
    </>
  );
}
