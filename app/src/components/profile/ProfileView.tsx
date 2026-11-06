"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui";
import { Bell, BellOff, CalendarClock, CheckCircle2, ChevronDown, ChevronRight, ClipboardList, Flame, House, Target } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { EditableField } from "@/components/ui/EditableField";
import { useToast } from "@/context/ToastContext";
import { changelogEntries, changelogVersion } from "@/lib/changelog";
import { readComfortMode, setComfortMode } from "@/lib/comfort-mode";
import { PilotChecklistPanel } from "@/components/pilot/PilotChecklistPanel";
import { HOUSEHOLDS_ENABLED } from "@/lib/feature-flags";
import { fetchViewJson, viewCacheKey, viewUrls } from "@/lib/view-cache";

const GOAL_OPTIONS = [1, 2, 3, 4, 5, 6];

interface UserPreferences {
  name: string;
}

interface NotificationPreferences {
  weeklyCookingGoal: number;
  rhythmReminders: boolean;
  mealReminders: boolean;
  prepReminders: boolean;
  reviewReminders: boolean;
  familyActivity: boolean;
  reminderTime: string;
  timezone: string;
}

interface RhythmSummary {
  weekStart: string;
  weekEnd: string;
  weeklyCookingGoal: number;
  cookedThisWeek: number;
  plannedThisWeek: number;
  cookedFromPlan: number;
  remainingToGoal: number;
  progress: number;
  status: "on_track" | "planned" | "needs_plan";
}

const DEFAULT_NOTIFICATION_PREFS: NotificationPreferences = {
  weeklyCookingGoal: 2,
  rhythmReminders: true,
  mealReminders: true,
  prepReminders: true,
  reviewReminders: true,
  familyActivity: true,
  reminderTime: "18:00",
  timezone: "Asia/Singapore",
};

function urlBase64ToArrayBuffer(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const outputArray = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return buffer;
}

function formatWeekRange(summary: RhythmSummary | null): string {
  if (!summary) return "This week";
  return summary.weekStart + " to " + summary.weekEnd;
}

function rhythmMessage(summary: RhythmSummary | null): string {
  if (!summary) return "Set a weekly dish goal that matches your onboarding rhythm.";
  if (summary.status === "on_track") return "You have hit this week's dish goal.";
  if (summary.status === "planned") return "Your planned meals can still get you to this week's dish goal.";
  return "Plan or cook one more dish to keep the week moving.";
}

