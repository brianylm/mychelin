"use client";

import { Button } from "@radix-ui/themes";
import { Link2Icon } from "@radix-ui/react-icons";
import { ClipboardPaste, PencilLine } from "lucide-react";

interface SidebarToolbarProps {
  onCreateOpen: () => void;
  onPasteText?: () => void;
  onImportUrl?: () => void;
}

export function SidebarToolbar({
  onCreateOpen,
  onPasteText,
  onImportUrl,
}: SidebarToolbarProps) {
  return (
    <div className="grid gap-2">
      <Button
        size="2"
        className="w-full rounded-full bg-[#17131f] text-white shadow-[0_8px_22px_rgba(23,19,31,0.16)] hover:bg-[#800020]"
        onClick={onImportUrl}
        disabled={!onImportUrl}
      >
        <Link2Icon className="mr-1 inline h-4 w-4" />
        Import URL
      </Button>
      <div className="grid grid-cols-2 gap-2">
        <Button size="2" variant="soft" className="rounded-full" onClick={onPasteText} disabled={!onPasteText}>
          <ClipboardPaste className="mr-1 inline h-4 w-4" />
          Paste
        </Button>
        <Button size="2" variant="soft" className="rounded-full" onClick={onCreateOpen}>
          <PencilLine className="mr-1 inline h-4 w-4" />
          Blank
        </Button>
      </div>
    </div>
  );
}
