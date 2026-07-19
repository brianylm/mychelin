"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Bell, BellOff, CalendarClock, CheckCircle2, ChevronDown, Flame, Target } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { EditableField } from "@/components/ui/EditableField";
import { useToast } from "@/context/ToastContext";
import { changelogEntries } from "@/lib/changelog";
import { PilotChecklistPanel } from "@/components/pilot/PilotChecklistPanel";
import { PageHeader, SectionHeader } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/Skeleton";

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
    <div className="flex-1 overflow-y-auto bg-[var(--ui-canvas)]">
      <div className="mx-auto grid w-full max-w-4xl gap-8 px-5 py-6 pb-28 sm:px-8">
        <div className="grid gap-3 border-b border-[var(--ui-border)] pb-5">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-8 w-52 max-w-full" />
          <Skeleton className="h-4 w-64 max-w-full" />
        </div>
        {[0, 1, 2, 3].map((section) => (
          <div key={section} className="border-b border-[var(--ui-border)] pb-7">
            <Skeleton className="h-6 w-44" />
            <Skeleton className="mt-3 h-4 w-full max-w-xl" />
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </div>
          </div>
        ))}
        <span className="sr-only">Loading profile</span>
      </div>
    </div>
  );
}

export function ProfileView() {
  const { user, logout } = useAuth();
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
    <div className="flex-1 overflow-y-auto bg-[var(--ui-canvas)]">
      <div className="mx-auto grid w-full max-w-4xl gap-8 px-5 py-6 pb-28 sm:px-8">
        <PageHeader
          eyebrow="Account"
          title="Profile & settings"
          description="Manage your cooking rhythm, pilot progress, account details, and product updates."
          meta={<p className="text-sm text-[var(--ui-muted)]">{user?.email}</p>}
        />

        <section className="border-y border-[var(--ui-border)] bg-[var(--ui-surface-raised)]">
          <button
            type="button"
            onClick={() => setIsRhythmOpen((open) => !open)}
            className="group flex min-h-24 w-full items-start justify-between gap-4 px-4 py-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--ui-focus)] sm:px-5"
            aria-expanded={isRhythmOpen}
          >
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ui-accent)]">Cooking rhythm</p>
              <h2 className="mt-2 text-xl font-semibold text-[var(--ui-text)]">Your weekly dish goal</h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--ui-muted)]">{rhythmMessage(rhythm)}</p>
            </div>
            <span className="flex shrink-0 items-center gap-2">
              <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-[var(--ui-accent)] text-white">
                <Flame className="h-5 w-5" aria-hidden="true" />
              </span>
              <ChevronDown className={"h-5 w-5 text-[var(--ui-muted)] transition-transform " + (isRhythmOpen ? "rotate-180" : "")} aria-hidden="true" />
            </span>
          </button>

          {isRhythmOpen && (
            <div className="border-t border-[var(--ui-border)] px-4 py-5 sm:px-5">
              <div className="grid divide-y divide-[var(--ui-border)] border-y border-[var(--ui-border)] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                {[
                  { label: "Dishes cooked", value: rhythm?.cookedThisWeek ?? 0, icon: CheckCircle2 },
                  { label: "Meals planned", value: rhythm?.plannedThisWeek ?? 0, icon: CalendarClock },
                  { label: "Dish goal", value: notificationPrefs.weeklyCookingGoal, icon: Target },
                ].map(({ label, value, icon: Icon }) => (
                  <div key={label} className="flex items-center justify-between gap-4 px-3 py-4 sm:block">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--ui-muted)]">
                      <Icon className="h-4 w-4 text-[var(--ui-accent)]" aria-hidden="true" />
                      {label}
                    </div>
                    <p className="text-2xl font-semibold tabular-nums text-[var(--ui-text)] sm:mt-2">{value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-5">
                <div className="mb-2 flex items-center justify-between text-xs text-[var(--ui-muted)]">
                  <span>{formatWeekRange(rhythm)}</span>
                  <span>{rhythm?.progress ?? 0}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[var(--ui-border)]">
                  <div className="h-full rounded-full bg-[var(--ui-accent)] transition-[width]" style={{ width: (rhythm?.progress ?? 0) + "%" }} />
                </div>
              </div>

              <div className="mt-6">
                <label className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--ui-muted)]">Weekly dish goal</label>
                <p className="mt-1 text-xs leading-5 text-[var(--ui-muted)]">One completed dish counts as one point. This is a weekly rhythm, not a daily streak.</p>
                <div className="mt-3 grid grid-cols-6 gap-2">
                  {GOAL_OPTIONS.map((goal) => (
                    <button
                      key={goal}
                      type="button"
                      onClick={() => setNotificationToggle("weeklyCookingGoal", goal)}
                      className={
                        "h-11 rounded-lg border text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-focus)] " +
                        (notificationPrefs.weeklyCookingGoal === goal
                          ? "border-[var(--ui-accent)] bg-[var(--ui-accent)] text-white"
                          : "border-[var(--ui-border-strong)] bg-[var(--ui-surface-raised)] text-[var(--ui-text)] hover:border-[var(--ui-accent)]/40")
                      }
                      aria-pressed={notificationPrefs.weeklyCookingGoal === goal}
                    >
                      {goal}
                    </button>
                  ))}
                </div>
              </div>

              <fieldset className="mt-6 border-t border-[var(--ui-border)]">
                <legend className="sr-only">Reminder types</legend>
                {[
                  ["rhythmReminders", "Weekly rhythm nudges"],
                  ["mealReminders", "Planned meal reminders"],
                  ["prepReminders", "Prep reminders"],
                  ["reviewReminders", "Post-cook review prompts"],
                  ["familyActivity", "Family recipe activity"],
                ].map(([key, label]) => (
                  <label key={key} className="flex min-h-11 items-center justify-between gap-4 border-b border-[var(--ui-border)] py-2 text-sm text-[var(--ui-text)]">
                    <span>{label}</span>
                    <input
                      type="checkbox"
                      checked={Boolean(notificationPrefs[key as keyof NotificationPreferences])}
                      onChange={(e) => setNotificationToggle(key as keyof NotificationPreferences, e.target.checked)}
                      className="h-5 w-5 rounded border-[var(--ui-border-strong)] text-[var(--ui-accent)] focus:ring-[var(--ui-focus)]"
                    />
                  </label>
                ))}
              </fieldset>

              <div className="mt-6 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                <div>
                  <label htmlFor="profile-reminder-time" className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--ui-muted)]">Reminder time</label>
                  <input
                    id="profile-reminder-time"
                    type="time"
                    value={notificationPrefs.reminderTime}
                    onChange={(e) => setNotificationToggle("reminderTime", e.target.value)}
                    className="mt-2 h-11 w-full rounded-lg border border-[var(--ui-border-strong)] bg-[var(--ui-surface-raised)] px-3 text-sm outline-none focus:border-[var(--ui-accent)] focus:ring-2 focus:ring-[var(--ui-focus)]"
                  />
                </div>
                <Button onClick={saveNotificationPrefs} loading={isSavingNotifications}>
                  {isSavingNotifications ? "Saving..." : "Save rhythm"}
                </Button>
              </div>

              <div className="mt-6 flex flex-col gap-4 border-t border-[var(--ui-border)] pt-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  {pushState === "subscribed" ? <Bell className="mt-0.5 h-5 w-5 shrink-0 text-[var(--ui-accent)]" /> : <BellOff className="mt-0.5 h-5 w-5 shrink-0 text-[var(--ui-muted)]" />}
                  <div>
                    <p className="text-sm font-semibold text-[var(--ui-text)]">Browser reminders</p>
                    <p className="mt-1 max-w-xl text-xs leading-5 text-[var(--ui-muted)]">
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
                  <Button variant="secondary" onClick={disablePush} loading={isEnablingPush}>Pause</Button>
                ) : (
                  <Button onClick={enablePush} loading={isEnablingPush} disabled={pushState === "unsupported"}>Enable</Button>
                )}
              </div>
            </div>
          )}
        </section>

        <PilotChecklistPanel />

        <section className="border-t border-[var(--ui-border)] pt-7">
          <SectionHeader title="Basic information" description="The name shown across your Mychelin account." />
          <div className="mt-5 max-w-xl">
            <EditableField
              label="Name"
              value={preferences.name}
              onChange={(value) => setPreferences((previous) => ({ ...previous, name: value }))}
              placeholder="Your name"
            />
          </div>
        </section>

        <section className="border-y border-[var(--ui-border)] py-7">
          <SectionHeader
            title="Security"
            description="Update the password used for email sign-in."
            actions={!showPasswordForm ? (
              <Button variant="secondary" onClick={() => setShowPasswordForm(true)}>Change password</Button>
            ) : undefined}
          />

          {showPasswordForm && (
            <form onSubmit={handleChangePassword} className="mt-5 grid max-w-xl gap-4">
              {[
                { id: "current-password", label: "Current password", value: currentPassword, setter: setCurrentPassword, placeholder: "Your current password", minLength: undefined },
                { id: "new-password", label: "New password", value: newPassword, setter: setNewPassword, placeholder: "At least 6 characters", minLength: 6 },
                { id: "confirm-password", label: "Confirm new password", value: confirmPassword, setter: setConfirmPassword, placeholder: "Re-enter your new password", minLength: 6 },
              ].map((field, index) => (
                <div key={field.id}>
                  <label htmlFor={field.id} className="mb-2 block text-xs font-semibold uppercase tracking-[0.08em] text-[var(--ui-muted)]">{field.label}</label>
                  <input
                    id={field.id}
                    type="password"
                    value={field.value}
                    onChange={(event) => field.setter(event.target.value)}
                    placeholder={field.placeholder}
                    className="h-11 w-full rounded-lg border border-[var(--ui-border-strong)] bg-[var(--ui-surface-raised)] px-3 text-sm outline-none focus:border-[var(--ui-accent)] focus:ring-2 focus:ring-[var(--ui-focus)]"
                    required
                    minLength={field.minLength}
                    autoFocus={index === 0}
                  />
                </div>
              ))}

              {passwordError && (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-700" role="alert">
                  {passwordError}
                </p>
              )}

              <div className="flex flex-wrap gap-2 pt-1">
                <Button type="submit" loading={isChangingPassword}>
                  {isChangingPassword ? "Updating..." : "Update password"}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    resetPasswordForm();
                    setShowPasswordForm(false);
                  }}
                  disabled={isChangingPassword}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </section>

        <section>
          <SectionHeader title="Changelog" description="The latest product changes in Mychelin." />
          <div className="mt-4 border-t border-[var(--ui-border)]">
            {visibleChangelogEntries.map((entry) => {
              const isOpen = openChangelogId === entry.title;
              return (
                <article key={entry.title} className="border-b border-[var(--ui-border)]">
                  <button
                    type="button"
                    onClick={() => setOpenChangelogId(isOpen ? null : entry.title)}
                    className="flex min-h-16 w-full items-center justify-between gap-4 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--ui-focus)]"
                    aria-expanded={isOpen}
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-[var(--ui-text)]">{entry.title}</span>
                      <time className="mt-1 block text-xs text-[var(--ui-muted)]">{entry.date} · {entry.items.length} updates</time>
                    </span>
                    <ChevronDown className={"h-5 w-5 shrink-0 text-[var(--ui-muted)] transition-transform " + (isOpen ? "rotate-180" : "")} aria-hidden="true" />
                  </button>
                  {isOpen && (
                    <ul className="grid gap-2 border-t border-[var(--ui-border)] bg-[var(--ui-surface-subtle)] px-4 py-4 text-sm leading-6 text-[var(--ui-muted)]">
                      {entry.items.map((item) => (
                        <li key={item} className="border-l-2 border-[var(--ui-accent)] pl-3">{item}</li>
                      ))}
                    </ul>
                  )}
                </article>
              );
            })}
          </div>
          {hiddenChangelogCount > 0 && (
            <Button
              variant="secondary"
              className="mt-4 w-full sm:w-auto"
              onClick={() => setShowAllChangelog((current) => !current)}
            >
              {showAllChangelog ? "Show latest 3" : "View more updates (" + hiddenChangelogCount + ")"}
            </Button>
          )}
        </section>

        <footer className="flex flex-col gap-3 border-t border-[var(--ui-border)] pt-6 sm:flex-row sm:items-center sm:justify-between">
          <Button onClick={handleSave} loading={isSaving}>
            {isSaving ? "Saving..." : "Save changes"}
          </Button>
          <Button onClick={logout} variant="danger">Log out</Button>
        </footer>
      </div>
    </div>
  );
}
