"use client";

import { useState, useEffect, useCallback } from "react";
import { Check, Copy, Unlink, X } from "lucide-react";

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
      className="fixed inset-0 z-50 overflow-y-auto bg-ui-scrim"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="flex min-h-full items-start justify-center p-4 pb-48 md:items-center md:pb-4">
        <div className="w-full max-w-md rounded-2xl bg-ui-surface-raised p-6 shadow-ui-overlay">
          {/* Header */}
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-ui-text">Share</h2>
              <p className="text-xs text-ui-muted truncate">{resourceName}</p>
            </div>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-ui-muted hover:bg-ui-surface-subtle hover:text-ui-muted"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-ui-accent border-t-transparent" />
            </div>
          ) : (
            <div className="space-y-4">
              {/* View-only link */}
              <div className="rounded-2xl border border-ui-border bg-ui-surface-raised p-4">
                <div className="mb-2 flex items-center justify-between">
                  <div>
                    <span className="text-sm font-semibold text-ui-text">👁 View only</span>
                    <p className="text-xs text-ui-muted">Can view but not edit</p>
                  </div>
                </div>
                {viewLink ? (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 truncate rounded-lg bg-ui-surface-subtle px-3 py-2 text-xs text-ui-muted font-mono">
                      {window.location.origin}/shared/{viewLink.token}
                    </div>
                    <button
                      onClick={() => copyLink(viewLink.token)}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-ui-accent-muted text-ui-accent transition-colors hover:bg-ui-accent-muted"
                      title="Copy link"
                    >
                      {copiedToken === viewLink.token ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      onClick={() => deleteLink(viewLink.id)}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-ui-muted transition-colors hover:bg-ui-danger-soft hover:text-ui-danger"
                      title="Remove link"
                    >
                      <Unlink className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => createLink("view")}
                    className="w-full rounded-lg border border-dashed border-ui-border-strong px-4 py-2.5 text-sm font-medium text-ui-muted transition-colors hover:border-ui-border-strong hover:bg-ui-accent-muted hover:text-ui-accent"
                  >
                    Create view-only link
                  </button>
                )}
              </div>

              {/* Collaborator link */}
              <div className="rounded-2xl border border-ui-border bg-ui-surface-raised p-4">
                <div className="mb-2 flex items-center justify-between">
                  <div>
                    <span className="text-sm font-semibold text-ui-text">✏️ Collaborator</span>
                    <p className="text-xs text-ui-muted">Can view and edit</p>
                  </div>
                </div>
                {editLink ? (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 truncate rounded-lg bg-ui-surface-subtle px-3 py-2 text-xs text-ui-muted font-mono">
                      {window.location.origin}/shared/{editLink.token}
                    </div>
                    <button
                      onClick={() => copyLink(editLink.token)}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-ui-accent-muted text-ui-accent transition-colors hover:bg-ui-accent-muted"
                      title="Copy link"
                    >
                      {copiedToken === editLink.token ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      onClick={() => deleteLink(editLink.id)}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-ui-muted transition-colors hover:bg-ui-danger-soft hover:text-ui-danger"
                      title="Remove link"
                    >
                      <Unlink className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => createLink("edit")}
                    className="w-full rounded-lg border border-dashed border-ui-border-strong px-4 py-2.5 text-sm font-medium text-ui-muted transition-colors hover:border-ui-border-strong hover:bg-ui-accent-muted hover:text-ui-accent"
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
