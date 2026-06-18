"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { RecipeStoreProvider, useRecipeStore, type RecipeWithRelations } from "@/store/RecipeStore";
import { RecipeSidebar } from "@/components/layout/RecipeSidebar";
import { RecipeView } from "@/components/recipes/RecipeView";
import { Header } from "@/components/layout/Header";
import { AuthScreen } from "@/components/auth/AuthScreen";
import { LoadingAnimation } from "@/components/ui/LoadingAnimation";
import { BottomNav, type AppView } from "@/components/layout/BottomNav";
import { DesktopNav } from "@/components/layout/DesktopNav";
import { MealPlanView } from "@/components/planner/MealPlanView";
import { ProfileView } from "@/components/profile/ProfileView";
import { ActivityView } from "@/components/activity/ActivityView";
import { DiscoverView } from "@/components/discover/DiscoverView";
import { FridgeView } from "@/components/fridge/FridgeView";
import { ShoppingListView } from "@/components/shopping/ShoppingListView";
import { RecipeSearchModal } from "@/components/search/RecipeSearchModal";
import { PasteRecipeModal } from "@/components/capture/PasteRecipeModal";
import { ConversationCapture } from "@/components/capture/ConversationCapture";
import { AiDraftRecipeModal } from "@/components/capture/AiDraftRecipeModal";
import { ManualRecipeScratchpadModal } from "@/components/capture/ManualRecipeScratchpadModal";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";
import { CookWithMeSession } from "@/components/recipes/CookWithMeSession";
import { MultiCookWithMeSession } from "@/components/recipes/MultiCookWithMeSession";
import { PilotFeedbackPrompt } from "@/components/pilot/PilotFeedbackPrompt";
import { useToast } from "@/context/ToastContext";
import { ClipboardPaste, Link, Mic2, PencilLine, Sparkles } from "lucide-react";

type PilotFeedbackStage = "first_capture" | "first_cook" | "first_version" | "pilot_general";

