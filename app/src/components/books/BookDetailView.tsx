"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/context/ToastContext";
import { useAuth } from "@/context/AuthContext";
import { RecipePickerModal } from "./RecipePickerModal";
import { InviteMemberModal } from "./InviteMemberModal";
import { CookingPrinciples } from "./CookingPrinciples";
import { RecipeForkButton } from "../recipes/RecipeForkButton";

interface BookDetail {
  id: number;
  title: string;
  description: string | null;
  coverEmoji: string;
  coverColor: string;
  createdBy: number;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  recipes: Array<{
    id: number;
    title: string;
    description: string | null;
    cuisine: string | null;
    imageUrl: string | null;
    prepTime: number | null;
    cookTime: number | null;
    yield: string | null;
    addedAt: string;
    addedBy: number;
    sortOrder: number;
    forkedFrom: string | null;
  }>;
  members: Array<{
    id: number;
    name: string;
    email: string;
    role: "owner" | "editor" | "viewer";
    joinedAt: string;
  }>;
  activityLog: Array<{
    id: number;
    action: string;
    targetName: string | null;
    createdAt: string;
    userName: string;
  }>;
  userRole: "owner" | "editor" | "viewer";
  isOwner: boolean;
}

interface BookDetailViewProps {
  book: { id: number; title: string; coverEmoji: string; coverColor: string };
  onBack: () => void;
  onBookUpdated: (updatedData: any) => void;
  onBookDeleted: () => void;
  onNavigateToRecipe?: (recipeId: number) => void;
}

type Tab = "recipes" | "members" | "activity" | "principles";

const COLORS = [
  { name: "amber", label: "Amber", class: "bg-[#800020]/10 border-[#800020]/15" },
  { name: "rose", label: "Rose", class: "bg-rose-100 border-rose-200" },
  { name: "emerald", label: "Emerald", class: "bg-emerald-100 border-emerald-200" },
  { name: "sky", label: "Sky", class: "bg-sky-100 border-sky-200" },
  { name: "violet", label: "Violet", class: "bg-violet-100 border-violet-200" },
  { name: "slate", label: "Slate", class: "bg-slate-100 border-slate-200" },
];

