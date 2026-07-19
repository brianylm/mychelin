"use client";

import { useState, useEffect, useCallback } from "react";
import { Cross2Icon, CopyIcon, LinkBreak2Icon, CheckIcon } from "@radix-ui/react-icons";

interface ShareLink {
  id: number;
  token: string;
  permission: string;
  createdAt: string;
}

interface ShareModalProps {
  resourceType: "recipe" | "book";
  resourceId: number;
  resourceName: string;
  onClose: () => void;
}

export function ShareModal({ resourceType, resourceId, resourceName, onClose }: ShareModalProps) {
  const [links, setLinks] = useState<ShareLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const fetchLinks = useCallback(async () => {
    try {
      const res = await fetch(`/api/share?type=${resourceType}&id=${resourceId}`);
      if (res.ok) {
        const data = await res.json();
        setLinks(data);
      }
    } catch {} finally {
      setLoading(false);
    }
  }, [resourceType, resourceId]);

  useEffect(() => {
    fetchLinks();
  }, [fetchLinks]);

  const createLink = useCallback(async (permission: "view" | "edit") => {
    try {
      const res = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resourceType, resourceId, permission }),
      });
      if (res.ok) {
        fetchLinks();
      }
    } catch {}
  }, [resourceType, resourceId, fetchLinks]);

  const deleteLink = useCallback(async (id: number) => {
    try {
      await fetch("/api/share", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setLinks((prev) => prev.filter((l) => l.id !== id));
    } catch {}
  }, []);

  const copyLink = useCallback(
    (token: string) => {
      const url = `${window.location.origin}/shared/${token}`;
      // Attach a short blurb alongside the URL so whoever receives it in
      // a message app sees context, not just a naked URL. The noun
      // ("recipe" / "cookbook") follows the resource type.
      const noun = resourceType === "book" ? "cookbook" : "recipe";
      const blurb = `Come view my ${noun} "${resourceName}" on Mychelin — the heritage recipe app.\n\n${url}`;
      navigator.clipboard.writeText(blurb);
      setCopiedToken(token);
      setTimeout(() => setCopiedToken(null), 2000);
    },
    [resourceType, resourceName]
  );

  const viewLink = links.find((l) => l.permission === "view");
  const editLink = links.find((l) => l.permission === "edit");

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/55 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="flex min-h-full items-start justify-center p-4 pb-48 md:items-center md:pb-4">
        <div className="w-full max-w-md rounded-[2rem] border border-white/70 bg-[#fffdfb] p-6 shadow-[0_24px_80px_rgba(60,43,25,0.18)]">
          {/* Header */}
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-neutral-900">Share</h2>
              <p className="text-xs text-neutral-500 truncate">{resourceName}</p>
            </div>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
            >
              <Cross2Icon className="h-4 w-4" />
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#800020] border-t-transparent" />
            </div>
          ) : (
            <div className="space-y-4">
              {/* View-only link */}
              <div className="rounded-2xl border border-[#800020]/10 bg-white/70 p-4 shadow-[0_12px_32px_rgba(60,43,25,0.06)]">
                <div className="mb-2 flex items-center justify-between">
                  <div>
                    <span className="text-sm font-semibold text-neutral-800">👁 View only</span>
                    <p className="text-xs text-neutral-500">Can view but not edit</p>
                  </div>
                </div>
                {viewLink ? (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 truncate rounded-lg bg-neutral-100 px-3 py-2 text-xs text-neutral-600 font-mono">
                      {window.location.origin}/shared/{viewLink.token}
                    </div>
                    <button
                      onClick={() => copyLink(viewLink.token)}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#800020]/10 text-[#800020] transition-colors hover:bg-[#800020]/15"
                      title="Copy link"
                    >
                      {copiedToken === viewLink.token ? (
                        <CheckIcon className="h-4 w-4" />
                      ) : (
                        <CopyIcon className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      onClick={() => deleteLink(viewLink.id)}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-500"
                      title="Remove link"
                    >
                      <LinkBreak2Icon className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => createLink("view")}
                    className="w-full rounded-lg border border-dashed border-neutral-300 px-4 py-2.5 text-sm font-medium text-neutral-600 transition-colors hover:border-[#800020]/45 hover:bg-[#800020]/5 hover:text-[#800020]"
                  >
                    Create view-only link
                  </button>
                )}
              </div>

              {/* Collaborator link */}
              <div className="rounded-2xl border border-[#800020]/10 bg-white/70 p-4 shadow-[0_12px_32px_rgba(60,43,25,0.06)]">
                <div className="mb-2 flex items-center justify-between">
                  <div>
                    <span className="text-sm font-semibold text-neutral-800">✏️ Collaborator</span>
                    <p className="text-xs text-neutral-500">Can view and edit</p>
                  </div>
                </div>
                {editLink ? (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 truncate rounded-lg bg-neutral-100 px-3 py-2 text-xs text-neutral-600 font-mono">
                      {window.location.origin}/shared/{editLink.token}
                    </div>
                    <button
                      onClick={() => copyLink(editLink.token)}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#800020]/10 text-[#800020] transition-colors hover:bg-[#800020]/15"
                      title="Copy link"
                    >
                      {copiedToken === editLink.token ? (
                        <CheckIcon className="h-4 w-4" />
                      ) : (
                        <CopyIcon className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      onClick={() => deleteLink(editLink.id)}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-500"
                      title="Remove link"
                    >
                      <LinkBreak2Icon className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => createLink("edit")}
                    className="w-full rounded-lg border border-dashed border-neutral-300 px-4 py-2.5 text-sm font-medium text-neutral-600 transition-colors hover:border-[#800020]/45 hover:bg-[#800020]/5 hover:text-[#800020]"
                  >
                    Create collaborator link
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
