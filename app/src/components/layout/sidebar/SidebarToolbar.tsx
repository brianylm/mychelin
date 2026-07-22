"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, Link2, Mic2, PencilLine, Sparkles } from "lucide-react";

interface SidebarToolbarProps {
  onCreateOpen: () => void;
  onWriteOrPaste?: () => void;
  onImportUrl?: () => void;
  onCaptureConversation?: () => void;
  onAiDraft?: () => void;
}

const actionClass =
  "group flex min-h-[3.75rem] w-full items-start gap-3 rounded-xl border border-ui-border bg-ui-surface-raised px-3 py-2.5 text-left transition-colors hover:border-ui-accent/25 hover:bg-ui-accent/5 focus-visible:border-ui-accent/40 disabled:cursor-not-allowed disabled:opacity-50";

function ActionIcon({ children }: { children: ReactNode }) {
  return (
    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ui-accent/10 text-ui-accent">
      {children}
    </span>
  );
}

function GroupLabel({ children }: { children: ReactNode }) {
  return (
    <div className="px-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-ui-muted first:pt-0">
      {children}
    </div>
  );
}

export function SidebarToolbar({
  onCreateOpen,
  onWriteOrPaste,
  onImportUrl,
  onCaptureConversation,
  onAiDraft,
}: SidebarToolbarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const openWriteOrPaste = onWriteOrPaste ?? onCreateOpen;

  return (
    <section className="rounded-2xl border border-ui-accent/10 bg-ui-surface/85 p-3.5 shadow-sm">
      <button
        type="button"
        onClick={() => setIsOpen((value) => !value)}
        aria-expanded={isOpen}
        className="flex min-h-11 w-full items-start justify-between gap-3 rounded-xl px-1 py-0.5 text-left"
      >
        <span className="min-w-0">
          <span className="block text-xs font-semibold uppercase tracking-[0.2em] text-ui-accent">
            Create recipe
          </span>
          <span className="mt-1 block text-xs leading-4 text-ui-muted">
            Record, import, write, or ask for a draft.
          </span>
        </span>
        <ChevronDown
          className={
            "mt-1 h-4 w-4 shrink-0 text-ui-accent transition-transform duration-200 " +
            (isOpen ? "rotate-180" : "")
          }
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <div className="mt-3 grid gap-2.5">
          <GroupLabel>Capture from real life</GroupLabel>
          <button
            type="button"
            className={actionClass}
            onClick={onCaptureConversation}
            disabled={!onCaptureConversation}
          >
            <ActionIcon>
              <Mic2 className="h-4 w-4" aria-hidden="true" />
            </ActionIcon>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-ui-text">
                Live conversation
              </span>
              <span className="mt-0.5 block text-xs leading-4 text-ui-muted">
                Record, translate the gist, and get questions to ask while family narrates.
              </span>
            </span>
          </button>

          <GroupLabel>Bring in a recipe</GroupLabel>
          <button
            type="button"
            className={actionClass}
            onClick={onImportUrl}
            disabled={!onImportUrl}
          >
            <ActionIcon>
              <Link2 className="h-4 w-4" aria-hidden="true" />
            </ActionIcon>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-ui-text">
                Import from link
              </span>
              <span className="mt-0.5 block text-xs leading-4 text-ui-muted">
                Paste a recipe page, blog post, or video URL. Switch to Text inside if needed.
              </span>
            </span>
          </button>

          <button type="button" className={actionClass} onClick={openWriteOrPaste}>
            <ActionIcon>
              <PencilLine className="h-4 w-4" aria-hidden="true" />
            </ActionIcon>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-ui-text">
                Write or paste recipe
              </span>
              <span className="mt-0.5 block text-xs leading-4 text-ui-muted">
                Type naturally, paste OCR text, WhatsApp notes, or a rough memory dump.
              </span>
            </span>
          </button>

          <GroupLabel>Draft with AI</GroupLabel>
          <button
            type="button"
            className={actionClass}
            onClick={onAiDraft}
            disabled={!onAiDraft}
          >
            <ActionIcon>
              <Sparkles className="h-4 w-4" aria-hidden="true" />
            </ActionIcon>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-ui-text">
                Ask Mychelin
              </span>
              <span className="mt-0.5 block text-xs leading-4 text-ui-muted">
                Describe what you want to cook and save an editable first draft.
              </span>
            </span>
          </button>
        </div>
      )}
    </section>
  );
}
