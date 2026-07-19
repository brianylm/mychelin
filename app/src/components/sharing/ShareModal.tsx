"use client";

import { useState, useEffect, useCallback } from "react";
import { Check, Copy, Eye, Link2Off, PencilLine, X } from "lucide-react";

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
      className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/45"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="flex min-h-full items-start justify-center p-4 pb-48 md:items-center md:pb-4">
        <div className="w-full max-w-md rounded-lg border border-[var(--ui-border-strong)] bg-[var(--ui-surface-raised)] p-5 shadow-xl" role="dialog" aria-modal="true" aria-labelledby="share-modal-title">
          {/* Header */}
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 id="share-modal-title" className="text-lg font-semibold text-[var(--ui-text)]">Share</h2>
              <p className="text-xs text-neutral-500 truncate">{resourceName}</p>
            </div>
            <button
              onClick={onClose}
              className="flex h-11 w-11 items-center justify-center rounded-lg text-[var(--ui-muted)] transition-colors hover:bg-[var(--ui-surface-subtle)] hover:text-[var(--ui-text)]"
              aria-label="Close share dialog"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#800020] border-t-transparent" />
            </div>
          ) : (
            <div className="divide-y divide-[var(--ui-border)] border-y border-[var(--ui-border)]">
              {/* View-only link */}
              <section className="py-4">
                <div className="mb-2 flex items-center justify-between">
                  <div>
                    <span className="flex items-center gap-2 text-sm font-semibold text-[var(--ui-text)]"><Eye className="h-4 w-4 text-[var(--ui-accent)]" aria-hidden="true" /> View only</span>
                    <p className="text-xs text-neutral-500">Can view but not edit</p>
                  </div>
                </div>
                {viewLink ? (
                  <div className="flex items-center gap-2">
                    <div className="flex min-h-11 min-w-0 flex-1 items-center truncate rounded-lg bg-[var(--ui-surface-subtle)] px-3 text-xs text-[var(--ui-muted)] font-mono">
                      {window.location.origin}/shared/{viewLink.token}
                    </div>
                    <button
                      onClick={() => copyLink(viewLink.token)}
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[var(--ui-accent-muted)] text-[var(--ui-accent)] transition-colors hover:bg-[var(--ui-accent)]/15"
                      aria-label="Copy link"
                    >
                      {copiedToken === viewLink.token ? (
                        <Check className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        <Copy className="h-4 w-4" aria-hidden="true" />
                      )}
                    </button>
                    <button
                      onClick={() => deleteLink(viewLink.id)}
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-[var(--ui-muted)] transition-colors hover:bg-red-50 hover:text-red-600"
                      aria-label="Remove link"
                    >
                      <Link2Off className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => createLink("view")}
                    className="h-11 w-full rounded-lg border border-dashed border-[var(--ui-border-strong)] px-4 text-sm font-semibold text-[var(--ui-muted)] transition-colors hover:border-[var(--ui-accent)]/45 hover:bg-[var(--ui-accent-muted)] hover:text-[var(--ui-accent)]"
                  >
                    Create view-only link
                  </button>
                )}
              </section>

              {/* Collaborator link */}
              <section className="py-4">
                <div className="mb-2 flex items-center justify-between">
                  <div>
                    <span className="flex items-center gap-2 text-sm font-semibold text-[var(--ui-text)]"><PencilLine className="h-4 w-4 text-[var(--ui-accent)]" aria-hidden="true" /> Collaborator</span>
                    <p className="text-xs text-neutral-500">Can view and edit</p>
                  </div>
                </div>
                {editLink ? (
                  <div className="flex items-center gap-2">
                    <div className="flex min-h-11 min-w-0 flex-1 items-center truncate rounded-lg bg-[var(--ui-surface-subtle)] px-3 text-xs text-[var(--ui-muted)] font-mono">
                      {window.location.origin}/shared/{editLink.token}
                    </div>
                    <button
                      onClick={() => copyLink(editLink.token)}
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[var(--ui-accent-muted)] text-[var(--ui-accent)] transition-colors hover:bg-[var(--ui-accent)]/15"
                      aria-label="Copy link"
                    >
                      {copiedToken === editLink.token ? (
                        <Check className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        <Copy className="h-4 w-4" aria-hidden="true" />
                      )}
                    </button>
                    <button
                      onClick={() => deleteLink(editLink.id)}
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-[var(--ui-muted)] transition-colors hover:bg-red-50 hover:text-red-600"
                      aria-label="Remove link"
                    >
                      <Link2Off className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => createLink("edit")}
                    className="h-11 w-full rounded-lg border border-dashed border-[var(--ui-border-strong)] px-4 text-sm font-semibold text-[var(--ui-muted)] transition-colors hover:border-[var(--ui-accent)]/45 hover:bg-[var(--ui-accent-muted)] hover:text-[var(--ui-accent)]"
                  >
                    Create collaborator link
                  </button>
                )}
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