function ProfileSkeleton() {
  return (
    <div className="flex-1 overflow-y-auto bg-ui-bg">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-5 py-6 pb-28">
        <div className="rounded-2xl border border-ui-border bg-ui-surface-raised p-5">
          <div className="h-5 w-40 animate-pulse rounded bg-ui-border" />
          <div className="mt-4 h-4 w-64 max-w-full animate-pulse rounded bg-ui-surface-subtle" />
        </div>
        <div className="rounded-2xl border border-ui-border bg-ui-surface-raised p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="h-3 w-28 animate-pulse rounded bg-ui-surface-subtle" />
              <div className="mt-3 h-5 w-56 max-w-full animate-pulse rounded bg-ui-border" />
              <div className="mt-3 h-4 w-full animate-pulse rounded bg-ui-surface-subtle" />
            </div>
            <div className="h-11 w-11 animate-pulse rounded-full bg-ui-surface-subtle" />
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {[0, 1, 2].map((item) => (
              <div key={item} className="rounded-xl border border-ui-border bg-ui-surface-raised p-3">
                <div className="h-3 w-20 animate-pulse rounded bg-ui-surface-subtle" />
                <div className="mt-3 h-7 w-10 animate-pulse rounded bg-ui-border" />
              </div>
            ))}
          </div>
          <div className="mt-5 h-2 animate-pulse rounded-full bg-ui-surface-subtle" />
        </div>
        {[0, 1, 2].map((section) => (
          <div key={section} className="rounded-2xl border border-ui-border bg-ui-surface-raised p-5">
            <div className="h-5 w-36 animate-pulse rounded bg-ui-border" />
            <div className="mt-5 space-y-3">
              <div className="h-10 animate-pulse rounded-lg bg-ui-surface-subtle" />
              <div className="h-10 animate-pulse rounded-lg bg-ui-surface-subtle" />
              <div className="h-10 w-3/4 animate-pulse rounded-lg bg-ui-surface-subtle" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProfileLinkRow({
  icon,
  title,
  detail,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  detail: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 border-b border-ui-border px-5 py-4 text-left transition-colors last:border-b-0 hover:bg-ui-surface-subtle"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ui-accent-muted text-ui-accent">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-ui-text">{title}</span>
        <span className="mt-0.5 block truncate text-xs text-ui-muted">{detail}</span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-ui-muted" aria-hidden="true" />
    </button>
  );
}

interface ProfileViewProps {
  // Household settings and the cooking log moved here from the main nav.
  onOpenHousehold?: () => void;
  onOpenActivity?: () => void;
}

export function ProfileView({ onOpenHousehold, onOpenActivity }: ProfileViewProps = {}) {
  const { user, logout } = useAuth();
  // Shares the tab cache entry that the workspace warm-up fills.
  const { data: householdData } = useQuery({
    queryKey: viewCacheKey(user?.id ?? 0, viewUrls.households),
    queryFn: () => fetchViewJson(viewUrls.households),
    enabled: HOUSEHOLDS_ENABLED && Boolean(user?.id && onOpenHousehold),
  });
  const householdName =
    (householdData as { household?: { name?: string } | null } | undefined)?.household?.name ?? null;
  const { addToast } = useToast();

  const [preferences, setPreferences] = useState<UserPreferences>({
    name: "",
  });

  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPreferences>(DEFAULT_NOTIFICATION_PREFS);
  const [rhythm, setRhythm] = useState<RhythmSummary | null>(null);
  const [pushConfigured, setPushConfigured] = useState(false);
  const [pushState, setPushState] = useState<"checking" | "unsupported" | "disabled" | "ready" | "subscribed">("checking");

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingNotifications, setIsSavingNotifications] = useState(false);
  const [isEnablingPush, setIsEnablingPush] = useState(false);
  const [openChangelogId, setOpenChangelogId] = useState<string | null>(null);
  const [showAllChangelog, setShowAllChangelog] = useState(false);
  const [comfort, setComfort] = useState(false);
  useEffect(() => setComfort(readComfortMode()), []);
  const toggleComfort = () => {
    const next = !comfort;
    setComfortMode(next);
    setComfort(next);
  };
  const [isRhythmOpen, setIsRhythmOpen] = useState(false);

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const loadRhythm = useCallback(async () => {
    const response = await fetch("/api/notifications/rhythm");
    if (response.ok) {
      const data = await response.json();
      setRhythm(data);
    }
  }, []);

  const resetPasswordForm = useCallback(() => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordError(null);
  }, []);

  const handleChangePassword = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setPasswordError(null);

      if (newPassword.length < 6) {
        setPasswordError("New password must be at least 6 characters");
        return;
      }
      if (newPassword !== confirmPassword) {
        setPasswordError("New passwords don't match");
        return;
      }
      if (currentPassword === newPassword) {
        setPasswordError("New password must be different from current password");
        return;
      }

      setIsChangingPassword(true);
      try {
        const res = await fetch("/api/auth/change-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ currentPassword, newPassword }),
        });
        const data = await res.json();
        if (!res.ok) {
          setPasswordError(data.error || "Failed to change password");
          return;
        }
        addToast("Password updated", "success");
        resetPasswordForm();
        setShowPasswordForm(false);
      } catch {
        setPasswordError("Something went wrong. Please try again.");
      } finally {
        setIsChangingPassword(false);
      }
    },
    [currentPassword, newPassword, confirmPassword, addToast, resetPasswordForm]
  );

  useEffect(() => {
    if (!user?.id) return;
    setIsLoading(true);
    async function fetchProfile() {
      try {
        const [profileResponse, notificationResponse, vapidResponse] = await Promise.all([
          fetch("/api/user/preferences"),
          fetch("/api/notifications/preferences"),
          fetch("/api/notifications/vapid-public-key"),
        ]);

        if (profileResponse.ok) {
          const data = await profileResponse.json();
          setPreferences({
            name: data.name || "",
          });
        }

        if (notificationResponse.ok) {
          const data = await notificationResponse.json();
          setNotificationPrefs({ ...DEFAULT_NOTIFICATION_PREFS, ...data });
        }

        if (vapidResponse.ok) {
          const data = await vapidResponse.json();
          setPushConfigured(Boolean(data.configured));
        }

        await loadRhythm();
      } catch (error) {
        console.error("Failed to fetch preferences:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchProfile();
  }, [loadRhythm, user?.id]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      setPushState("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setPushState("disabled");
      return;
    }
    navigator.serviceWorker.ready
      .then((registration) => registration.pushManager.getSubscription())
      .then((subscription) => setPushState(subscription ? "subscribed" : "ready"))
      .catch(() => setPushState("ready"));
  }, []);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/user/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(preferences),
      });

      if (!response.ok) {
        throw new Error("Failed to save preferences");
      }

      addToast("Profile updated successfully", "success");
    } catch {
      addToast("Failed to save preferences", "error");
    } finally {
      setIsSaving(false);
    }
  }, [preferences, addToast]);

  const saveNotificationPrefs = useCallback(async () => {
    setIsSavingNotifications(true);
    try {
      const response = await fetch("/api/notifications/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(notificationPrefs),
      });
      if (!response.ok) throw new Error("Failed to save reminders");
      const data = await response.json();
      setNotificationPrefs({ ...DEFAULT_NOTIFICATION_PREFS, ...data });
      await loadRhythm();
      addToast("Cooking rhythm updated", "success");
    } catch {
      addToast("Failed to update cooking rhythm", "error");
    } finally {
      setIsSavingNotifications(false);
    }
  }, [addToast, loadRhythm, notificationPrefs]);

  const enablePush = useCallback(async () => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      setPushState("unsupported");
      return;
    }
    setIsEnablingPush(true);
    try {
      const keyResponse = await fetch("/api/notifications/vapid-public-key");
      const keyBody = await keyResponse.json();
      if (!keyBody.configured || !keyBody.publicKey) {
        setPushConfigured(false);
        addToast("Push reminders need VAPID keys before they can be enabled", "error");
        return;
      }
      setPushConfigured(true);

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setPushState("disabled");
        addToast("Notifications were not enabled", "error");
        return;
      }

      const registration = await navigator.serviceWorker.register("/sw.js");
      const existing = await registration.pushManager.getSubscription();
      const subscription = existing ?? await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToArrayBuffer(keyBody.publicKey),
      });

      const response = await fetch("/api/notifications/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: subscription.toJSON() }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Failed to enable reminders");
      }
      setPushState("subscribed");
      addToast("Cooking reminders enabled", "success");
    } catch (error) {
      addToast(error instanceof Error ? error.message : "Failed to enable reminders", "error");
    } finally {
      setIsEnablingPush(false);
    }
  }, [addToast]);

  const disablePush = useCallback(async () => {
    if (!("serviceWorker" in navigator)) return;
    setIsEnablingPush(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await fetch("/api/notifications/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
      }
      setPushState("ready");
      addToast("Cooking reminders paused", "success");
    } catch {
      addToast("Failed to pause reminders", "error");
    } finally {
      setIsEnablingPush(false);
    }
  }, [addToast]);


  const setNotificationToggle = useCallback((key: keyof NotificationPreferences, value: boolean | number | string) => {
    setNotificationPrefs((current) => ({ ...current, [key]: value }));
  }, []);

  if (isLoading) {
    return <ProfileSkeleton />;
  }

  const visibleChangelogEntries = showAllChangelog ? changelogEntries : changelogEntries.slice(0, 3);
  const hiddenChangelogCount = Math.max(changelogEntries.length - 3, 0);

  return (
    <div className="flex-1 overflow-y-auto bg-ui-bg">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-5 py-6 pb-28">
        <div className="rounded-2xl border border-ui-border bg-ui-surface-raised p-5">
          <h1 className="mb-2 text-2xl font-semibold text-ui-text">Profile & Settings</h1>
          <div className="space-y-2 text-sm text-ui-muted">
            <p><span className="font-medium">Email:</span> {user?.email}</p>
          </div>
        </div>

        {(onOpenActivity || (HOUSEHOLDS_ENABLED && onOpenHousehold)) && (
          <div className="overflow-hidden rounded-2xl border border-ui-border bg-ui-surface-raised">
            {HOUSEHOLDS_ENABLED && onOpenHousehold && (
              <ProfileLinkRow
                icon={<House className="h-4 w-4" aria-hidden="true" />}
                title="Household"
                detail={
                  householdName
                    ? `${householdName} · shared plan, inventory and shopping`
                    : "Plan, shop and stock together with the people you cook with"
                }
                onClick={onOpenHousehold}
              />
            )}
            {onOpenActivity && (
              <ProfileLinkRow
                icon={<ClipboardList className="h-4 w-4" aria-hidden="true" />}
                title="Cooking log"
                detail="Every dish you've cooked, with ratings and notes"
                onClick={onOpenActivity}
              />
            )}
          </div>
        )}

        <div>
          <div className="flex items-start justify-between gap-3">
            <button
              type="button"
              onClick={() => setIsRhythmOpen((open) => !open)}
              className="group flex min-w-0 flex-1 items-start gap-3 text-left"
              aria-expanded={isRhythmOpen}
            >
              <div className="min-w-0">
                <h2 className="text-xl font-semibold text-ui-text">Your weekly dish goal</h2>
                <p className="mt-1 text-sm leading-6 text-ui-muted">{rhythmMessage(rhythm)}</p>
              </div>
              <ChevronDown className={"mt-1 h-5 w-5 shrink-0 text-ui-muted transition group-hover:text-ui-accent " + (isRhythmOpen ? "rotate-180" : "")} />
            </button>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ui-accent text-ui-action-text">
              <Flame className="h-5 w-5" />
            </div>
          </div>

          {isRhythmOpen && (
            <div className="pt-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-ui-muted">
                    <CheckCircle2 className="h-4 w-4 text-ui-accent" /> Dishes cooked
                  </div>
                  <p className="mt-2 text-2xl font-semibold text-ui-text">{rhythm?.cookedThisWeek ?? 0}</p>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-ui-muted">
                    <CalendarClock className="h-4 w-4 text-ui-accent" /> Meals planned
                  </div>
                  <p className="mt-2 text-2xl font-semibold text-ui-text">{rhythm?.plannedThisWeek ?? 0}</p>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-ui-muted">
                    <Target className="h-4 w-4 text-ui-accent" /> Dish goal
                  </div>
                  <p className="mt-2 text-2xl font-semibold text-ui-text">{notificationPrefs.weeklyCookingGoal}</p>
                </div>
              </div>

              <div className="mt-4">
                <div className="mb-2 flex items-center justify-between text-xs text-ui-muted">
                  <span>{formatWeekRange(rhythm)}</span>
                  <span>{rhythm?.progress ?? 0}%</span>
                </div>
                <div className="h-2 rounded-full bg-ui-surface-subtle">
                  <div className="h-full rounded-full bg-ui-accent transition-[width]" style={{ width: (rhythm?.progress ?? 0) + "%" }} />
                </div>
              </div>

              <div className="mt-5">
                <label className="text-xs font-medium text-ui-muted">Weekly dish goal</label>
                <p className="mt-1 text-xs leading-5 text-ui-muted">This counts completed cook-with-me attempts, so one finished dish equals one point. It is not a daily streak.</p>
                <div className="mt-2 grid grid-cols-6 gap-1.5">
                  {GOAL_OPTIONS.map((goal) => (
                    <button
                      key={goal}
                      type="button"
                      onClick={() => setNotificationToggle("weeklyCookingGoal", goal)}
                      className={
                        "h-10 rounded-lg border text-sm font-semibold transition " +
                        (notificationPrefs.weeklyCookingGoal === goal
                          ? "border-ui-accent bg-ui-accent text-ui-action-text"
                          : "border-ui-border bg-ui-surface-raised text-ui-text hover:border-ui-border-strong")
                      }
                    >
                      {goal}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-5 grid gap-2 text-sm text-ui-text sm:grid-cols-2">
                {[
                  ["rhythmReminders", "Weekly rhythm nudges"],
                  ["mealReminders", "Planned meal reminders"],
                  ["prepReminders", "Prep reminders"],
                  ["reviewReminders", "Post-cook review prompts"],
                  ["familyActivity", "Family recipe activity"],
                ].map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 rounded-xl border border-ui-border bg-ui-surface-raised px-3 py-2">
                    <input
                      type="checkbox"
                      checked={Boolean(notificationPrefs[key as keyof NotificationPreferences])}
                      onChange={(e) => setNotificationToggle(key as keyof NotificationPreferences, e.target.checked)}
                      className="h-4 w-4 rounded border-ui-border-strong text-ui-accent focus:ring-ui-focus"
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                <div>
                  <label className="text-xs font-medium text-ui-muted">Reminder time</label>
                  <input
                    type="time"
                    value={notificationPrefs.reminderTime}
                    onChange={(e) => setNotificationToggle("reminderTime", e.target.value)}
                    className="mt-2 w-full rounded-lg border border-ui-border bg-ui-surface-raised px-3 py-2 text-sm outline-none transition focus:border-ui-accent focus:ring-2 focus:ring-ui-focus-soft"
                  />
                </div>
                <Button type="button" size="lg" onClick={saveNotificationPrefs} disabled={isSavingNotifications} className="!rounded-xl">
                  {isSavingNotifications ? "Saving..." : "Save rhythm"}
                </Button>
              </div>

              <div className="mt-4 flex flex-col gap-3 rounded-xl border border-ui-border bg-ui-surface-raised px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  {pushState === "subscribed" ? <Bell className="mt-0.5 h-5 w-5 text-ui-accent" /> : <BellOff className="mt-0.5 h-5 w-5 text-ui-muted" />}
                  <div>
                    <p className="text-sm font-semibold text-ui-text">Browser reminders</p>
                    <p className="mt-1 text-xs leading-5 text-ui-muted">
                      {!pushConfigured
                        ? "Push keys are not configured yet, so reminders can be saved but not delivered."
                        : pushState === "unsupported"
                          ? "This browser cannot receive web push reminders."
                          : pushState === "disabled"
                            ? "Notifications are blocked in this browser."
                            : pushState === "subscribed"
                              ? "This browser can receive Mychelin cooking reminders."
                              : "Enable reminders on this browser when you are ready."}
                    </p>
                  </div>
                </div>
                {pushState === "subscribed" ? (
                  <Button type="button" variant="secondary" size="md" onClick={disablePush} disabled={isEnablingPush}>
                    Pause
                  </Button>
                ) : (
                  <Button type="button" variant="primary" size="md" onClick={enablePush} disabled={isEnablingPush || pushState === "unsupported"}>
                    {isEnablingPush ? "Enabling..." : "Enable"}
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>

        <div data-comfort-hide>
          <PilotChecklistPanel />
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-ui-text">Basic information</h2>

          <div className="space-y-4">
            <EditableField
              label="Name"
              value={preferences.name}
              onChange={(value) => setPreferences(prev => ({ ...prev, name: value }))}
              placeholder="Your name"
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-ui-text">Comfort view</h2>
              <p className="mt-1 text-sm text-ui-muted">
                Larger text and buttons, stronger contrast, fewer extras. Saved on this device.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={comfort}
              aria-label="Comfort view"
              onClick={toggleComfort}
              className={`relative inline-flex h-8 w-14 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-focus focus-visible:ring-offset-2 ${
                comfort ? "bg-ui-action" : "bg-ui-border-strong"
              }`}
            >
              <span
                aria-hidden="true"
                className={`inline-block h-6 w-6 rounded-full bg-ui-surface-raised shadow transition-transform ${
                  comfort ? "translate-x-7" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div className={`flex items-center justify-between${showPasswordForm ? " mb-4" : ""}`}>
            <h2 className="text-lg font-semibold text-ui-text">Security</h2>
            {!showPasswordForm && (
              <button
                type="button"
                onClick={() => setShowPasswordForm(true)}
                className="inline-flex min-h-11 items-center text-sm font-medium text-ui-accent hover:underline"
              >
                Change password
              </button>
            )}
          </div>

          {showPasswordForm && (
            <form onSubmit={handleChangePassword} className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-ui-muted">
                  Current password
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Your current password"
                  className="w-full rounded-lg border border-ui-border-strong bg-ui-surface-subtle px-3 py-2 text-sm outline-none transition focus:border-ui-accent focus:bg-ui-surface-raised focus:ring-2 focus:ring-ui-focus-soft placeholder:text-ui-muted"
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-ui-muted">
                  New password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full rounded-lg border border-ui-border-strong bg-ui-surface-subtle px-3 py-2 text-sm outline-none transition focus:border-ui-accent focus:bg-ui-surface-raised focus:ring-2 focus:ring-ui-focus-soft placeholder:text-ui-muted"
                  required
                  minLength={6}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-ui-muted">
                  Confirm new password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your new password"
                  className="w-full rounded-lg border border-ui-border-strong bg-ui-surface-subtle px-3 py-2 text-sm outline-none transition focus:border-ui-accent focus:bg-ui-surface-raised focus:ring-2 focus:ring-ui-focus-soft placeholder:text-ui-muted"
                  required
                  minLength={6}
                />
              </div>

              {passwordError && (
                <p className="rounded-lg border border-ui-border bg-ui-danger-soft px-3 py-2 text-xs text-ui-danger">
                  {passwordError}
                </p>
              )}

              <div className="flex flex-col gap-2 pt-2 sm:flex-row">
                <Button type="submit" variant="primary" disabled={isChangingPassword} size="lg" style={{ marginTop: "8px" }}>
                  {isChangingPassword ? "Updating..." : "Update password"}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="lg"
                  onClick={() => {
                    resetPasswordForm();
                    setShowPasswordForm(false);
                  }}
                  disabled={isChangingPassword}
                  style={{ marginTop: "8px" }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </div>

        <div data-comfort-hide className="space-y-4">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-ui-text">Changelog</h2>
              <p className="mt-1 text-xs leading-5 text-ui-muted">
                Recent product updates in Mychelin.
              </p>
            </div>
          </div>
          <div className="space-y-2">
            {visibleChangelogEntries.map((entry) => {
              const isOpen = openChangelogId === entry.title;
              const formattedDate = new Date(`${entry.date}T00:00:00`).toLocaleDateString("en-SG", {
                day: "numeric",
                month: "short",
                year: "numeric",
              });
              return (
                <article key={entry.title} className="rounded-xl border border-ui-border bg-ui-surface-raised">
                  <button
                    type="button"
                    onClick={() => setOpenChangelogId(isOpen ? null : entry.title)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                    aria-expanded={isOpen}
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-ui-text">{entry.title}</span>
                      <time className="mt-1 block text-xs font-medium text-ui-muted">
                        <span className="mr-2 inline-flex items-center rounded-md bg-ui-accent-muted px-1.5 py-0.5 text-[11px] font-semibold normal-case text-ui-accent">{changelogVersion(entry)}</span>
                        {formattedDate} · {entry.items.length} updates
                      </time>
                    </span>
                    <span className="shrink-0 text-sm text-ui-muted">
                      {isOpen ? "Hide" : "View"}
                    </span>
                  </button>
                  {isOpen && (
                    <ul className="mt-3 space-y-1.5 text-xs leading-5 text-ui-muted">
                      {entry.items.map((item) => (
                        <li key={item} className="flex gap-2">
                          <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-ui-accent" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </article>
              );
            })}
          </div>
          {hiddenChangelogCount > 0 && (
            <button
              type="button"
              onClick={() => setShowAllChangelog((current) => !current)}
              className="mt-3 w-full rounded-xl border border-ui-border bg-ui-surface-raised px-4 py-2.5 text-sm font-semibold text-ui-text transition hover:border-ui-border-strong hover:text-ui-accent"
            >
              {showAllChangelog ? "Show latest 3" : "View more updates (" + hiddenChangelogCount + ")"}
            </button>
          )}
        </div>

        <div className="rounded-2xl border border-ui-border bg-ui-surface-raised p-5">
          <div className="flex flex-col justify-between gap-3 sm:flex-row">
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={isSaving}
              size="lg"
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>

            <Button onClick={logout} variant="secondary" size="lg">
              Logout
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
