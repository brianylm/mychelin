"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Copy, Crown, House, LogOut, UserMinus, UserPlus } from "lucide-react";
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
export function HouseholdView() {
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
  }, [addToast]);

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
      addToast("You left the household", "success");
      await load();
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Failed to leave household", "error");
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
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#800020] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-surface pb-20 md:pb-6">
      <div className="mx-auto max-w-2xl px-4 py-6">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#800020]/10 text-[#800020]">
            <House className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-xl font-bold text-neutral-900">Household</h1>
            <p className="text-sm text-neutral-500">
              One shared meal plan for the people you cook with.
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
  );
}
