"use client";

import { useState } from "react";
import { useToast } from "@/context/ToastContext";

interface InviteMemberModalProps {
  bookId: number;
  bookTitle: string;
  onClose: () => void;
  onMemberAdded: (member: {
    id: number;
    name: string;
    email: string;
    role: "owner" | "editor" | "viewer";
    joinedAt: string;
  }) => void;
}

const ROLES = [
  { id: "editor", label: "Editor", description: "Can add/remove recipes and edit book details" },
  { id: "viewer", label: "Viewer", description: "Can only view recipes and book contents" },
];

export function InviteMemberModal({ bookId, bookTitle, onClose, onMemberAdded }: InviteMemberModalProps) {
  const { addToast } = useToast();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"owner" | "editor" | "viewer">("viewer");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || submitting) return;

    setSubmitting(true);

    try {
      const response = await fetch(`/api/books/${bookId}/members`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          role,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to invite member");
      }

      const memberData = await response.json();
      onMemberAdded({
        id: memberData.user.id,
        name: memberData.user.name,
        email: memberData.user.email,
        role: memberData.role,
        joinedAt: memberData.joinedAt,
      });

      addToast(`Invited ${memberData.user.name} to ${bookTitle}!`, "success");
      onClose();
    } catch (error: any) {
      console.error("Error inviting member:", error);
      
      let errorMessage = "Failed to invite member";
      if (error.message === "User not found") {
        errorMessage = "No user found with that email address";
      } else if (error.message === "User is already a member of this book") {
        errorMessage = "This user is already a member of this book";
      }
      
      addToast(errorMessage, "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-neutral-900">Invite Member</h2>
            <p className="text-sm text-neutral-600">Add a collaborator to "{bookTitle}"</p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email Input */}
          <div>
            <label className="block text-xs font-medium uppercase tracking-wide text-neutral-500 mb-2">
              Email Address *
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              className="w-full rounded-xl border border-neutral-300 bg-neutral-50 px-4 py-3 text-neutral-900 placeholder-neutral-500 transition-colors focus:border-amber-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-100"
              required
            />
            <p className="mt-1 text-xs text-neutral-500">
              User must have a Mychelin account with this email
            </p>
          </div>

          {/* Role Selection */}
          <div>
            <label className="block text-xs font-medium uppercase tracking-wide text-neutral-500 mb-2">
              Role *
            </label>
            <div className="space-y-2">
              {ROLES.map((roleOption) => (
                <label
                  key={roleOption.id}
                  className="flex cursor-pointer items-start gap-3 rounded-lg border-2 border-transparent p-3 transition-all hover:bg-neutral-50"
                >
                  <input
                    type="radio"
                    name="role"
                    value={roleOption.id}
                    checked={role === roleOption.id}
                    onChange={(e) => setRole(e.target.value as "editor" | "viewer")}
                    className="mt-0.5 h-4 w-4 border-neutral-300 text-amber-600 focus:ring-amber-500"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-neutral-900">{roleOption.label}</div>
                    <div className="text-sm text-neutral-600">{roleOption.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-neutral-300 bg-white px-4 py-3 font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!email.trim() || submitting}
              className="flex-1 rounded-xl bg-amber-600 px-4 py-3 font-medium text-white transition-colors hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "Inviting..." : "Send Invitation"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}