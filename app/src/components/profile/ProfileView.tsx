"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@radix-ui/themes";
import { Bell, BellOff, CalendarClock, CheckCircle2, Flame, Target } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { EditableField } from "@/components/ui/EditableField";
import { useToast } from "@/context/ToastContext";
import { changelogEntries } from "@/lib/changelog";
import { PilotChecklistPanel } from "@/components/pilot/PilotChecklistPanel";

const CUISINE_OPTIONS = [
  "Chinese", "Malay", "Indian", "Peranakan", "Eurasian", "Western",
  "Japanese", "Korean", "Thai", "Vietnamese", "Indonesian", "Other",
  "Hokkien", "Teochew", "Cantonese", "Hakka", "Hainanese", "Nyonya",
  "Tamil", "Punjabi", "Malay Kampung",
];

const DIETARY_RESTRICTIONS = [
  "Vegetarian", "Vegan", "Halal", "Kosher",
  "Gluten-Free", "Dairy-Free", "Nut-Free", "Low-Carb"
];

const SKILL_LEVELS = ["beginner", "intermediate", "advanced"];
const GOAL_OPTIONS = [1, 2, 3, 4, 5, 6];

interface UserPreferences {
  name: string;
  cookingSkillLevel: string;
  householdSize: number | null;
  favoriteCuisines: string[];
  dietaryRestrictions: string[];
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
  if (!summary) return "Set a cooking rhythm that matches your onboarding goal.";
  if (summary.status === "on_track") return "You have hit this week's cooking promise.";
  if (summary.status === "planned") return "Your plan can still get you to this week's promise.";
  return "Plan or cook one more dish to keep the week moving.";
}

