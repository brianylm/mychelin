"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Check,
  Copy,
  Crown,
  House,
  LogOut,
  Trash2,
  UserMinus,
  UserPlus,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { readViewCache, viewUrls, writeViewCache } from "@/lib/view-cache";
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
  // Open the recipe Library where household-shared recipes now appear.
  onOpenLibrary?: () => void;
}

export function HouseholdView({ onOpenLibrary }: HouseholdViewProps) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const userId = user?.id;
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [household, setHousehold] = useState<HouseholdData | null>(null);
  const [members, setMembers] = useState<HouseholdMemberRow[]>([]);
  const [activity, setActivity] = useState<HouseholdActivityRow[]>([]);
  const [newName, setNewName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [busy, setBusy] = useState(false);
  // Which form is waiting on the server, for its button label.
  const [pendingAction, setPendingAction] = useState<"create" | "join" | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/households");
      if (!res.ok) throw new Error("Failed to load household");
      const data = await res.json();
      // Joining, creating, leaving or deleting swaps Plan, Shopping and
      // Inventory between personal and shared data: drop their cached
      // copies so no tab paints the other side's data first.
      const previous = readViewCache<{ household?: { id?: number } | null }>(
        qc,
        userId,
        viewUrls.households
      );
      if (previous !== undefined && (previous.household?.id ?? null) !== (data.household?.id ?? null)) {
        qc.removeQueries({ queryKey: ["view", userId] });
      }
      writeViewCache(qc, userId, viewUrls.households, data);
      setHousehold(data.household ?? null);
      setMembers(Array.isArray(data.members) ? data.members : []);
      setActivity(Array.isArray(data.activity) ? data.activity : []);
    } catch {
      addToast("Failed to load household", "error");
    } finally {
      setLoading(false);
    }
  }, [addToast, qc, userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name || busy) return;
    setBusy(true);
    setPendingAction("create");
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
      setPendingAction(null);
    }
  };

  const handleJoin = async () => {
    const code = joinCode.trim();
    if (!code || busy) return;
    setBusy(true);
    setPendingAction("join");
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
      setPendingAction(null);
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
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-ui-accent border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-surface pb-20 md:pb-6">
      <div className="mx-auto max-w-2xl px-4 py-6">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-ui-accent/10 text-ui-accent">
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
              <form
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  void handleCreate();
                }}
              >
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Tiong Bahru flat"
                  maxLength={80}
                  aria-label="Household name"
                  className="min-w-0 flex-1 rounded-xl border border-neutral-200 px-3 py-2.5 text-sm outline-none transition focus:border-ui-accent/45 focus:ring-2 focus:ring-ui-accent/10"
                />
                <button
                  type="submit"
                  disabled={!newName.trim() || busy}
                  aria-busy={pendingAction === "create"}
                  className="shrink-0 rounded-xl bg-ui-action px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-ui-accent disabled:opacity-40"
                >
                  {pendingAction === "create" ? "Creating…" : "Create"}
                </button>
              </form>
            </div>

            <div className="rounded-2xl border border-neutral-200 bg-white p-5">
              <h2 className="mb-1 text-sm font-semibold text-neutral-900">
                Join with a code
              </h2>
              <p className="mb-3 text-xs text-neutral-500">
                Ask a household member for their 6-character join code.
              </p>
              <form
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  void handleJoin();
                }}
              >
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="ABC123"
                  maxLength={6}
                  aria-label="Join code"
                  className="min-w-0 flex-1 rounded-xl border border-neutral-200 px-3 py-2.5 font-mono text-sm uppercase tracking-widest outline-none transition focus:border-ui-accent/45 focus:ring-2 focus:ring-ui-accent/10"
                />
                <button
                  type="submit"
                  disabled={joinCode.trim().length === 0 || busy}
                  aria-busy={pendingAction === "join"}
                  className="flex shrink-0 items-center gap-1.5 rounded-xl bg-ui-action px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-ui-accent disabled:opacity-40"
                >
                  <UserPlus className="h-4 w-4" />
                  {pendingAction === "join" ? "Joining…" : "Join"}
                </button>
              </form>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Household card with join code */}
            <div className="rounded-2xl border border-ui-accent/15 bg-white p-5">
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
                className="mt-4 flex w-full items-center justify-between rounded-xl bg-ui-accent/5 px-4 py-3 text-left transition hover:bg-ui-accent/10"
              >
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-ui-accent">
                    Join code
                  </p>
                  <p className="font-mono text-lg font-semibold tracking-[0.3em] text-neutral-900">
                    {household.joinCode}
                  </p>
                </div>
                {copied ? (
                  <Check className="h-4 w-4 text-emerald-600" />
                ) : (
                  <Copy className="h-4 w-4 text-ui-muted" />
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
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ui-action text-xs font-semibold text-white">
                        {member.name.slice(0, 1).toUpperCase()}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-neutral-800">
                          {member.name}
                          {isMe && <span className="text-ui-muted"> (you)</span>}
                        </p>
                      </div>
                      {member.role === "admin" && (
                        <span className="flex items-center gap-1 rounded-full bg-ui-accent/10 px-2 py-0.5 text-[10px] font-semibold text-ui-accent">
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
                              className="rounded-lg border border-neutral-200 px-2 py-1 text-[11px] font-medium text-neutral-600 transition hover:border-ui-accent/40 hover:text-ui-accent disabled:opacity-40"
                            >
                              Make admin
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemove(member.userId)}
                            disabled={busy}
                            aria-label={`Remove ${member.name}`}
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-ui-muted transition hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
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

            <div className="rounded-2xl border border-neutral-200 bg-white p-5">
              <h3 className="text-sm font-semibold text-neutral-900">Shared recipes</h3>
              <p className="mt-1 text-xs text-neutral-500">
                Recipes your household shares now live in your Library, under &ldquo;From your household&rdquo;.
              </p>
              {onOpenLibrary && (
                <button
                  type="button"
                  onClick={onOpenLibrary}
                  className="mt-3 rounded-lg border border-neutral-200 px-2.5 py-1.5 text-[11px] font-medium text-neutral-600 transition hover:border-ui-accent/40 hover:text-ui-accent"
                >
                  Open Library
                </button>
              )}
            </div>

            {/* Activity feed — in-app only, no push notifications */}
            <div className="rounded-2xl border border-neutral-200 bg-white p-5">
              <h3 className="mb-3 text-sm font-semibold text-neutral-900">Activity</h3>
              {activity.length === 0 ? (
                <p className="text-xs text-ui-muted">Nothing yet.</p>
              ) : (
                <ul className="space-y-2.5">
                  {activity.map((item) => (
                    <li key={item.id} className="flex items-baseline justify-between gap-3">
                      <p className="min-w-0 flex-1 text-xs text-neutral-700">
                        {describeActivity(item)}
                      </p>
                      <span className="shrink-0 text-[10px] text-ui-muted">
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
  );
}
