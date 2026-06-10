"use client";

import { type ReactNode } from "react";
import { Link2Icon } from "@radix-ui/react-icons";
import { ClipboardPaste, Mic2, PencilLine, Sparkles } from "lucide-react";

interface SidebarToolbarProps {
  onCreateOpen: () => void;
  onPasteText?: () => void;
  onImportUrl?: () => void;
  onCaptureConversation?: () => void;
  onAiDraft?: () => void;
}

const actionClass =
  "flex w-full items-start gap-3 rounded-xl border border-[#ebe5dc] bg-white px-3 py-2.5 text-left transition hover:border-[#800020]/25 hover:bg-[#800020]/5 disabled:cursor-not-allowed disabled:opacity-50";

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
  onPasteText,
  onImportUrl,
  onCaptureConversation,
  onAiDraft,
}: SidebarToolbarProps) {
  return (
    <section className="rounded-2xl border border-[#800020]/10 bg-[#fffdfb]/85 p-3.5 shadow-sm">
      <div className="px-1">
        <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-[#800020]">
          Create recipe
        </h2>
        <p className="mt-1 text-xs leading-4 text-stone-500">
          Pick the source. Each route starts in one tap.
        </p>
      </div>

      <div className="mt-3 grid gap-2.5">
        <GroupLabel>Capture from real life</GroupLabel>
        <button type="button" className={actionClass} onClick={onCaptureConversation} disabled={!onCaptureConversation}>
          <ActionIcon><Mic2 className="h-4 w-4" /></ActionIcon>
          <span>
            <span className="block text-sm font-semibold text-stone-900">Live conversation</span>
            <span className="mt-0.5 block text-xs leading-4 text-stone-500">Record, translate the gist, and get questions to ask while family narrates.</span>
          </span>
        </button>

        <GroupLabel>Import existing recipe</GroupLabel>
        <button type="button" className={actionClass} onClick={onImportUrl} disabled={!onImportUrl}>
          <ActionIcon><Link2Icon className="h-4 w-4" /></ActionIcon>
          <span>
            <span className="block text-sm font-semibold text-stone-900">Import URL or video</span>
            <span className="mt-0.5 block text-xs leading-4 text-stone-500">Paste a recipe page, blog post, or video link.</span>
          </span>
        </button>

        <button type="button" className={actionClass} onClick={onPasteText} disabled={!onPasteText}>
          <ActionIcon><ClipboardPaste className="h-4 w-4" /></ActionIcon>
          <span>
            <span className="block text-sm font-semibold text-stone-900">Paste recipe text</span>
            <span className="mt-0.5 block text-xs leading-4 text-stone-500">Drop in plain text, OCR text, or message notes.</span>
          </span>
        </button>

        <GroupLabel>Start from scratch</GroupLabel>
        <button type="button" className={actionClass} onClick={onAiDraft} disabled={!onAiDraft}>
          <ActionIcon><Sparkles className="h-4 w-4" /></ActionIcon>
          <span>
            <span className="block text-sm font-semibold text-stone-900">Ask Mychelin</span>
            <span className="mt-0.5 block text-xs leading-4 text-stone-500">Describe what you want to cook and save an editable first draft.</span>
          </span>
        </button>

        <button type="button" className={actionClass} onClick={onCreateOpen}>
          <ActionIcon><PencilLine className="h-4 w-4" /></ActionIcon>
          <span>
            <span className="block text-sm font-semibold text-stone-900">Manual recipe</span>
            <span className="mt-0.5 block text-xs leading-4 text-stone-500">Fill in the blanks yourself.</span>
          </span>
        </button>
      </div>
    </section>
  );
}
