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
  "group flex min-h-[3.75rem] w-full items-start gap-3 border-b border-ui-border px-1 py-3 text-left transition-[background-color,color] duration-200 last:border-b-0 hover:bg-ui-surface-subtle focus-visible:bg-ui-surface-subtle disabled:cursor-not-allowed disabled:opacity-50";

function ActionIcon({ children }: { children: ReactNode }) {
  return (
    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center text-ui-accent">
      {children}
    </span>
  );
}

function GroupLabel({ children }: { children: ReactNode }) {
  return (
    <div className="px-1 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-ui-muted first:pt-1">
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
    <section className="border-y border-ui-border py-3">
      <button
        type="button"
        onClick={() => setIsOpen((value) => !value)}
        aria-expanded={isOpen}
        className="flex min-h-11 w-full items-start justify-between gap-3 px-1 text-left"
      >
        <span className="min-w-0">
          <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-ui-accent">
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
        <div className="mt-2 border-t border-ui-border pt-1">
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