export function RecipeWorkspace() {
  const { user, loading } = useAuth();
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [currentView, setCurrentView] = useState<AppView>("recipes");
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (!user) return;

    let cancelled = false;
    fetch("/api/user/preferences")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        const pendingSignup =
          window.localStorage.getItem("mychelin_onboarding_pending") === "1";
        const createdAt = data.createdAt ? Date.parse(data.createdAt) : 0;
        const rolloutAt = Date.parse("2026-06-06T00:00:00.000Z");
        const newSinceRollout = Number.isFinite(createdAt) && createdAt >= rolloutAt;
        setShowOnboarding(
          data.onboardingCompleted !== true && (pendingSignup || newSinceRollout)
        );
      })
      .catch(() => {
        if (!cancelled) setShowOnboarding(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

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

  if (showOnboarding) {
    return (
      <OnboardingFlow
        userName={user.name}
        onComplete={() => setShowOnboarding(false)}
      />
    );
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
  const qc = useQueryClient();
  const { addToast } = useToast();
  const [searchOpen, setSearchOpen] = useState(false);
  const [shoppingDateRange, setShoppingDateRange] = useState<{ start: string; end: string } | undefined>();
  const [manualScratchpadOpen, setManualScratchpadOpen] = useState(false);
  const [activeCookMeal, setActiveCookMeal] = useState<{
    recipe: RecipeWithRelations;
    mealPlanId?: number;
  } | null>(null);
  const [activeCookBatch, setActiveCookBatch] = useState<Array<{
    recipe: RecipeWithRelations;
    mealPlanId?: number;
  }> | null>(null);
  const [pilotFeedbackStage, setPilotFeedbackStage] = useState<PilotFeedbackStage | null>(null);

  const promptPilotFeedback = useCallback((stage: PilotFeedbackStage) => {
    if (typeof window === "undefined") return;
    const key = "mychelin_pilot_feedback_prompted_" + stage;
    if (window.localStorage.getItem(key) === "1") return;

    const showPrompt = () => {
      if (window.localStorage.getItem(key) === "1") return;
      window.localStorage.setItem(key, "1");
      setPilotFeedbackStage(stage);
    };

    if (stage === "first_capture") {
      const pendingKey = key + "_pending";
      if (window.localStorage.getItem(pendingKey) === "1") return;
      window.localStorage.setItem(pendingKey, "1");
      window.setTimeout(() => {
        window.localStorage.removeItem(pendingKey);
        showPrompt();
      }, 10 * 60 * 1000);
      return;
    }

    window.setTimeout(showPrompt, 600);
  }, []);

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
    setSidebarOpen(false);
    setCurrentView(view);
  }, [selectRecipe, setCurrentView, setSidebarOpen]);

  const startCookSession = useCallback(
    async (recipeId: number, mealPlanId?: number, keepCurrentView = false) => {
      if (!keepCurrentView) {
        selectRecipe(recipeId);
        setCurrentView("recipes");
      }
      try {
        const response = await fetch(`/api/recipes/${recipeId}`);
        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body.error || "Failed to load recipe");
        }
        const recipe = (await response.json()) as RecipeWithRelations;
        setActiveCookMeal({ recipe, mealPlanId });
      } catch (err) {
        addToast(
          err instanceof Error ? err.message : "Couldn't start cooking session",
          "error"
        );
      }
    },
    [addToast, selectRecipe, setCurrentView]
  );

  const handleCookMealPlan = useCallback(
    (recipeId: number, mealPlanId: number) => {
      void startCookSession(recipeId, mealPlanId, true);
    },
    [startCookSession]
  );

  const handleCookMealBatch = useCallback(
    async (meals: Array<{ recipeId: number; mealPlanId: number }>) => {
      if (meals.length === 0) return;
      try {
        const loadedMeals = await Promise.all(
          meals.map(async (meal) => {
            const response = await fetch("/api/recipes/" + meal.recipeId);
            if (!response.ok) {
              const body = await response.json().catch(() => ({}));
              throw new Error(body.error || "Failed to load recipe");
            }
            return {
              recipe: (await response.json()) as RecipeWithRelations,
              mealPlanId: meal.mealPlanId,
            };
          })
        );
        setActiveCookMeal(null);
        setActiveCookBatch(loadedMeals);
        // Keep the planner visible under the batch cooking modal.
      } catch (err) {
        addToast(
          err instanceof Error ? err.message : "Couldn't start batch cooking session",
          "error"
        );
      }
    },
    [addToast]
  );

  const handleCookRecipe = useCallback(
    (recipeId: number) => {
      void startCookSession(recipeId);
    },
    [startCookSession]
  );

  const handleCookMealComplete = useCallback(async () => {
    if (!activeCookMeal) return;

    qc.invalidateQueries({ queryKey: ["recipe", activeCookMeal.recipe.id] });

    if (activeCookMeal.mealPlanId == null) {
      addToast("Cooking session saved", "success");
      promptPilotFeedback("first_cook");
      return;
    }

    const response = await fetch(`/api/meal-plans/${activeCookMeal.mealPlanId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cookedAt: new Date().toISOString() }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.error || "Cooking session saved, but meal was not marked cooked");
    }

    addToast("Cooking session saved and meal marked cooked", "success");
    promptPilotFeedback("first_cook");
  }, [activeCookMeal, addToast, promptPilotFeedback, qc]);


  const handleCookBatchComplete = useCallback(async (mealPlanIds: number[]) => {
    if (!activeCookBatch) return;

    for (const meal of activeCookBatch) {
      qc.invalidateQueries({ queryKey: ["recipe", meal.recipe.id] });
    }

    for (const mealPlanId of mealPlanIds) {
      const response = await fetch("/api/meal-plans/" + mealPlanId, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cookedAt: new Date().toISOString() }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Attempts saved, but one meal was not marked cooked");
      }
    }

    addToast("Batch cooking attempts saved", "success");
    promptPilotFeedback("first_cook");
  }, [activeCookBatch, addToast, promptPilotFeedback, qc]);

  // ── FAB speed-dial state ─────────────────────────────────
  const [fabOpen, setFabOpen] = useState(false);
  const [pasteRecipeId, setPasteRecipeId] = useState<number | null>(null);
  const [pasteMode, setPasteMode] = useState<"paste" | "url">("paste");
  const [conversationRecipeId, setConversationRecipeId] = useState<number | null>(null);
  const [aiDraftOpen, setAiDraftOpen] = useState(false);
  const captureCommittedRef = useRef(false);
  const conversationCommittedRef = useRef(false);
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

  const handleFromScratch = useCallback(() => {
    setFabOpen(false);
    setSidebarOpen(false);
    setCurrentView("recipes");
    setManualScratchpadOpen(true);
  }, [setCurrentView, setSidebarOpen]);

  const createDraftForCapture = useCallback(async (mode: "paste" | "url") => {
    setFabOpen(false);
    try {
      const res = await fetch("/api/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Untitled recipe", status: "draft" }),
      });
      if (!res.ok) throw new Error("Failed to create recipe");
      const recipe = await res.json();
      qc.invalidateQueries({ queryKey: ["recipes"] });
      selectRecipe(recipe.id);
      captureCommittedRef.current = false;
      setPasteMode(mode);
      setPasteRecipeId(recipe.id);
    } catch (err) {
      console.error("Recipe capture failed:", err);
    }
  }, [qc, selectRecipe]);

  const handleQuickCapture = useCallback(() => {
    createDraftForCapture("paste");
  }, [createDraftForCapture]);

  const handleImportUrl = useCallback(() => {
    createDraftForCapture("url");
  }, [createDraftForCapture]);

  const createDraftForConversation = useCallback(async () => {
    setFabOpen(false);
    try {
      const res = await fetch("/api/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Conversation recipe", status: "draft" }),
      });
      if (!res.ok) throw new Error("Failed to create recipe");
      const recipe = await res.json();
      qc.invalidateQueries({ queryKey: ["recipes"] });
      selectRecipe(recipe.id);
      setCurrentView("recipes");
      setSidebarOpen(false);
      conversationCommittedRef.current = false;
      setConversationRecipeId(recipe.id);
    } catch (err) {
      console.error("Conversation capture failed:", err);
      addToast("Could not start conversation capture", "error");
    }
  }, [addToast, qc, selectRecipe, setCurrentView, setSidebarOpen]);

  const handleConversationClose = useCallback(async () => {
    const abandonedRecipeId = conversationRecipeId;
    setConversationRecipeId(null);

    if (!abandonedRecipeId || conversationCommittedRef.current) return;

    try {
      await fetch(`/api/recipes/${abandonedRecipeId}`, { method: "DELETE" });
      selectRecipe(null);
      qc.invalidateQueries({ queryKey: ["recipes"] });
    } catch (err) {
      console.error("Failed to clean up abandoned conversation draft:", err);
    }
  }, [conversationRecipeId, qc, selectRecipe]);

  const handleConversationDone = useCallback(() => {
    conversationCommittedRef.current = true;
    qc.invalidateQueries({ queryKey: ["recipes"] });
    if (conversationRecipeId) {
      qc.invalidateQueries({ queryKey: ["recipe", conversationRecipeId] });
    }
    setConversationRecipeId(null);
    addToast("Recipe captured from conversation", "success");
    promptPilotFeedback("first_capture");
  }, [addToast, conversationRecipeId, promptPilotFeedback, qc]);

  const handleCreateManualRecipe = useCallback(async (draft: {
    title: string;
    ingredients: Array<{
      name: string;
      quantity?: number | null;
      unit?: string | null;
      approximate?: boolean;
      quantityText?: string | null;
      notes?: string;
    }>;
    instructions: Array<{ content: string; tip?: string }>;
  }) => {
    const response = await fetch("/api/recipes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...draft, status: "active" }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.error || "Failed to create recipe");
    }
    const recipe = await response.json();
    qc.invalidateQueries({ queryKey: ["recipes"] });
    qc.invalidateQueries({ queryKey: ["recipe", recipe.id] });
    selectRecipe(recipe.id);
    setCurrentView("recipes");
    setSidebarOpen(false);
    setManualScratchpadOpen(false);
    addToast("Recipe created", "success");
    promptPilotFeedback("first_capture");
  }, [addToast, promptPilotFeedback, qc, selectRecipe, setCurrentView, setSidebarOpen]);

  const handleCreateAiDraft = useCallback(async (draft: {
    title: string;
    description?: string;
    cuisine?: string;
    yield?: string;
    prepTime?: number | null;
    cookTime?: number | null;
    story?: string;
    ingredients: Array<{
      name: string;
      quantity?: number | null;
      unit?: string | null;
      approximate?: boolean;
      quantityText?: string | null;
      notes?: string;
    }>;
    instructions: Array<{ content: string; tip?: string }>;
  }) => {
    const response = await fetch("/api/recipes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...draft, status: "draft" }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.error || "Failed to save draft recipe");
    }
    const recipe = await response.json();
    qc.invalidateQueries({ queryKey: ["recipes"] });
    selectRecipe(recipe.id);
    setCurrentView("recipes");
    setSidebarOpen(false);
    setFabOpen(false);
    addToast("Draft recipe created", "success");
    promptPilotFeedback("first_capture");
  }, [addToast, promptPilotFeedback, qc, selectRecipe, setCurrentView, setSidebarOpen]);

  const handlePasteModalClose = useCallback(async () => {
    const abandonedRecipeId = pasteRecipeId;
    setPasteRecipeId(null);

    if (!abandonedRecipeId || captureCommittedRef.current) return;

    try {
      await fetch(`/api/recipes/${abandonedRecipeId}`, { method: "DELETE" });
      selectRecipe(null);
      qc.invalidateQueries({ queryKey: ["recipes"] });
    } catch (err) {
      console.error("Failed to clean up abandoned capture draft:", err);
    }
  }, [pasteRecipeId, qc, selectRecipe]);

  const handlePasteModalDone = useCallback(() => {
    captureCommittedRef.current = true;
    qc.invalidateQueries({ queryKey: ["recipes"] });
    if (pasteRecipeId) {
      qc.invalidateQueries({ queryKey: ["recipe", pasteRecipeId] });
    }
    setPasteRecipeId(null);
    promptPilotFeedback("first_capture");
  }, [pasteRecipeId, promptPilotFeedback, qc]);

  const showFab = currentView === "recipes" && !isSidebarOpen;

  return (
    <>
      <Header
        onMenuClick={() => setSidebarOpen(true)}
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

      <div className="flex h-[calc(100dvh-68px)] w-full bg-transparent text-foreground">
        {currentView !== "recipes" && (
          <RecipeSidebar
            mobileOnly
            isOpen={isSidebarOpen}
            onClose={() => setSidebarOpen(false)}
            onPasteText={handleQuickCapture}
            onImportUrl={handleImportUrl}
            onCookRecipe={handleCookRecipe}
            onCaptureConversation={createDraftForConversation}
            onAiDraft={() => setAiDraftOpen(true)}
            onManualRecipe={handleFromScratch}
          />
        )}
        {currentView === "recipes" && (
          <>
            <RecipeSidebar
              isOpen={isSidebarOpen}
              onClose={() => setSidebarOpen(false)}
              onPasteText={handleQuickCapture}
              onImportUrl={handleImportUrl}
              onCookRecipe={handleCookRecipe}
              onCaptureConversation={createDraftForConversation}
              onAiDraft={() => setAiDraftOpen(true)}
              onManualRecipe={handleFromScratch}
            />
            <RecipeView
              onOpenSidebar={() => setSidebarOpen(true)}
              onCookRecipe={handleCookRecipe}
            />
          </>
        )}
        {currentView === "activity" && <ActivityView onNavigateToRecipe={handleNavigateToRecipe} />}
        {currentView === "fridge" && <FridgeView />}
        {currentView === "shopping" && (
          <ShoppingListView initialDateRange={shoppingDateRange} />
        )}
        {currentView === "plan" && (
          <MealPlanView
            onCookMeal={handleCookMealPlan}
            onCookMeals={handleCookMealBatch}
            onOpenShoppingList={(range) => {
              setShoppingDateRange(range);
              setCurrentView("shopping");
            }}
          />
        )}
        {currentView === "discover" && <DiscoverView onNavigateToRecipe={handleNavigateToRecipe} />}
        {currentView === "profile" && <ProfileView />}
      </div>

      {/* ── Mobile FAB speed-dial ─────────────────────────────
          Entry routes: import URL, paste text, conversation, Ask Mychelin,
          or manual scratchpad. Only on the Recipes tab, only on mobile, hidden when
          the sidebar drawer is open. */}
      {showFab && (
        <>
          {/* Scrim behind speed-dial when open */}
          {fabOpen && (
            <div className="fixed inset-0 z-40 bg-stone-950/20 backdrop-blur-[2px] md:hidden" />
          )}

          <div
            ref={fabRef}
            className="fixed right-5 z-50 flex flex-col items-end gap-3 md:hidden"
            style={{ bottom: "calc(4.5rem + env(safe-area-inset-bottom))" }}
          >
            {/* Speed-dial options */}
            {fabOpen && (
              <div className="mb-1 flex flex-col items-end gap-2">
                <button
                  type="button"
                  onClick={handleImportUrl}
                  className="flex w-52 items-center gap-2.5 rounded-full bg-white/90 py-2 pl-4 pr-3 shadow-[0_18px_45px_rgba(40,26,19,0.14)] ring-1 ring-white/70 backdrop-blur-xl transition-transform hover:ring-[#800020]/20 active:scale-95"
                >
                  <span className="flex-1 text-sm font-medium text-neutral-800">
                    Import URL
                  </span>
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#800020]/10 text-[#800020]">
                    <Link className="h-[18px] w-[18px]" />
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleQuickCapture}
                  className="flex w-52 items-center gap-2.5 rounded-full bg-white/90 py-2 pl-4 pr-3 shadow-[0_18px_45px_rgba(40,26,19,0.14)] ring-1 ring-white/70 backdrop-blur-xl transition-transform hover:ring-[#800020]/20 active:scale-95"
                >
                  <span className="flex-1 text-sm font-medium text-neutral-800">
                    Paste text
                  </span>
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#800020]/10 text-[#800020]">
                    <ClipboardPaste className="h-[18px] w-[18px]" />
                  </span>
                </button>

                <button
                  type="button"
                  onClick={createDraftForConversation}
                  className="flex w-52 items-center gap-2.5 rounded-full bg-white/90 py-2 pl-4 pr-3 shadow-[0_18px_45px_rgba(40,26,19,0.14)] ring-1 ring-white/70 backdrop-blur-xl transition-transform hover:ring-[#800020]/20 active:scale-95"
                >
                  <span className="flex-1 text-sm font-medium text-neutral-800">
                    Live conversation
                  </span>
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#800020]/10 text-[#800020]">
                    <Mic2 className="h-[18px] w-[18px]" />
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setFabOpen(false);
                    setAiDraftOpen(true);
                  }}
                  className="flex w-52 items-center gap-2.5 rounded-full bg-white/90 py-2 pl-4 pr-3 shadow-[0_18px_45px_rgba(40,26,19,0.14)] ring-1 ring-white/70 backdrop-blur-xl transition-transform hover:ring-[#800020]/20 active:scale-95"
                >
                  <span className="flex-1 text-sm font-medium text-neutral-800">
                    Ask Mychelin
                  </span>
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#800020]/10 text-[#800020]">
                    <Sparkles className="h-[18px] w-[18px]" />
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleFromScratch}
                  className="flex w-52 items-center gap-2.5 rounded-full bg-white/90 py-2 pl-4 pr-3 shadow-[0_18px_45px_rgba(40,26,19,0.14)] ring-1 ring-white/70 backdrop-blur-xl transition-transform hover:ring-[#800020]/20 active:scale-95"
                >
                  <span className="flex-1 text-sm font-medium text-neutral-800">
                    Manual scratchpad
                  </span>
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#800020]/10 text-[#800020]">
                    <PencilLine className="h-[18px] w-[18px]" />
                  </span>
                </button>
              </div>
            )}

            {/* Main FAB button */}
            <button
              type="button"
              onClick={() => setFabOpen((v) => !v)}
              aria-label={fabOpen ? "Close menu" : "New recipe"}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-[#17131f] text-white shadow-[0_18px_40px_rgba(23,19,31,0.24)] ring-1 ring-white/20 transition-transform hover:bg-[#800020] active:scale-95"
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

      {conversationRecipeId != null && (
        <ConversationCapture
          recipeId={conversationRecipeId}
          onClose={handleConversationClose}
          onRecipeUpdated={handleConversationDone}
        />
      )}

      {manualScratchpadOpen && (
        <ManualRecipeScratchpadModal
          onClose={() => setManualScratchpadOpen(false)}
          onCreateRecipe={handleCreateManualRecipe}
        />
      )}

      {aiDraftOpen && (
        <AiDraftRecipeModal
          onClose={() => setAiDraftOpen(false)}
          onCreateDraft={handleCreateAiDraft}
        />
      )}

      {pilotFeedbackStage && (
        <PilotFeedbackPrompt
          stage={pilotFeedbackStage}
          source="milestone_prompt"
          onClose={() => setPilotFeedbackStage(null)}
        />
      )}

      {activeCookMeal && (
        <CookWithMeSession
          recipe={activeCookMeal.recipe}
          mealPlanId={activeCookMeal.mealPlanId}
          onClose={() => setActiveCookMeal(null)}
          onComplete={handleCookMealComplete}
        />
      )}

      {activeCookBatch && (
        <MultiCookWithMeSession
          meals={activeCookBatch}
          onClose={() => setActiveCookBatch(null)}
          onComplete={handleCookBatchComplete}
        />
      )}

      {/* Paste-extract modal for Quick Capture flow */}
      {pasteRecipeId != null && (
        <PasteRecipeModal
          recipeId={pasteRecipeId}
          onClose={handlePasteModalClose}
          onRecipeUpdated={handlePasteModalDone}
          initialMode={pasteMode}
        />
      )}

      <BottomNav current={currentView} onChange={handleViewChange} />
    </>
  );
}
