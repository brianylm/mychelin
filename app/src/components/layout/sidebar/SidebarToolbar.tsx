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
  "group flex min-h-[3.75rem] w-full items-start gap-3 rounded-xl border border-[#ebe5dc] bg-white px-3 py-2.5 text-left transition-colors hover:border-[#800020]/25 hover:bg-[#800020]/5 focus-visible:border-[#800020]/40 disabled:cursor-not-allowed disabled:opacity-50";

function ActionIcon({ children }: { children: ReactNode }) {
  return (
    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#800020]/10 text-[#800020]">
      {children}
    </span>
  );
}

function GroupLabel({ children }: { children: ReactNode }) {
  return (
    <div className="px-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-stone-400 first:pt-0">
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
    <section className="rounded-2xl border border-[#800020]/10 bg-[#fffdfb]/85 p-3.5 shadow-sm">
      <button
        type="button"
        onClick={() => setIsOpen((value) => !value)}
        aria-expanded={isOpen}
        className="flex min-h-11 w-full items-start justify-between gap-3 rounded-xl px-1 py-0.5 text-left"
      >
        <span className="min-w-0">
          <span className="block text-xs font-semibold uppercase tracking-[0.2em] text-[#800020]">
            Create recipe
          </span>
          <span className="mt-1 block text-xs leading-4 text-stone-500">
            Record, import, write, or ask for a draft.
          </span>
        </span>
        <ChevronDown
          className={
            "mt-1 h-4 w-4 shrink-0 text-[#800020] transition-transform duration-200 " +
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
              <span className="block text-sm font-semibold text-stone-900">
                Live conversation
              </span>
              <span className="mt-0.5 block text-xs leading-4 text-stone-500">
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
              <span className="block text-sm font-semibold text-stone-900">
                Import from link
              </span>
              <span className="mt-0.5 block text-xs leading-4 text-stone-500">
                Paste a recipe page, blog post, or video URL. Switch to Text inside if needed.
              </span>
            </span>
          </button>

          <button type="button" className={actionClass} onClick={openWriteOrPaste}>
            <ActionIcon>
              <PencilLine className="h-4 w-4" aria-hidden="true" />
            </ActionIcon>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-stone-900">
                Write or paste recipe
              </span>
              <span className="mt-0.5 block text-xs leading-4 text-stone-500">
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
              <span className="block text-sm font-semibold text-stone-900">
                Ask Mychelin
              </span>
              <span className="mt-0.5 block text-xs leading-4 text-stone-500">
                Describe what you want to cook and save an editable first draft.
              </span>
            </span>
          </button>
        </div>
      )}
    </section>
  );
}
