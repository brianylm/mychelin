"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { User, Mail, ChefHat, Users, Heart, AlertCircle, Save, LogOut } from "lucide-react";

interface UserData {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

interface Preferences {
  favoriteCuisines: string[];
  dietaryRestrictions: string[];
  cookingSkillLevel: "beginner" | "intermediate" | "advanced" | "";
  householdSize: number | null;
}

const CUISINE_OPTIONS = [
  "Chinese", "Malay", "Indian", "Peranakan", "Japanese", "Korean",
  "Thai", "Vietnamese", "Italian", "French", "Mexican", "American",
  "Mediterranean", "Middle Eastern", "Indonesian", "Filipino",
];

const DIETARY_OPTIONS = [
  "Vegetarian", "Vegan", "Halal", "Kosher", "Gluten-Free",
  "Dairy-Free", "Nut-Free", "Low-Carb", "Keto", "Pescatarian",
];

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [preferences, setPreferences] = useState<Preferences>({
    favoriteCuisines: [],
    dietaryRestrictions: [],
    cookingSkillLevel: "",
    householdSize: null,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadProfile() {
      try {
        const [userRes, prefsRes] = await Promise.all([
          fetch("/api/auth/me"),
          fetch("/api/user/preferences"),
        ]);

        if (!userRes.ok) {
          router.push("/login");
          return;
        }

        const userData = await userRes.json();
        setUser(userData.user);

        if (prefsRes.ok) {
          const prefsData = await prefsRes.json();
          if (prefsData.preferences) {
            setPreferences({
              favoriteCuisines: prefsData.preferences.favoriteCuisines || [],
              dietaryRestrictions: prefsData.preferences.dietaryRestrictions || [],
              cookingSkillLevel: prefsData.preferences.cookingSkillLevel || "",
              householdSize: prefsData.preferences.householdSize || null,
            });
          }
        }
      } catch (err) {
        console.error("Failed to load profile:", err);
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [router]);

  async function handleSavePreferences(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    try {
      const res = await fetch("/api/user/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(preferences),
      });

      if (res.ok) {
        setMessage("Preferences saved!");
        setTimeout(() => setMessage(""), 3000);
      } else {
        setMessage("Failed to save preferences");
      }
    } catch {
      setMessage("Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  function toggleCuisine(cuisine: string) {
    setPreferences((prev) => ({
      ...prev,
      favoriteCuisines: prev.favoriteCuisines.includes(cuisine)
        ? prev.favoriteCuisines.filter((c) => c !== cuisine)
        : [...prev.favoriteCuisines, cuisine],
    }));
  }

  function toggleDietary(restriction: string) {
    setPreferences((prev) => ({
      ...prev,
      dietaryRestrictions: prev.dietaryRestrictions.includes(restriction)
        ? prev.dietaryRestrictions.filter((r) => r !== restriction)
        : [...prev.dietaryRestrictions, restriction],
    }));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-3 border-terracotta/30 border-t-terracotta rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <h1 className="text-3xl font-bold text-stone-900">My Profile</h1>

      {/* User Info Card */}
      <div className="bg-white rounded-2xl shadow-md border border-stone-200 p-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-full bg-terracotta/10 flex items-center justify-center">
            <User className="w-8 h-8 text-terracotta" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-stone-800">{user.name}</h2>
            <div className="flex items-center gap-1.5 text-stone-500">
              <Mail className="w-4 h-4" />
              <span>{user.email}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Preferences Form */}
      <form onSubmit={handleSavePreferences} className="space-y-6">
        {/* Favorite Cuisines */}
        <div className="bg-white rounded-2xl shadow-md border border-stone-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Heart className="w-5 h-5 text-terracotta" />
            <h3 className="text-lg font-semibold text-stone-800">Favorite Cuisines</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {CUISINE_OPTIONS.map((cuisine) => (
              <button
                key={cuisine}
                type="button"
                onClick={() => toggleCuisine(cuisine)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  preferences.favoriteCuisines.includes(cuisine)
                    ? "bg-terracotta text-white"
                    : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                }`}
              >
                {cuisine}
              </button>
            ))}
          </div>
        </div>

        {/* Dietary Restrictions */}
        <div className="bg-white rounded-2xl shadow-md border border-stone-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="w-5 h-5 text-terracotta" />
            <h3 className="text-lg font-semibold text-stone-800">Dietary Restrictions</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {DIETARY_OPTIONS.map((restriction) => (
              <button
                key={restriction}
                type="button"
                onClick={() => toggleDietary(restriction)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  preferences.dietaryRestrictions.includes(restriction)
                    ? "bg-amber-500 text-white"
                    : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                }`}
              >
                {restriction}
              </button>
            ))}
          </div>
        </div>

        {/* Cooking Skill & Household */}
        <div className="bg-white rounded-2xl shadow-md border border-stone-200 p-6 space-y-5">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <ChefHat className="w-5 h-5 text-terracotta" />
              <label className="text-lg font-semibold text-stone-800">Cooking Skill Level</label>
            </div>
            <div className="flex gap-3">
              {(["beginner", "intermediate", "advanced"] as const).map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() =>
                    setPreferences((prev) => ({ ...prev, cookingSkillLevel: level }))
                  }
                  className={`flex-1 py-3 px-4 rounded-xl text-sm font-medium capitalize transition-all ${
                    preferences.cookingSkillLevel === level
                      ? "bg-terracotta text-white"
                      : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-5 h-5 text-terracotta" />
              <label htmlFor="householdSize" className="text-lg font-semibold text-stone-800">
                Household Size
              </label>
            </div>
            <input
              id="householdSize"
              type="number"
              min={1}
              max={20}
              value={preferences.householdSize || ""}
              onChange={(e) =>
                setPreferences((prev) => ({
                  ...prev,
                  householdSize: e.target.value ? parseInt(e.target.value) : null,
                }))
              }
              className="w-full px-4 py-3 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-terracotta/50 focus:border-terracotta transition-colors text-stone-800"
              placeholder="Number of people in your household"
            />
          </div>
        </div>

        {/* Save & Message */}
        {message && (
          <div
            className={`px-4 py-3 rounded-xl text-center font-medium ${
              message.includes("saved") ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"
            }`}
          >
            {message}
          </div>
        )}

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 bg-terracotta text-white py-3 px-4 rounded-xl font-semibold text-lg hover:bg-terracotta-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Save className="w-5 h-5" />
                Save Preferences
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="bg-stone-100 text-stone-600 py-3 px-6 rounded-xl font-semibold hover:bg-stone-200 transition-colors flex items-center gap-2"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </form>
    </div>
  );
}
