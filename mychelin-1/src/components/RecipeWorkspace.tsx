"use client";

import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
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
import { RecipeSearchModal } from "@/components/search/RecipeSearchModal";

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
  const { selectRecipe, createRecipe } = useRecipeStore();
  const qc = useQueryClient();
  const [searchOpen, setSearchOpen] = useState(false);

  const handleNavigateToRecipe = useCallback((recipeId: number) => {
    // Always refresh the list — a navigation often follows a fork/create
    // from elsewhere in the app, and the sidebar list is cached.
    qc.invalidateQueries({ queryKey: ["recipes"] });
    selectRecipe(recipeId);
    setCurrentView("recipes");
  }, [qc, selectRecipe, setCurrentView]);

  const handleViewChange = useCallback((view: AppView) => {
    // When clicking "Recipes" tab, go to card grid (deselect recipe)
    if (view === "recipes") {
      selectRecipe(null);
    }
    setCurrentView(view);
  }, [selectRecipe, setCurrentView]);

  const handleCreateBlankRecipe = useCallback(async () => {
    try {
      await createRecipe();
    } catch (err) {
      console.error("Failed to create recipe:", err);
    }
  }, [createRecipe]);

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
        onSearchClick={() => setSearchOpen(true)}
      >
        <DesktopNav current={currentView} onChange={handleViewChange} />
      </Header>

      {searchOpen && (
        <RecipeSearchModal
          onClose={() => setSearchOpen(false)}
          onPickRecipe={(recipeId) => handleNavigateToRecipe(recipeId)}
        />
      )}

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
        {currentView === "discover" && <DiscoverView onNavigateToRecipe={handleNavigateToRecipe} />}
        {currentView === "profile" && <ProfileView />}
      </div>

      {/* Mobile new-recipe FAB. Sits above the BottomNav (h-16) and
          respects the iOS safe-area inset. Only shown on the Recipes
          view — other tabs have their own flows. Desktop users already
          have the "New Recipe" button in the sidebar, so we hide this
          at md+. Also hidden while the mobile sidebar is open so it
          doesn't visually overlap the slide-in drawer. */}
      {currentView === "recipes" && !isSidebarOpen && (
        <button
          type="button"
          onClick={handleCreateBlankRecipe}
          aria-label="New recipe"
          className="fixed right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-amber-600 text-white shadow-lg ring-1 ring-amber-700/50 transition-transform active:scale-95 md:hidden"
          style={{ bottom: "calc(4.5rem + env(safe-area-inset-bottom))" }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      )}

      <BottomNav current={currentView} onChange={handleViewChange} />
    </>
  );
}
