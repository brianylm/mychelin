"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BookOpen,
  Check,
  ChefHat,
  Copy,
  Crown,
  Download,
  House,
  Loader2,
  LogOut,
  Trash2,
  UserMinus,
  UserPlus,
  X,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";

interface HouseholdData {
  id: number;
  name: string;
  joinCode: string;
  createdAt: string;
  memberCount: number;
  myRole: "admin" | "member";
}

interface HouseholdMemberRow {
  userId: number;
  name: string;
  role: "admin" | "member";
  joinedAt: string;
}

interface HouseholdActivityRow {
  id: number;
  userId: number;
  userName: string;
  action: string;
  targetName: string | null;
  createdAt: string;
}

function describeActivity(item: HouseholdActivityRow): string {
  const target = item.targetName ? ` ${item.targetName}` : "";
  switch (item.action) {
    case "created_household":
      return `${item.userName} created the household`;
    case "joined_household":
      return `${item.userName} joined`;
    case "left_household":
      return `${item.userName} left`;
    case "promoted_member":
      return `${item.userName} made${target} an admin`;
    case "removed_member":
      return `${item.userName} removed${target}`;
    case "added_meal":
      return `${item.userName} added${target} to the plan`;
    case "removed_meal":
      return `${item.userName} removed${target} from the plan`;
    case "blocked_slot":
      return `${item.userName} is out for${target}`;
    case "added_item":
      return `${item.userName} added${target} to inventory`;
    case "edited_item":
      return `${item.userName} updated${target} in inventory`;
    case "removed_item":
      return `${item.userName} removed${target} from inventory`;
    case "used_item":
      return `${item.userName} used${target}`;
    case "added_shopping_item":
      return `${item.userName} added${target} to the shopping list`;
    case "removed_shopping_item":
      return `${item.userName} removed${target} from the shopping list`;
    case "ticked_shopping_item":
      return `${item.userName} bought${target}`;
    case "moved_to_inventory":
      return `${item.userName} moved${target} to inventory`;
    case "reactivated_household":
      return `${item.userName} reactivated the household`;
    case "deleted_household":
      return `${item.userName} deleted the household`;
    case "shared_recipe":
      return `${item.userName} shared${target} with the household`;
    case "unshared_recipe":
      return `${item.userName} unshared${target}`;
    case "shared_all_recipes":
      return `${item.userName} shared all their recipes with the household`;
    case "imported_recipe":
      return `${item.userName} imported${target} from the household`;
    default:
      return `${item.userName} ${item.action}${target}`;
  }
}

function formatActivityTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const minutes = Math.max(0, Math.floor((Date.now() - then) / 60_000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(iso).toLocaleDateString("en-SG", { day: "numeric", month: "short" });
}

// Household home: create or join by code when solo; member list with
// role badges, promote/remove/leave controls, and the activity feed
// once inside one. The whole view only mounts when HOUSEHOLDS_ENABLED
// (see RecipeWorkspace / the nav tabs).
interface HouseholdViewProps {
  // Launch a Cook With Me session for a household-shared recipe (practice
  // mode when the cook doesn't own it — nothing is persisted).
  onCookRecipe?: (recipeId: number) => void;
}

interface SharedRecipeRow {
  id: number;
  title: string;
  cuisine: string | null;
  status: string;
  yield: string | null;
  imageUrl: string | null;
  ownerId: number;
  ownerName: string;
  isOwner: boolean;
}

interface SharedRecipeDetail {
  id: number;
  title: string;
  description: string | null;
  cuisine: string | null;
  yield: string | null;
  ingredients: Array<{
    name: string;
    quantity: number | null;
    unit: string | null;
    approximate: boolean;
    quantityText: string | null;
    notes: string | null;
  }>;
  instructions: Array<{ stepNumber: number; content: string; tip: string | null }>;
}

export function HouseholdView({ onCookRecipe }: HouseholdViewProps) {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [household, setHousehold] = useState<HouseholdData | null>(null);
  const [members, setMembers] = useState<HouseholdMemberRow[]>([]);
  const [activity, setActivity] = useState<HouseholdActivityRow[]>([]);
  const [newName, setNewName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  // Slice 3 — shared recipes surface.
  const [sharedRecipes, setSharedRecipes] = useState<SharedRecipeRow[]>([]);
  const [recipesLoading, setRecipesLoading] = useState(true);
  const [viewingRecipeId, setViewingRecipeId] = useState<number | null>(null);
  const [viewingRecipe, setViewingRecipe] = useState<SharedRecipeDetail | null>(null);
  const [viewingLoading, setViewingLoading] = useState(false);
  const [importingId, setImportingId] = useState<number | null>(null);

  const loadRecipes = useCallback(async () => {
    try {
      const res = await fetch("/api/households/recipes");
      if (!res.ok) return;
      const data = await res.json();
      setSharedRecipes(Array.isArray(data.recipes) ? data.recipes : []);
    } catch {
      // best-effort — the recipes card stays empty rather than erroring
    } finally {
      setRecipesLoading(false);
    }
  }, []);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/households");
      if (!res.ok) throw new Error("Failed to load household");
      const data = await res.json();
      setHousehold(data.household ?? null);
      setMembers(Array.isArray(data.members) ? data.members : []);
      setActivity(Array.isArray(data.activity) ? data.activity : []);
    } catch {
      addToast("Failed to load household", "error");
    } finally {
      setLoading(false);
    }
    await loadRecipes();
  }, [addToast, loadRecipes]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name || busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/households", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to create household");
      setNewName("");
      addToast("Household created", "success");
      await load();
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Failed to create household", "error");
    } finally {
      setBusy(false);
    }
  };

  const handleJoin = async () => {
    const code = joinCode.trim();
    if (!code || busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/households/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ joinCode: code }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to join household");
      setJoinCode("");
      addToast(`Joined ${data.household?.name ?? "household"}`, "success");
      await load();
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Failed to join household", "error");
    } finally {
      setBusy(false);
    }
  };

  const handleLeave = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/households/leave", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to leave household");
      addToast(
        data.householdDeleted
          ? "You left — the household is now empty and will be deleted in 30 days unless reactivated"
          : "You left the household",
        "success"
      );
      await load();
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Failed to leave household", "error");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (busy) return;
    const confirmed = window.confirm(
      "Delete this household? It disappears for everyone now, but anyone with the join code can bring it back within 30 days."
    );
    if (!confirmed) return;
    setBusy(true);
    try {
      const res = await fetch("/api/households", { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to delete household");
      addToast("Household deleted — recoverable for 30 days via the join code", "success");
      await load();
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Failed to delete household", "error");
    } finally {
      setBusy(false);
    }
  };

  const handlePromote = async (userId: number) => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/households/members", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to promote member");
      addToast("Member promoted to admin", "success");
      await load();
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Failed to promote member", "error");
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async (userId: number) => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/households/members", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to remove member");
      addToast("Member removed", "success");
      await load();
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Failed to remove member", "error");
    } finally {
      setBusy(false);
    }
  };

  // ── Shared recipes (Slice 3) ─────────────────────────────
  const handleShareAll = async () => {
    const confirmed = window.confirm(
      "Share all your current recipes with the household? This covers your library now — recipes you add later stay private until you share them individually."
    );
    if (!confirmed || busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/households/recipes/share-all", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to share recipes");
      addToast(
        `Shared ${data.count ?? 0} recipe${data.count === 1 ? "" : "s"} with the household`,
        "success"
      );
      await loadRecipes();
      await load();
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Failed to share recipes", "error");
    } finally {
      setBusy(false);
    }
  };

  const openRecipeView = async (recipeId: number) => {
    setViewingRecipeId(recipeId);
    setViewingRecipe(null);
    setViewingLoading(true);
    try {
      const res = await fetch(`/api/recipes/${recipeId}`);
      if (!res.ok) throw new Error("Failed to load recipe");
      const data = await res.json();
      setViewingRecipe({
        id: data.id,
        title: data.title,
        description: data.description ?? null,
        cuisine: data.cuisine ?? null,
        yield: data.yield ?? null,
        ingredients: Array.isArray(data.ingredients) ? data.ingredients : [],
        instructions: Array.isArray(data.instructions) ? data.instructions : [],
      });
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Failed to load recipe", "error");
      setViewingRecipeId(null);
    } finally {
      setViewingLoading(false);
    }
  };

  const handleImportRecipe = async (recipeId: number) => {
    if (importingId != null) return;
    setImportingId(recipeId);
    try {
      const res = await fetch(`/api/households/recipes/${recipeId}/import`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to import recipe");
      addToast(`Imported "${data.title ?? "recipe"}" to your library`, "success");
      setViewingRecipeId(null);
      await loadRecipes();
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Failed to import recipe", "error");
    } finally {
      setImportingId(null);
    }
  };

  const copyJoinCode = async () => {
    if (!household) return;
    try {
      await navigator.clipboard.writeText(household.joinCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      addToast("Couldn't copy the code", "error");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center bg-surface">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#800020] border-t-transparent" />
      </div>
    );
  }

  return (
    <>
    <div className="flex-1 overflow-y-auto bg-surface pb-20 md:pb-6">
      <div className="mx-auto max-w-2xl px-4 py-6">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#800020]/10 text-[#800020]">
            <House className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-xl font-bold text-neutral-900">Household</h1>
            <p className="text-sm text-neutral-500">
              One shared plan, inventory, and shopping list for the people you cook with.
            </p>
          </div>
        </div>

        {!household ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-neutral-200 bg-white p-5">
              <h2 className="mb-1 text-sm font-semibold text-neutral-900">
                Create a household
              </h2>
              <p className="mb-3 text-xs text-neutral-500">
                You get a join code to share with the people you cook with.
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Tiong Bahru flat"
                  maxLength={80}
                  aria-label="Household name"
                  className="min-w-0 flex-1 rounded-xl border border-neutral-200 px-3 py-2.5 text-sm outline-none transition focus:border-[#800020]/45 focus:ring-2 focus:ring-[#800020]/10"
                />
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={!newName.trim() || busy}
                  className="shrink-0 rounded-xl bg-[#17131f] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#800020] disabled:opacity-40"
                >
                  Create
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-neutral-200 bg-white p-5">
              <h2 className="mb-1 text-sm font-semibold text-neutral-900">
                Join with a code
              </h2>
              <p className="mb-3 text-xs text-neutral-500">
                Ask a household member for their 6-character join code.
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="ABC123"
                  maxLength={6}
                  aria-label="Join code"
                  className="min-w-0 flex-1 rounded-xl border border-neutral-200 px-3 py-2.5 font-mono text-sm uppercase tracking-widest outline-none transition focus:border-[#800020]/45 focus:ring-2 focus:ring-[#800020]/10"
                />
                <button
                  type="button"
                  onClick={handleJoin}
                  disabled={joinCode.trim().length === 0 || busy}
                  className="flex shrink-0 items-center gap-1.5 rounded-xl bg-[#17131f] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#800020] disabled:opacity-40"
                >
                  <UserPlus className="h-4 w-4" />
                  Join
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Household card with join code */}
            <div className="rounded-2xl border border-[#800020]/15 bg-white p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-neutral-900">
                    {household.name}
                  </h2>
                  <p className="mt-0.5 text-xs text-neutral-500">
                    {household.memberCount} member{household.memberCount === 1 ? "" : "s"} · you&rsquo;re {household.myRole === "admin" ? "an admin" : "a member"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleLeave}
                  disabled={busy}
                  className="flex shrink-0 items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600 transition hover:border-red-200 hover:text-red-700 disabled:opacity-40"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Leave
                </button>
              </div>
              {household.myRole === "admin" && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={busy}
                  className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-red-200 px-3 py-2.5 text-xs font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-40"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete household
                </button>
              )}
              <button
                type="button"
                onClick={copyJoinCode}
                className="mt-4 flex w-full items-center justify-between rounded-xl bg-[#800020]/5 px-4 py-3 text-left transition hover:bg-[#800020]/10"
              >
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[#800020]">
                    Join code
                  </p>
                  <p className="font-mono text-lg font-semibold tracking-[0.3em] text-neutral-900">
                    {household.joinCode}
                  </p>
                </div>
                {copied ? (
                  <Check className="h-4 w-4 text-emerald-600" />
                ) : (
                  <Copy className="h-4 w-4 text-neutral-400" />
                )}
              </button>
            </div>

            {/* Members */}
            <div className="rounded-2xl border border-neutral-200 bg-white p-5">
              <h3 className="mb-3 text-sm font-semibold text-neutral-900">Members</h3>
              <ul className="space-y-2">
                {members.map((member) => {
                  const isMe = member.userId === user?.id;
                  return (
                    <li
                      key={member.userId}
                      className="flex items-center gap-3 rounded-xl border border-neutral-100 bg-neutral-50/60 px-3 py-2.5"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#17131f] text-xs font-semibold text-white">
                        {member.name.slice(0, 1).toUpperCase()}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-neutral-800">
                          {member.name}
                          {isMe && <span className="text-neutral-400"> (you)</span>}
                        </p>
                      </div>
                      {member.role === "admin" && (
                        <span className="flex items-center gap-1 rounded-full bg-[#800020]/10 px-2 py-0.5 text-[10px] font-semibold text-[#800020]">
                          <Crown className="h-3 w-3" />
                          Admin
                        </span>
                      )}
                      {household.myRole === "admin" && !isMe && (
                        <span className="flex shrink-0 items-center gap-1">
                          {member.role !== "admin" && (
                            <button
                              type="button"
                              onClick={() => handlePromote(member.userId)}
                              disabled={busy}
                              className="rounded-lg border border-neutral-200 px-2 py-1 text-[11px] font-medium text-neutral-600 transition hover:border-[#800020]/40 hover:text-[#800020] disabled:opacity-40"
                            >
                              Make admin
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemove(member.userId)}
                            disabled={busy}
                            aria-label={`Remove ${member.name}`}
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-neutral-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                          >
                            <UserMinus className="h-3.5 w-3.5" />
                          </button>
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Shared recipes — Slice 3 */}
            <div className="rounded-2xl border border-neutral-200 bg-white p-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-neutral-900">Shared recipes</h3>
                <button
                  type="button"
                  onClick={handleShareAll}
                  disabled={busy}
                  className="rounded-lg border border-neutral-200 px-2.5 py-1.5 text-[11px] font-medium text-neutral-600 transition hover:border-[#800020]/40 hover:text-[#800020] disabled:opacity-40"
                >
                  Share all my recipes
                </button>
              </div>
              <p className="mb-3 text-xs text-neutral-500">
                Recipes everyone in the household can read and cook with. Yours stay private until
                you share them.
              </p>
              {recipesLoading ? (
                <p className="text-xs text-neutral-400">Loading…</p>
              ) : sharedRecipes.length === 0 ? (
                <p className="text-xs text-neutral-400">
                  Nothing shared yet. Share a recipe from its share menu, or use &ldquo;Share all my
                  recipes&rdquo;.
                </p>
              ) : (
                <ul className="space-y-2">
                  {sharedRecipes.map((recipe) => (
                    <li
                      key={recipe.id}
                      className="flex items-center gap-3 rounded-xl border border-neutral-100 bg-neutral-50/60 px-3 py-2.5"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#800020]/10 text-[#800020]">
                        <BookOpen className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-neutral-800">
                          {recipe.title}
                        </p>
                        <p className="mt-0.5 truncate text-[11px] text-neutral-500">
                          {recipe.isOwner
                            ? "yours"
                            : `by ${recipe.ownerName}`}
                          {recipe.cuisine ? ` · ${recipe.cuisine}` : ""}
                        </p>
                      </div>
                      {recipe.isOwner ? (
                        <span className="flex shrink-0 items-center gap-1 rounded-full bg-[#800020]/10 px-2 py-0.5 text-[10px] font-semibold text-[#800020]">
                          <Check className="h-3 w-3" />
                          Shared
                        </span>
                      ) : (
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openRecipeView(recipe.id)}
                            className="rounded-lg border border-neutral-200 px-2 py-1 text-[11px] font-medium text-neutral-600 transition hover:border-[#800020]/40 hover:text-[#800020]"
                          >
                            View
                          </button>
                          <button
                            type="button"
                            onClick={() => onCookRecipe?.(recipe.id)}
                            title="Cook With Me — practice mode, nothing is saved"
                            className="rounded-lg border border-neutral-200 px-2 py-1 text-[11px] font-medium text-neutral-600 transition hover:border-[#800020]/40 hover:text-[#800020]"
                          >
                            Cook
                          </button>
                          <button
                            type="button"
                            onClick={() => handleImportRecipe(recipe.id)}
                            disabled={importingId != null}
                            className="flex items-center gap-1 rounded-lg border border-neutral-200 px-2 py-1 text-[11px] font-medium text-neutral-600 transition hover:border-[#800020]/40 hover:text-[#800020] disabled:opacity-40"
                          >
                            {importingId === recipe.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Download className="h-3 w-3" />
                            )}
                            Import
                          </button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Activity feed — in-app only, no push notifications */}
            <div className="rounded-2xl border border-neutral-200 bg-white p-5">
              <h3 className="mb-3 text-sm font-semibold text-neutral-900">Activity</h3>
              {activity.length === 0 ? (
                <p className="text-xs text-neutral-400">Nothing yet.</p>
              ) : (
                <ul className="space-y-2.5">
                  {activity.map((item) => (
                    <li key={item.id} className="flex items-baseline justify-between gap-3">
                      <p className="min-w-0 flex-1 text-xs text-neutral-700">
                        {describeActivity(item)}
                      </p>
                      <span className="shrink-0 text-[10px] text-neutral-400">
                        {formatActivityTime(item.createdAt)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </div>

    {viewingRecipeId != null && (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4">
        <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-neutral-200 bg-[#fffdfb] p-5 text-[#17131f] shadow-2xl">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="logo-serif text-xl font-bold leading-tight text-neutral-900">
                {viewingRecipe?.title ?? "Recipe"}
              </h3>
              {viewingRecipe && (viewingRecipe.cuisine || viewingRecipe.yield) && (
                <p className="mt-1 text-xs text-neutral-500">
                  {[viewingRecipe.cuisine, viewingRecipe.yield].filter(Boolean).join(" · ")}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setViewingRecipeId(null)}
              aria-label="Close recipe"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {viewingLoading || !viewingRecipe ? (
            <p className="py-10 text-center text-sm text-neutral-500">Loading recipe…</p>
          ) : (
            <>
              {viewingRecipe.description && (
                <p className="mt-3 text-sm leading-6 text-neutral-600">{viewingRecipe.description}</p>
              )}

              <div className="mt-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-400">
                  Ingredients
                </p>
                {viewingRecipe.ingredients.length === 0 ? (
                  <p className="mt-1 text-xs text-neutral-400">No ingredients listed.</p>
                ) : (
                  <ul className="mt-2 space-y-1.5">
                    {viewingRecipe.ingredients.map((ing, index) => (
                      <li key={index} className="text-sm text-neutral-700">
                        {ing.quantityText ??
                          (ing.quantity != null ? `${ing.quantity}${ing.unit ? ` ${ing.unit}` : ""}` : "")}{" "}
                        {ing.name}
                        {ing.notes ? <span className="text-neutral-500"> — {ing.notes}</span> : null}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="mt-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-400">
                  Steps
                </p>
                {viewingRecipe.instructions.length === 0 ? (
                  <p className="mt-1 text-xs text-neutral-400">No steps listed.</p>
                ) : (
                  <ol className="mt-2 space-y-2">
                    {viewingRecipe.instructions.map((inst) => (
                      <li key={inst.stepNumber} className="text-sm leading-6 text-neutral-700">
                        <span className="mr-1 font-semibold text-[#800020]">{inst.stepNumber}.</span>
                        {inst.content}
                        {inst.tip && (
                          <span className="mt-0.5 block text-xs text-neutral-500">{inst.tip}</span>
                        )}
                      </li>
                    ))}
                  </ol>
                )}
              </div>

              <div className="mt-5 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setViewingRecipeId(null);
                    onCookRecipe?.(viewingRecipe.id);
                  }}
                  className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#17131f] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#800020]"
                >
                  <ChefHat className="h-4 w-4" />
                  Cook with me (practice)
                </button>
                <button
                  type="button"
                  onClick={() => handleImportRecipe(viewingRecipe.id)}
                  disabled={importingId != null}
                  className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 text-sm font-semibold text-[#800020] transition-colors hover:bg-neutral-50 disabled:opacity-40"
                >
                  {importingId === viewingRecipe.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  Import to my recipes
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    )}
    </>
  );
}