export function ProfileView() {
  const { user, logout } = useAuth();
  const { addToast } = useToast();

  const [preferences, setPreferences] = useState<UserPreferences>({
    name: "",
    cookingSkillLevel: "",
    householdSize: null,
    favoriteCuisines: [],
    dietaryRestrictions: [],
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
            cookingSkillLevel: data.cookingSkillLevel || "",
            householdSize: data.householdSize || null,
            favoriteCuisines: data.favoriteCuisines || [],
            dietaryRestrictions: data.dietaryRestrictions || [],
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

  const handleCuisineToggle = useCallback((cuisine: string) => {
    setPreferences(prev => ({
      ...prev,
      favoriteCuisines: prev.favoriteCuisines.includes(cuisine)
        ? prev.favoriteCuisines.filter(c => c !== cuisine)
        : [...prev.favoriteCuisines, cuisine]
    }));
  }, []);

  const handleDietaryToggle = useCallback((restriction: string) => {
    setPreferences(prev => ({
      ...prev,
      dietaryRestrictions: prev.dietaryRestrictions.includes(restriction)
        ? prev.dietaryRestrictions.filter(r => r !== restriction)
        : [...prev.dietaryRestrictions, restriction]
    }));
  }, []);

  const setNotificationToggle = useCallback((key: keyof NotificationPreferences, value: boolean | number | string) => {
    setNotificationPrefs((current) => ({ ...current, [key]: value }));
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center bg-surface">
        <div className="text-neutral-500">Loading profile...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-surface">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-5 py-6 pb-28">
        <div className="rounded-2xl border border-neutral-200 bg-white p-5">
          <h1 className="mb-2 text-lg font-semibold text-neutral-800">Profile & Settings</h1>
          <div className="space-y-2 text-sm text-neutral-600">
            <p><span className="font-medium">Email:</span> {user?.email}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-[#e7ded1] bg-[#fffaf3] p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#800020]">Cooking rhythm</p>
              <h2 className="mt-2 text-base font-semibold text-neutral-900">Your weekly home-cooking promise</h2>
              <p className="mt-1 text-xs leading-5 text-neutral-600">{rhythmMessage(rhythm)}</p>
            </div>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#800020] text-white">
              <Flame className="h-5 w-5" />
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-[#eadfce] bg-white p-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                <CheckCircle2 className="h-4 w-4 text-[#800020]" /> Cooked
              </div>
              <p className="mt-2 text-2xl font-semibold text-neutral-900">{rhythm?.cookedThisWeek ?? 0}</p>
            </div>
            <div className="rounded-xl border border-[#eadfce] bg-white p-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                <CalendarClock className="h-4 w-4 text-[#800020]" /> Planned
              </div>
              <p className="mt-2 text-2xl font-semibold text-neutral-900">{rhythm?.plannedThisWeek ?? 0}</p>
            </div>
            <div className="rounded-xl border border-[#eadfce] bg-white p-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                <Target className="h-4 w-4 text-[#800020]" /> Goal
              </div>
              <p className="mt-2 text-2xl font-semibold text-neutral-900">{notificationPrefs.weeklyCookingGoal}</p>
            </div>
          </div>

          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between text-xs text-neutral-500">
              <span>{formatWeekRange(rhythm)}</span>
              <span>{rhythm?.progress ?? 0}%</span>
            </div>
            <div className="h-2 rounded-full bg-[#eadfce]">
              <div className="h-full rounded-full bg-[#800020] transition-all" style={{ width: (rhythm?.progress ?? 0) + "%" }} />
            </div>
          </div>

          <div className="mt-5">
            <label className="text-xs font-medium uppercase tracking-wide text-neutral-500">Weekly cooking goal</label>
            <div className="mt-2 grid grid-cols-6 gap-1.5">
              {GOAL_OPTIONS.map((goal) => (
                <button
                  key={goal}
                  type="button"
                  onClick={() => setNotificationToggle("weeklyCookingGoal", goal)}
                  className={
                    "h-10 rounded-lg border text-sm font-semibold transition " +
                    (notificationPrefs.weeklyCookingGoal === goal
                      ? "border-[#800020] bg-[#800020] text-white"
                      : "border-[#eadfce] bg-white text-neutral-700 hover:border-[#800020]/35")
                  }
                >
                  {goal}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5 grid gap-2 text-sm text-neutral-700 sm:grid-cols-2">
            {[
              ["rhythmReminders", "Weekly rhythm nudges"],
              ["mealReminders", "Planned meal reminders"],
              ["prepReminders", "Prep reminders"],
              ["reviewReminders", "Post-cook review prompts"],
              ["familyActivity", "Family recipe activity"],
            ].map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 rounded-xl border border-[#eadfce] bg-white px-3 py-2">
                <input
                  type="checkbox"
                  checked={Boolean(notificationPrefs[key as keyof NotificationPreferences])}
                  onChange={(e) => setNotificationToggle(key as keyof NotificationPreferences, e.target.checked)}
                  className="h-4 w-4 rounded border-neutral-300 text-[#800020] focus:ring-[#800020]/30"
                />
                <span>{label}</span>
              </label>
            ))}
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <div>
              <label className="text-xs font-medium uppercase tracking-wide text-neutral-500">Reminder time</label>
              <input
                type="time"
                value={notificationPrefs.reminderTime}
                onChange={(e) => setNotificationToggle("reminderTime", e.target.value)}
                className="mt-2 w-full rounded-lg border border-[#eadfce] bg-white px-3 py-2 text-sm outline-none transition focus:border-[#800020]/45 focus:ring-2 focus:ring-[#800020]/10"
              />
            </div>
            <Button type="button" size="3" onClick={saveNotificationPrefs} disabled={isSavingNotifications} className="!rounded-full !bg-[#17131f] !text-white hover:!bg-[#800020]">
              {isSavingNotifications ? "Saving..." : "Save rhythm"}
            </Button>
          </div>

          <div className="mt-4 flex flex-col gap-3 rounded-xl border border-[#eadfce] bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              {pushState === "subscribed" ? <Bell className="mt-0.5 h-5 w-5 text-[#800020]" /> : <BellOff className="mt-0.5 h-5 w-5 text-neutral-400" />}
              <div>
                <p className="text-sm font-semibold text-neutral-800">Browser reminders</p>
                <p className="mt-1 text-xs leading-5 text-neutral-500">
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
              <Button type="button" variant="outline" size="2" onClick={disablePush} disabled={isEnablingPush}>
                Pause
              </Button>
            ) : (
              <Button type="button" size="2" onClick={enablePush} disabled={isEnablingPush || pushState === "unsupported"}>
                {isEnablingPush ? "Enabling..." : "Enable"}
              </Button>
            )}
          </div>
        </div>

        <PilotChecklistPanel />

        <div className="rounded-2xl border border-neutral-200 bg-white p-5">
          <h2 className="mb-4 text-sm font-semibold text-neutral-800">Basic Information</h2>

          <div className="space-y-4">
            <EditableField
              label="Name"
              value={preferences.name}
              onChange={(value) => setPreferences(prev => ({ ...prev, name: value }))}
              placeholder="Your name"
            />

            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                Cooking Skill Level
              </label>
              <select
                value={preferences.cookingSkillLevel}
                onChange={(e) => setPreferences(prev => ({ ...prev, cookingSkillLevel: e.target.value }))}
                className={"w-full rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm outline-none transition focus:border-[#800020]/45 focus:bg-white focus:ring-2 focus:ring-[#800020]/10 placeholder:text-neutral-400 " + (!preferences.cookingSkillLevel ? "text-neutral-400" : "text-neutral-900")}
              >
                <option value="">Select skill level...</option>
                {SKILL_LEVELS.map(level => (
                  <option key={level} value={level}>
                    {level.charAt(0).toUpperCase() + level.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                Household Size
              </label>
              <input
                type="number"
                value={preferences.householdSize?.toString() ?? ""}
                onChange={(e) => setPreferences(prev => ({
                  ...prev,
                  householdSize: e.target.value ? parseInt(e.target.value, 10) : null
                }))}
                placeholder="e.g. 4"
                min="1"
                className="w-full rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm outline-none transition focus:border-[#800020]/45 focus:bg-white focus:ring-2 focus:ring-[#800020]/10 placeholder:text-neutral-400"
              />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-5">
          <h2 className="mb-4 text-sm font-semibold text-neutral-800">Favorite Cuisines</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {CUISINE_OPTIONS.map(cuisine => (
              <label key={cuisine} className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={preferences.favoriteCuisines.includes(cuisine)}
                  onChange={() => handleCuisineToggle(cuisine)}
                  className="h-4 w-4 rounded border-neutral-300 text-[#800020] focus:ring-amber-500"
                />
                <span className="text-sm text-neutral-700">{cuisine}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-5">
          <h2 className="mb-4 text-sm font-semibold text-neutral-800">Dietary Restrictions</h2>
          <div className="grid grid-cols-2 gap-2">
            {DIETARY_RESTRICTIONS.map(restriction => (
              <label key={restriction} className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={preferences.dietaryRestrictions.includes(restriction)}
                  onChange={() => handleDietaryToggle(restriction)}
                  className="h-4 w-4 rounded border-neutral-300 text-[#800020] focus:ring-amber-500"
                />
                <span className="text-sm text-neutral-700">{restriction}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-neutral-800">Security</h2>
            {!showPasswordForm && (
              <button
                type="button"
                onClick={() => setShowPasswordForm(true)}
                className="text-sm font-medium text-[#800020] hover:underline"
              >
                Change password
              </button>
            )}
          </div>

          {showPasswordForm && (
            <form onSubmit={handleChangePassword} className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-neutral-500">
                  Current password
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Your current password"
                  className="w-full rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm outline-none transition focus:border-[#800020]/45 focus:bg-white focus:ring-2 focus:ring-[#800020]/10 placeholder:text-neutral-400"
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-neutral-500">
                  New password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm outline-none transition focus:border-[#800020]/45 focus:bg-white focus:ring-2 focus:ring-[#800020]/10 placeholder:text-neutral-400"
                  required
                  minLength={6}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-neutral-500">
                  Confirm new password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your new password"
                  className="w-full rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm outline-none transition focus:border-[#800020]/45 focus:bg-white focus:ring-2 focus:ring-[#800020]/10 placeholder:text-neutral-400"
                  required
                  minLength={6}
                />
              </div>

              {passwordError && (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
                  {passwordError}
                </p>
              )}

              <div className="flex flex-col gap-2 pt-2 sm:flex-row">
                <Button type="submit" disabled={isChangingPassword} size="3" style={{ marginTop: "8px" }}>
                  {isChangingPassword ? "Updating..." : "Update password"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="3"
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

        <div className="rounded-2xl border border-neutral-200 bg-white p-5">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-neutral-800">Changelog</h2>
              <p className="mt-1 text-xs leading-5 text-neutral-500">
                Recent product updates in Mychelin.
              </p>
            </div>
          </div>
          <div className="space-y-2">
            {changelogEntries.map((entry) => {
              const isOpen = openChangelogId === entry.title;
              return (
                <article key={entry.title} className="rounded-xl border border-neutral-100 bg-neutral-50/70">
                  <button
                    type="button"
                    onClick={() => setOpenChangelogId(isOpen ? null : entry.title)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                    aria-expanded={isOpen}
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-neutral-800">{entry.title}</span>
                      <time className="mt-1 block text-[11px] font-medium uppercase tracking-wide text-neutral-400">
                        {entry.date} - {entry.items.length} updates
                      </time>
                    </span>
                    <span className="shrink-0 rounded-full border border-neutral-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-neutral-600">
                      {isOpen ? "Hide" : "View"}
                    </span>
                  </button>
                  {isOpen && (
                    <ul className="space-y-1.5 border-t border-neutral-100 px-4 py-3 text-xs leading-5 text-neutral-600">
                      {entry.items.map((item) => (
                        <li key={item} className="flex gap-2">
                          <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[#800020]" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </article>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-5">
          <div className="flex flex-col justify-between gap-3 sm:flex-row">
            <Button
              onClick={handleSave}
              disabled={isSaving}
              size="3"
              className="bg-[#17131f] hover:bg-[#800020]"
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>

            <Button onClick={logout} variant="outline" size="3" color="red">
              Logout
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
