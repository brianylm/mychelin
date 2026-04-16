"use client";

import { useState, useCallback, useEffect, useRef } from "react";
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
import { PasteRecipeModal } from "@/components/capture/PasteRecipeModal";

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

  // ── FAB speed-dial state ─────────────────────────────────
  const [fabOpen, setFabOpen] = useState(false);
  const [pasteRecipeId, setPasteRecipeId] = useState<number | null>(null);
  const fabRef = useRef<HTMLDivElement>(null);

  // Close speed-dial on outside tap
  useEffect(() => {
    if (!fabOpen) return;
    const handler = (e: MouseEvent) => {
      if (fabRef.current && !fabRef.current.contains(e.target as Node)) {
        setFabOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [fabOpen]);

  // Close speed-dial on Escape
  useEffect(() => {
    if (!fabOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFabOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [fabOpen]);

  const handleFromScratch = useCallback(async () => {
    setFabOpen(false);
    try {
      await createRecipe();
    } catch (err) {
      console.error("Failed to create recipe:", err);
    }
  }, [createRecipe]);

  const handleQuickCapture = useCallback(async () => {
    setFabOpen(false);
    try {
      // Create a blank draft, then open the paste-extract modal on it.
      const res = await fetch("/api/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Untitled recipe", status: "draft" }),
      });
      if (!res.ok) throw new Error("Failed to create recipe");
      const recipe = await res.json();
      qc.invalidateQueries({ queryKey: ["recipes"] });
      selectRecipe(recipe.id);
      setPasteRecipeId(recipe.id);
    } catch (err) {
      console.error("Quick capture failed:", err);
    }
  }, [qc, selectRecipe]);

  const handlePasteModalClose = useCallback(() => {
    setPasteRecipeId(null);
  }, []);

  const handlePasteModalDone = useCallback(() => {
    qc.invalidateQueries({ queryKey: ["recipes"] });
    if (pasteRecipeId) {
      qc.invalidateQueries({ queryKey: ["recipe", pasteRecipeId] });
    }
    setPasteRecipeId(null);
  }, [qc, pasteRecipeId]);

  const showFab = currentView === "recipes" && !isSidebarOpen;

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

      {/* ── Mobile FAB speed-dial ─────────────────────────────
          Two-option popup: "Quick capture" (paste text → AI extract)
          and "From scratch" (blank recipe). Only on the Recipes tab,
          only on mobile, hidden when the sidebar drawer is open. */}
      {showFab && (
        <>
          {/* Scrim behind speed-dial when open */}
          {fabOpen && (
            <div className="fixed inset-0 z-40 bg-neutral-950/20 md:hidden" />
          )}

          <div
            ref={fabRef}
            className="fixed right-5 z-50 flex flex-col items-end gap-3 md:hidden"
            style={{ bottom: "calc(4.5rem + env(safe-area-inset-bottom))" }}
          >
            {/* Speed-dial options */}
            {fabOpen && (
              <div className="mb-1 flex flex-col items-end gap-2">
                {/* Quick capture */}
                <button
                  type="button"
                  onClick={handleQuickCapture}
                  className="flex items-center gap-2.5 rounded-full bg-white py-2 pl-4 pr-3 shadow-lg ring-1 ring-neutral-200 transition-transform active:scale-95"
                >
                  <span className="text-sm font-medium text-neutral-800">
                    Quick capture
                  </span>
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-100 text-violet-700">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M15 4V2"/><path d="M15 16v-2"/><path d="M8 9h2"/><path d="M20 9h2"/><path d="M17.8 11.8 19 13"/><path d="M15 9h.01"/><path d="M17.8 6.2 19 5"/><path d="m3 21 9-9"/><path d="M12.2 6.2 11 5"/>
                    </svg>
                  </span>
                </button>

                {/* From scratch */}
                <button
                  type="button"
                  onClick={handleFromScratch}
                  className="flex items-center gap-2.5 rounded-full bg-white py-2 pl-4 pr-3 shadow-lg ring-1 ring-neutral-200 transition-transform active:scale-95"
                >
                  <span className="text-sm font-medium text-neutral-800">
                    From scratch
                  </span>
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>
                    </svg>
                  </span>
                </button>
              </div>
            )}

            {/* Main FAB button */}
            <button
              type="button"
              onClick={() => setFabOpen((v) => !v)}
              aria-label={fabOpen ? "Close menu" : "New recipe"}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-600 text-white shadow-lg ring-1 ring-amber-700/50 transition-transform active:scale-95"
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
                className={`transition-transform duration-200 ${fabOpen ? "rotate-45" : ""}`}
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
          </div>
        </>
      )}

      {/* Paste-extract modal for Quick Capture flow */}
      {pasteRecipeId != null && (
        <PasteRecipeModal
          recipeId={pasteRecipeId}
          onClose={handlePasteModalClose}
          onRecipeUpdated={handlePasteModalDone}
        />
      )}

      <BottomNav current={currentView} onChange={handleViewChange} />
    </>
  );
}