export function BookDetailView({ book, onBack, onBookUpdated, onBookDeleted, onNavigateToRecipe }: BookDetailViewProps) {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [bookDetail, setBookDetail] = useState<BookDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("recipes");
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({
    title: book.title,
    description: "",
    coverEmoji: book.coverEmoji,
    coverColor: book.coverColor,
  });
  const [showRecipePicker, setShowRecipePicker] = useState(false);
  const [showInviteMember, setShowInviteMember] = useState(false);
  const [tipCount, setTipCount] = useState<number | null>(null);

  const fetchBookDetail = async () => {
    try {
      const response = await fetch(`/api/books/${book.id}`);
      if (!response.ok) {
        throw new Error("Failed to fetch book details");
      }
      const data = await response.json();
      setBookDetail(data);
      setEditData({
        title: data.title,
        description: data.description || "",
        coverEmoji: data.coverEmoji,
        coverColor: data.coverColor,
      });
    } catch (error) {
      console.error("Error fetching book details:", error);
      addToast("Failed to load book details", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookDetail();
    // Fetch tip count for the Principles tab badge
    fetch(`/api/books/${book.id}/tips`)
      .then((res) => (res.ok ? res.json() : []))
      .then((tips: unknown[]) => setTipCount(tips.length))
      .catch(() => {});
  }, [book.id]);

  const handleUpdateBook = async () => {
    if (!bookDetail) return;

    try {
      const response = await fetch(`/api/books/${book.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(editData),
      });

      if (!response.ok) {
        throw new Error("Failed to update book");
      }

      const updatedBook = await response.json();
      setBookDetail({ ...bookDetail, ...updatedBook });
      onBookUpdated(updatedBook);
      setEditMode(false);
      addToast("Book updated successfully!", "success");
    } catch (error) {
      console.error("Error updating book:", error);
      addToast("Failed to update book", "error");
    }
  };

  const handleDeleteBook = async () => {
    if (!bookDetail?.isOwner || !confirm("Are you sure you want to delete this book? This cannot be undone.")) {
      return;
    }

    try {
      const response = await fetch(`/api/books/${book.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete book");
      }

      onBookDeleted();
    } catch (error) {
      console.error("Error deleting book:", error);
      addToast("Failed to delete book", "error");
    }
  };

  const handleRemoveRecipe = async (recipeId: number, recipeTitle: string) => {
    if (!bookDetail || !confirm(`Remove "${recipeTitle}" from this book?`)) return;

    try {
      const response = await fetch(`/api/books/${book.id}/recipes`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ recipeId }),
      });

      if (!response.ok) {
        throw new Error("Failed to remove recipe");
      }

      // Update local state
      setBookDetail({
        ...bookDetail,
        recipes: bookDetail.recipes.filter(r => r.id !== recipeId)
      });

      addToast("Recipe removed from book", "success");
    } catch (error) {
      console.error("Error removing recipe:", error);
      addToast("Failed to remove recipe", "error");
    }
  };

  const handleRemoveMember = async (userId: number, userName: string) => {
    if (!bookDetail?.isOwner || !confirm(`Remove ${userName} from this book?`)) return;

    try {
      const response = await fetch(`/api/books/${book.id}/members`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        throw new Error("Failed to remove member");
      }

      // Update local state
      setBookDetail({
        ...bookDetail,
        members: bookDetail.members.filter(m => m.id !== userId)
      });

      addToast(`${userName} removed from book`, "success");
    } catch (error) {
      console.error("Error removing member:", error);
      addToast("Failed to remove member", "error");
    }
  };

  const handleRecipeAdded = (recipe: any) => {
    if (!bookDetail) return;
    
    setBookDetail({
      ...bookDetail,
      recipes: [
        ...bookDetail.recipes,
        {
          ...recipe,
          addedAt: new Date().toISOString(),
          addedBy: user?.id || 0,
          sortOrder: bookDetail.recipes.length,
        }
      ]
    });
  };

  const handleMemberAdded = (member: any) => {
    if (!bookDetail) return;
    
    setBookDetail({
      ...bookDetail,
      members: [...bookDetail.members, member]
    });
  };

  const handleRecipeClick = (recipeId: number) => {
    if (onNavigateToRecipe) {
      onNavigateToRecipe(recipeId);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatActivityAction = (action: string, targetName: string | null) => {
    switch (action) {
      case "created_book":
        return "created this book";
      case "added_recipe":
        return `added "${targetName}"`;
      case "removed_recipe":
        return `removed "${targetName}"`;
      case "invited_member":
        return `invited ${targetName}`;
      case "removed_member":
        return `removed ${targetName}`;
      case "updated_book":
        return "updated the book";
      case "joined_book":
        return "joined the book";
      default:
        return action;
    }
  };

  const getColorClass = (color: string) => {
    const colorMap: Record<string, string> = {
      amber: "bg-[#800020]/10",
      rose: "bg-rose-100",
      emerald: "bg-emerald-100",
      sky: "bg-sky-100",
      violet: "bg-violet-100",
      slate: "bg-slate-100",
    };
    return colorMap[color] || "bg-[#800020]/10";
  };

  if (loading && !bookDetail) {
    // Show book header immediately from props, skeleton for content
    return (
      <div className="min-h-screen bg-neutral-50 pb-20 md:pb-4">
        <div className="mx-auto max-w-4xl p-4">
          <div className="mb-6 flex items-center gap-4">
            <button
              onClick={onBack}
              className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-neutral-600 shadow-sm hover:bg-neutral-50"
            >
              ←
            </button>
            <div className="flex items-center gap-4 flex-1">
              <div className={`flex h-16 w-16 items-center justify-center rounded-xl text-2xl ${getColorClass(book.coverColor)}`}>
                {book.coverEmoji}
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-neutral-900">{book.title}</h1>
                <div className="mt-2 h-4 w-32 animate-pulse rounded bg-neutral-200"></div>
              </div>
            </div>
          </div>
          <div className="mb-6 flex rounded-lg bg-neutral-100 p-1">
            {["Recipes", "Principles", "Members", "Activity"].map((tab) => (
              <div key={tab} className="flex-1 rounded-md px-4 py-2 text-sm font-medium text-neutral-400 text-center">
                {tab}
              </div>
            ))}
          </div>
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="flex flex-col items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#800020] border-t-transparent"></div>
              <p className="mt-3 text-sm text-neutral-400">Loading recipes…</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!bookDetail) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-neutral-600">Book not found</p>
          <button
            onClick={onBack}
            className="mt-4 rounded-xl bg-[#17131f] px-4 py-2 text-white"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const canEdit = bookDetail.userRole === "owner" || bookDetail.userRole === "editor";

  return (
    <div className="min-h-screen bg-neutral-50 pb-20 md:pb-4">
      <div className="mx-auto max-w-4xl p-4">
        {/* Header */}
        <div className="mb-6 flex items-center gap-4">
          <button
            onClick={onBack}
            className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-neutral-600 shadow-sm hover:bg-neutral-50"
          >
            ←
          </button>
          
          <div className="flex-1">
            {editMode ? (
              <div className="flex items-center gap-4">
                <div
                  className={`flex h-16 w-16 items-center justify-center rounded-xl text-2xl ${getColorClass(editData.coverColor)}`}
                >
                  {editData.coverEmoji}
                </div>
                <div className="flex-1">
                  <input
                    type="text"
                    value={editData.title}
                    onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                    className="mb-2 w-full rounded-lg border border-neutral-300 px-3 py-2 text-xl font-bold"
                  />
                  <textarea
                    value={editData.description}
                    onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                    placeholder="Add a description..."
                    rows={2}
                    className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm resize-none"
                  />
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <div
                  className={`flex h-16 w-16 items-center justify-center rounded-xl text-2xl ${getColorClass(bookDetail.coverColor)}`}
                >
                  {bookDetail.coverEmoji}
                </div>
                <div className="flex-1">
                  <h1 className="text-2xl font-bold text-neutral-900">{bookDetail.title}</h1>
                  {bookDetail.description && (
                    <p className="text-neutral-600">{bookDetail.description}</p>
                  )}
                  <div className="mt-1 flex items-center gap-4 text-sm text-neutral-500">
                    <span>{bookDetail.recipes.length} recipes</span>
                    <span>{bookDetail.members.length} members</span>
                    <span>Created {formatDate(bookDetail.createdAt)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            {editMode ? (
              <>
                <button
                  onClick={() => setEditMode(false)}
                  className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateBook}
                  className="rounded-lg bg-[#17131f] px-4 py-2 text-sm font-medium text-white"
                >
                  Save
                </button>
              </>
            ) : (
              <>
                {canEdit && (
                  <button
                    onClick={() => setEditMode(true)}
                    className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700"
                  >
                    Edit
                  </button>
                )}
                {bookDetail.isOwner && (
                  <button
                    onClick={handleDeleteBook}
                    className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700"
                  >
                    Delete
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex rounded-lg bg-neutral-100 p-1">
          {[
            { id: "recipes" as const, label: "Recipes", count: bookDetail.recipes.length },
            { id: "principles" as const, label: "Principles", count: tipCount },
            { id: "members" as const, label: "Members", count: bookDetail.members.length },
            { id: "activity" as const, label: "Activity", count: bookDetail.activityLog.length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? "bg-white text-[#800020] shadow-sm"
                  : "text-neutral-600 hover:text-neutral-900"
              }`}
            >
              {tab.label}{tab.count !== null ? ` (${tab.count})` : ""}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          {activeTab === "recipes" && (
            <div>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold">Recipes</h2>
                {canEdit && (
                  <button 
                    onClick={() => setShowRecipePicker(true)}
                    className="rounded-lg bg-[#17131f] px-4 py-2 text-sm font-medium text-white hover:bg-[#800020] transition-colors"
                  >
                    Add Recipe
                  </button>
                )}
              </div>
              {bookDetail.recipes.length === 0 ? (
                <div className="py-8 text-center">
                  <div className="mb-2 text-4xl">📝</div>
                  <p className="text-neutral-600">No recipes added yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {bookDetail.recipes.map((recipe) => (
                    <div
                      key={recipe.id}
                      className="group rounded-xl border border-neutral-200 p-4 hover:border-[#800020]/15 hover:shadow-sm transition-all"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3
                          className="font-medium text-neutral-900 cursor-pointer hover:text-[#800020] transition-colors flex-1"
                          onClick={() => handleRecipeClick(recipe.id)}
                        >
                          {recipe.title}
                        </h3>
                        <div className="flex items-center gap-1 ml-2">
                          {user && recipe.addedBy !== user.id && (
                            <RecipeForkButton
                              recipeId={recipe.id}
                              recipeTitle={recipe.title}
                              onForked={(id) => onNavigateToRecipe?.(id)}
                              variant="compact"
                            />
                          )}
                          {canEdit && (
                            <button
                              onClick={() => handleRemoveRecipe(recipe.id, recipe.title)}
                              className="opacity-0 group-hover:opacity-100 text-red-600 hover:text-red-700 text-sm transition-opacity"
                              title="Remove from book"
                            >
                              ×
                            </button>
                          )}
                        </div>
                      </div>
                      {recipe.forkedFrom && (
                        <div className="mb-2 flex items-center gap-1 text-xs text-[#800020]">
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="18" r="3"/>
                            <circle cx="6" cy="6" r="3"/>
                            <circle cx="18" cy="6" r="3"/>
                            <path d="M18 9v2a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V9"/>
                            <line x1="12" y1="12" x2="12" y2="15"/>
                          </svg>
                          <span>Forked</span>
                        </div>
                      )}
                      {recipe.description && (
                        <p className="mt-1 text-sm text-neutral-600 line-clamp-2">
                          {recipe.description}
                        </p>
                      )}
                      <div className="mt-2 flex items-center gap-2 text-xs text-neutral-500">
                        {recipe.cuisine && <span>{recipe.cuisine}</span>}
                        {recipe.prepTime && <span>{recipe.prepTime}min prep</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "members" && (
            <div>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold">Members</h2>
                {bookDetail.isOwner && (
                  <button 
                    onClick={() => setShowInviteMember(true)}
                    className="rounded-lg bg-[#17131f] px-4 py-2 text-sm font-medium text-white hover:bg-[#800020] transition-colors"
                  >
                    Invite Member
                  </button>
                )}
              </div>
              <div className="space-y-3">
                {bookDetail.members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between rounded-lg border border-neutral-200 p-4"
                  >
                    <div>
                      <div className="font-medium text-neutral-900">{member.name}</div>
                      <div className="text-sm text-neutral-600">{member.email}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          member.role === "owner"
                            ? "bg-[#800020]/5 text-[#800020]"
                            : member.role === "editor"
                            ? "bg-blue-50 text-blue-700"
                            : "bg-gray-50 text-gray-700"
                        }`}
                      >
                        {member.role}
                      </span>
                      {bookDetail.isOwner && member.role !== "owner" && member.id !== user?.id && (
                        <button 
                          onClick={() => handleRemoveMember(member.id, member.name)}
                          className="text-sm text-red-600 hover:text-red-700 transition-colors"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "principles" && (
            <CookingPrinciples
              bookId={book.id}
              canEdit={canEdit}
              isOwner={bookDetail.isOwner}
              onTipCountChange={setTipCount}
            />
          )}

          {activeTab === "activity" && (
            <div>
              <h2 className="mb-4 text-lg font-semibold">Recent Activity</h2>
              {bookDetail.activityLog.length === 0 ? (
                <div className="py-8 text-center">
                  <div className="mb-2 text-4xl">📋</div>
                  <p className="text-neutral-600">No activity yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {bookDetail.activityLog.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-start gap-3 rounded-lg border border-neutral-200 p-4"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-xs font-medium">
                        {activity.userName.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 text-sm">
                        <span className="font-medium text-neutral-900">{activity.userName}</span>{" "}
                        <span className="text-neutral-600">
                          {formatActivityAction(activity.action, activity.targetName)}
                        </span>
                        <div className="mt-1 text-xs text-neutral-500">
                          {formatDate(activity.createdAt)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Recipe Picker Modal */}
      {showRecipePicker && bookDetail && (
        <RecipePickerModal
          bookId={book.id}
          bookTitle={bookDetail.title}
          excludeRecipeIds={bookDetail.recipes.map(r => r.id)}
          onClose={() => setShowRecipePicker(false)}
          onRecipeAdded={handleRecipeAdded}
        />
      )}

      {/* Invite Member Modal */}
      {showInviteMember && bookDetail && (
        <InviteMemberModal
          bookId={book.id}
          bookTitle={bookDetail.title}
          onClose={() => setShowInviteMember(false)}
          onMemberAdded={handleMemberAdded}
        />
      )}
    </div>
  );
}