"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@radix-ui/themes";
import { useAuth } from "@/context/AuthContext";
import { EditableField } from "@/components/ui/EditableField";
import { SaveIndicator } from "@/components/ui/SaveIndicator";
import { useToast } from "@/context/ToastContext";

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

interface UserPreferences {
  name: string;
  cookingSkillLevel: string;
  householdSize: number | null;
  favoriteCuisines: string[];
  dietaryRestrictions: string[];
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
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Change-password panel state
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

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

  // Fetch user preferences when the logged-in user changes. Depending on
  // user.id (not just mount) ensures that logging out of account A and
  // into account B — without remounting the component — refetches the
  // correct preferences instead of showing stale data from A.
  useEffect(() => {
    if (!user?.id) return;
    setIsLoading(true);
    async function fetchPreferences() {
      try {
        const response = await fetch("/api/user/preferences");
        if (response.ok) {
          const data = await response.json();
          setPreferences({
            name: data.name || "",
            cookingSkillLevel: data.cookingSkillLevel || "",
            householdSize: data.householdSize || null,
            favoriteCuisines: data.favoriteCuisines || [],
            dietaryRestrictions: data.dietaryRestrictions || [],
          });
        }
      } catch (error) {
        console.error("Failed to fetch preferences:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchPreferences();
  }, [user?.id]);

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
    } catch (error) {
      addToast("Failed to save preferences", "error");
    } finally {
      setIsSaving(false);
    }
  }, [preferences, addToast]);

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
        
        {/* Header */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-5">
          <h1 className="text-lg font-semibold text-neutral-800 mb-2">Profile & Settings</h1>
          <div className="space-y-2 text-sm text-neutral-600">
            <p><span className="font-medium">Email:</span> {user?.email}</p>
          </div>
        </div>

        {/* Basic Info */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-neutral-800 mb-4">Basic Information</h2>
          
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
                className={`w-full rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100 focus:bg-white placeholder:text-neutral-400 ${!preferences.cookingSkillLevel ? "text-neutral-400" : "text-neutral-900"}`}
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
                className="w-full rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100 focus:bg-white placeholder:text-neutral-400"
              />
            </div>
          </div>
        </div>

        {/* Favorite Cuisines */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-neutral-800 mb-4">Favorite Cuisines</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {CUISINE_OPTIONS.map(cuisine => (
              <label key={cuisine} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.favoriteCuisines.includes(cuisine)}
                  onChange={() => handleCuisineToggle(cuisine)}
                  className="h-4 w-4 rounded border-neutral-300 text-amber-600 focus:ring-amber-500"
                />
                <span className="text-sm text-neutral-700">{cuisine}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Dietary Restrictions */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-neutral-800 mb-4">Dietary Restrictions</h2>
          <div className="grid grid-cols-2 gap-2">
            {DIETARY_RESTRICTIONS.map(restriction => (
              <label key={restriction} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.dietaryRestrictions.includes(restriction)}
                  onChange={() => handleDietaryToggle(restriction)}
                  className="h-4 w-4 rounded border-neutral-300 text-amber-600 focus:ring-amber-500"
                />
                <span className="text-sm text-neutral-700">{restriction}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Security */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-neutral-800">Security</h2>
            {!showPasswordForm && (
              <button
                type="button"
                onClick={() => setShowPasswordForm(true)}
                className="text-sm font-medium text-amber-700 hover:underline"
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
                  className="w-full rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100 focus:bg-white placeholder:text-neutral-400"
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
                  className="w-full rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100 focus:bg-white placeholder:text-neutral-400"
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
                  className="w-full rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100 focus:bg-white placeholder:text-neutral-400"
                  required
                  minLength={6}
                />
              </div>

              {passwordError && (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
                  {passwordError}
                </p>
              )}

              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <Button
                  type="submit"
                  disabled={isChangingPassword}
                  size="3"
                  style={{ marginTop: "8px" }}
                >
                  {isChangingPassword ? "Updating…" : "Update password"}
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

        {/* Actions */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-5">
          <div className="flex flex-col sm:flex-row gap-3 justify-between">
            <Button
              onClick={handleSave}
              disabled={isSaving}
              size="3"
              className="bg-amber-600 hover:bg-amber-700"
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>

            <Button
              onClick={logout}
              variant="outline"
              size="3"
              color="red"
            >
              Logout
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}